"use client";

import { useEffect, useRef } from "react";
import {
  useAccount,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi, maxUint256, parseUnits, type Address } from "viem";

import { ERC20_ABI, MOCK_ERC20_ABI, PERMIT2_ABI } from "@/lib/abi";
import { PERMIT2_ADDRESS, SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import type { Token } from "@/lib/tokens";

/**
 * Per-token reads + writes for the Permit2 panel.
 *
 * V5 uses Permit2 AllowanceTransfer — settlement calls
 * `permit2.transferFrom(maker, taker, amount, token)` on fill, which draws
 * against an allowance the maker has registered INSIDE Permit2 for the DEX
 * contract. So a maker needs two separate approvals before any of their
 * signed orders are actually fillable:
 *
 *   Step 1 — `ERC20.approve(Permit2, MaxUint256)`
 *            wallet → Permit2 (one-time per token, like every Permit2 dapp)
 *   Step 2 — `Permit2.approve(token, ScentDexV5, MaxUint160, MaxUint48)`
 *            Permit2 → DEX (per-token-per-spender, what the DEX actually pulls)
 *
 * Until BOTH steps are done, takers see the order as unfillable and the
 * maker sees an "Approval needed" badge on their own row. Earlier builds did
 * step 1 only, so the badge never cleared no matter how many times the user
 * approved — that's the bug this hook fixes by chaining both writes behind
 * a single user click.
 *
 * Reads:
 *   - balance                  (wallet)
 *   - erc20Allowance           (wallet → Permit2)
 *   - permit2DexAllowance      (Permit2 → DEX, packed amount/expiration/nonce)
 *
 * Writes:
 *   - approve()                — runs step 1, then auto-fires step 2 once the
 *                                first tx confirms (single button, two prompts)
 *   - mintDefault()            — testnet faucet only
 *
 * Disabled cleanly when wallet not connected or token not deployed on the
 * connected chain.
 */

// Effectively-infinite Permit2 expiration (year 8921347 — well past any human
// concern). uint48 max = 2**48 - 1 = 281,474,976,710,655.
const PERMIT2_MAX_EXPIRATION = 281474976710655n;

// uint160 max — passed as the per-spender allowance ceiling.
const UINT160_MAX = (1n << 160n) - 1n;

export type ApproveStep = "idle" | "step1" | "step2" | "done";

export function useTokenStatus(token: Token) {
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const tokenAddress = token.addresses[chainId];
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  const queryEnabled = Boolean(isConnected && account && tokenAddress);

  const balance = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled: queryEnabled },
  });

  // Step 1 read: ERC20 → Permit2 allowance.
  const erc20Allowance = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, PERMIT2_ADDRESS] : undefined,
    query: { enabled: queryEnabled },
  });

  // Step 2 read: Permit2 → DEX allowance. Packed (amount, expiration, nonce).
  const permit2DexAllowance = useReadContract({
    address: PERMIT2_ADDRESS,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args:
      account && tokenAddress && dexAddress
        ? [account, tokenAddress, dexAddress]
        : undefined,
    query: { enabled: queryEnabled && Boolean(dexAddress) },
  });

  // -------- Step 1 write: ERC20.approve(Permit2, MaxUint256) --------
  const approveErc20Tx = useWriteContract();
  const approveErc20Receipt = useWaitForTransactionReceipt({
    hash: approveErc20Tx.data,
    query: { enabled: Boolean(approveErc20Tx.data) },
  });

  // -------- Step 2 write: Permit2.approve(token, DEX, MaxUint160, MaxUint48) --------
  const approvePermit2Tx = useWriteContract();
  const approvePermit2Receipt = useWaitForTransactionReceipt({
    hash: approvePermit2Tx.data,
    query: { enabled: Boolean(approvePermit2Tx.data) },
  });

  const flowActive = useRef(false);

  // Decide what's still missing right now.
  const erc20Allow = (erc20Allowance.data as bigint | undefined) ?? 0n;
  const permit2Tuple = permit2DexAllowance.data as
    | readonly [bigint, number, number]
    | undefined;
  const permit2Amount = permit2Tuple ? BigInt(permit2Tuple[0]) : 0n;
  const permit2Expiry = permit2Tuple ? Number(permit2Tuple[1]) : 0;

  // Threshold for "approved enough to be useful". Anything ≥ 2^159 is
  // effectively infinite for any realistic order size; we use 2^159 (half of
  // uint160 max) as the gate so a partially-spent allowance still counts as
  // approved until the user explicitly re-approves.
  const APPROVAL_GATE = 1n << 159n;

  // Wall-clock comparison for Permit2 expiry. Re-renders with the polled
  // allowance reads pick this up automatically; no other invariant depends
  // on `nowSec` being identical across renders.
  // eslint-disable-next-line react-hooks/purity
  const nowSec = Math.floor(Date.now() / 1000);
  const isErc20Approved = erc20Allow >= APPROVAL_GATE;
  const isPermit2DexApproved =
    permit2Amount >= APPROVAL_GATE && permit2Expiry > nowSec;
  const isFullyApproved = isErc20Approved && isPermit2DexApproved;

  const sendStep1 = () => {
    if (!tokenAddress) return;
    approveErc20Tx.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, maxUint256],
    });
  };

  const sendStep2 = () => {
    if (!tokenAddress || !dexAddress) return;
    approvePermit2Tx.writeContract({
      address: PERMIT2_ADDRESS,
      abi: PERMIT2_ABI,
      functionName: "approve",
      args: [
        tokenAddress,
        dexAddress,
        UINT160_MAX,
        Number(PERMIT2_MAX_EXPIRATION),
      ],
    });
  };

  /**
   * Public approve handler. Runs whichever step is still missing, in order:
   *   - if step 1 not done → fire step 1 (and let the effect below chain step 2)
   *   - else if step 2 not done → fire step 2
   *   - else no-op
   */
  const approve = () => {
    if (!tokenAddress || !dexAddress) return;
    flowActive.current = true;
    if (!isErc20Approved) {
      sendStep1();
    } else if (!isPermit2DexApproved) {
      sendStep2();
    }
  };

  /**
   * Revokes Permit2 → DEX allowance for this token. Calls
   * `Permit2.approve(token, dex, 0, 0)` which collapses the per-spender
   * allowance to zero with `expiration = 0` (immediately expired). This is
   * the only step that matters for on-chain safety — Permit2 cannot transfer
   * without the second-leg allowance, so the wallet → Permit2 leg is left
   * in place; users who want to wipe that too can do so from MetaMask.
   */
  const revokePermit2Tx = useWriteContract();
  const revokePermit2Receipt = useWaitForTransactionReceipt({
    hash: revokePermit2Tx.data,
    query: { enabled: Boolean(revokePermit2Tx.data) },
  });
  const revoke = () => {
    if (!tokenAddress || !dexAddress) return;
    revokePermit2Tx.writeContract({
      address: PERMIT2_ADDRESS,
      abi: PERMIT2_ABI,
      functionName: "approve",
      args: [tokenAddress, dexAddress, 0n, 0],
    });
  };
  useEffect(() => {
    if (revokePermit2Receipt.isSuccess) {
      void permit2DexAllowance.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revokePermit2Receipt.isSuccess]);

  // Auto-chain step 2 once step 1 confirms within an active flow.
  useEffect(() => {
    if (!flowActive.current) return;
    if (!approveErc20Receipt.isSuccess) return;
    if (approvePermit2Tx.isPending || approvePermit2Tx.data) return;
    if (!isPermit2DexApproved) {
      sendStep2();
    }
    // intentionally exclude sendStep2 from deps — it's a stable closure that
    // only depends on tokenAddress/dexAddress, both checked inside.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    approveErc20Receipt.isSuccess,
    approvePermit2Tx.isPending,
    approvePermit2Tx.data,
    isPermit2DexApproved,
  ]);

  // Refetch allowances (and balance, in case mint just happened) once a tx
  // confirms, so derived state and downstream consumers see the change.
  useEffect(() => {
    if (approveErc20Receipt.isSuccess) {
      void erc20Allowance.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveErc20Receipt.isSuccess]);

  useEffect(() => {
    if (approvePermit2Receipt.isSuccess) {
      void permit2DexAllowance.refetch();
      flowActive.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approvePermit2Receipt.isSuccess]);

  // -------- mint(account, amount) on testnet MockERC20 --------
  const mintTx = useWriteContract();
  const mintReceipt = useWaitForTransactionReceipt({
    hash: mintTx.data,
    query: { enabled: Boolean(mintTx.data) },
  });

  /** Mints a default round number to the connected wallet. Sepolia only. */
  const mintDefault = () => {
    if (!tokenAddress || !account) return;
    const amount = parseUnits("1000", token.decimals);
    mintTx.writeContract({
      address: tokenAddress,
      abi: MOCK_ERC20_ABI,
      functionName: "mint",
      args: [account, amount],
    });
  };

  useEffect(() => {
    if (mintReceipt.isSuccess) void balance.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mintReceipt.isSuccess]);

  const step: ApproveStep = approveErc20Tx.isPending || approveErc20Receipt.isLoading
    ? "step1"
    : approvePermit2Tx.isPending || approvePermit2Receipt.isLoading
    ? "step2"
    : isFullyApproved
    ? "done"
    : "idle";

  const isApproving = step === "step1" || step === "step2";

  return {
    tokenAddress: tokenAddress as Address | undefined,
    dexAddress: dexAddress as Address | undefined,
    isConnected,
    chainId,

    balance: balance.data ?? 0n,
    balanceLoading: balance.isLoading,
    refetchBalance: balance.refetch,

    // Backwards-compat: existing consumers read `allowance` to mean "wallet→Permit2".
    allowance: erc20Allow,
    allowanceLoading: erc20Allowance.isLoading,
    refetchAllowance: erc20Allowance.refetch,

    // New, explicit two-step state.
    erc20Allowance: erc20Allow,
    permit2DexAllowance: permit2Amount,
    permit2DexExpiration: permit2Expiry,
    isErc20Approved,
    isPermit2DexApproved,
    isFullyApproved,
    approveStep: step,

    approve,
    isApproving,
    isApproveConfirmed: approveErc20Receipt.isSuccess && approvePermit2Receipt.isSuccess,
    approveError: approveErc20Tx.error ?? approvePermit2Tx.error,

    revoke,
    isRevoking: revokePermit2Tx.isPending || revokePermit2Receipt.isLoading,
    isRevokeConfirmed: revokePermit2Receipt.isSuccess,
    revokeError: revokePermit2Tx.error,

    mintDefault,
    isMinting: mintTx.isPending || mintReceipt.isLoading,
    isMintConfirmed: mintReceipt.isSuccess,
    mintError: mintTx.error,
  };
}
