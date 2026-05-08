"use client";

import { useEffect } from "react";
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
 * Per-token reads + writes for the trade UI.
 *
 * V5 uses Permit2 — every settlement goes
 * `wallet → Permit2 → DEX`. Earlier rounds approved both legs once at
 * MaxUint160 / MaxUint48 ("infinite") and reused them across orders.
 * That gave the DEX a standing right to spend the maker's entire wallet,
 * which conflicts with V5's design intent (no idle allowance, only what
 * the maker has explicitly signed an order for).
 *
 * From this round on, the second leg (Permit2 → DEX) is signed *per
 * order*: each Order carries its own EIP-712 PermitSingle scoped to
 * `amount = order.makerAmount` and `expiration = order.expiry`. The
 * contract's `_fillOrder` invokes `permit2.permit(maker, permitSingle,
 * sig)` just before pulling tokens, so no on-chain allowance lives
 * between trades.
 *
 * What this hook now manages:
 *   - balance + ERC-20 allowance to Permit2  (still a one-time approval —
 *     Permit2 cannot pull from a wallet that hasn't approved it)
 *   - read of the Permit2 → DEX allowance, but only to extract the
 *     current `nonce` so the next PermitSingle uses the right one;
 *     the amount field is no longer the gate for fillability
 *   - approve() = a single ERC-20 → Permit2 transaction, not a chain
 *   - revoke() = ERC-20 → Permit2 set to 0, useful if the maker wants
 *     to disable the wallet → Permit2 hop entirely
 */

export type ApproveStep = "idle" | "approving" | "done";

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

  // ERC-20 → Permit2 allowance. One-time, infinite is fine here because
  // it grants spend rights to Permit2 itself, not to the DEX directly —
  // Permit2 still requires a per-order signature before it'll move
  // anything. Without this leg, Permit2 can't pull from the wallet.
  const erc20Allowance = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: "allowance",
    args: account ? [account, PERMIT2_ADDRESS] : undefined,
    query: { enabled: queryEnabled },
  });

  // Permit2 → DEX allowance reading kept for ONE reason only: to read the
  // current `nonce` field, which the next PermitSingle must increment from.
  // The amount/expiration fields are no longer used by the UI since
  // settlement goes through per-order signatures, not standing approvals.
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

  // -------- approve(): ERC-20 → Permit2 (one-time, MaxUint256) --------
  const approveTx = useWriteContract();
  const approveReceipt = useWaitForTransactionReceipt({
    hash: approveTx.data,
    query: { enabled: Boolean(approveTx.data) },
  });

  const erc20Allow = (erc20Allowance.data as bigint | undefined) ?? 0n;
  const permit2Tuple = permit2DexAllowance.data as
    | readonly [bigint, number, number]
    | undefined;
  const permit2Nonce = permit2Tuple ? Number(permit2Tuple[2]) : 0;

  // Threshold: anything ≥ 2^159 counts as "approved enough" so a
  // partially-spent allowance still passes until the user revokes.
  const APPROVAL_GATE = 1n << 159n;
  const isErc20Approved = erc20Allow >= APPROVAL_GATE;

  const approve = () => {
    if (!tokenAddress) return;
    approveTx.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, maxUint256],
    });
  };

  // Refetch allowance after a successful approve so derived state catches up.
  useEffect(() => {
    if (approveReceipt.isSuccess) void erc20Allowance.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approveReceipt.isSuccess]);

  // -------- revoke(): ERC-20 → Permit2 set to 0 --------
  // Lets the maker disable Permit2's right to pull from the wallet entirely.
  // Per-order PermitSingle signatures still need the wallet → Permit2 leg
  // to be in place at fill time, so revoking effectively pauses ALL of the
  // maker's open orders until they re-approve.
  const revokeTx = useWriteContract();
  const revokeReceipt = useWaitForTransactionReceipt({
    hash: revokeTx.data,
    query: { enabled: Boolean(revokeTx.data) },
  });
  const revoke = () => {
    if (!tokenAddress) return;
    revokeTx.writeContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [PERMIT2_ADDRESS, 0n],
    });
  };
  useEffect(() => {
    if (revokeReceipt.isSuccess) void erc20Allowance.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revokeReceipt.isSuccess]);

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

  const step: ApproveStep = approveTx.isPending || approveReceipt.isLoading
    ? "approving"
    : isErc20Approved
    ? "done"
    : "idle";

  const isApproving = step === "approving";

  return {
    tokenAddress: tokenAddress as Address | undefined,
    dexAddress: dexAddress as Address | undefined,
    isConnected,
    chainId,

    balance: balance.data ?? 0n,
    balanceLoading: balance.isLoading,
    refetchBalance: balance.refetch,

    // ERC-20 → Permit2 leg.
    allowance: erc20Allow,
    allowanceLoading: erc20Allowance.isLoading,
    refetchAllowance: erc20Allowance.refetch,
    isErc20Approved,
    /** Same thing — kept for callers that still want a single boolean. */
    isFullyApproved: isErc20Approved,

    /** Permit2 → DEX nonce, used when building the next per-order PermitSingle. */
    permit2DexNonce: permit2Nonce,
    refetchPermit2Nonce: permit2DexAllowance.refetch,

    approve,
    isApproving,
    isApproveConfirmed: approveReceipt.isSuccess,
    approveError: approveTx.error,
    approveStep: step,

    revoke,
    isRevoking: revokeTx.isPending || revokeReceipt.isLoading,
    isRevokeConfirmed: revokeReceipt.isSuccess,
    revokeError: revokeTx.error,

    mintDefault,
    isMinting: mintTx.isPending || mintReceipt.isLoading,
    isMintConfirmed: mintReceipt.isSuccess,
    mintError: mintTx.error,
  };
}
