"use client";

import { useEffect } from "react";
import {
  useAccount,
  useBalance,
  useChainId,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { erc20Abi } from "viem";

import { WETH9_ABI } from "@/lib/abi";
import { TOKENS } from "@/lib/tokens";

/**
 * ETH ⇄ WETH conversion for the auto-wrap UX (/sdttest SDT/WETH market).
 *
 * The trade flow is denominated in WETH on-chain, but the user thinks in
 * ETH. This hook exposes:
 *   - ethBalance / wethBalance (live)
 *   - spendable — WETH + (ETH − gas buffer): what the user can actually
 *     commit to a WETH-side order once auto-wrap is in play
 *   - wrap(amount) — WETH9.deposit{value: amount}
 *   - unwrap(amount) — WETH9.withdraw(amount)
 *   - shortfallFor(needed) — how much ETH must be wrapped on top of the
 *     current WETH balance to reach `needed` (0n when already covered)
 *
 * Callers await `isWrapConfirmed` (receipt success) before continuing to
 * the next step of their pipeline; both balances refetch automatically.
 */

/** Native ETH kept unwrapped so the user can still pay gas. */
export const WRAP_GAS_BUFFER = 10n ** 16n; // 0.01 ETH

export function useWeth() {
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const wethAddress = TOKENS.find((t) => t.wrapsNative)?.addresses[
    chainId
  ];
  const enabled = Boolean(isConnected && account && wethAddress);

  const eth = useBalance({
    address: account,
    query: { enabled: Boolean(isConnected && account) },
  });

  const weth = useReadContract({
    address: wethAddress,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { enabled },
  });

  const wrapTx = useWriteContract();
  const wrapReceipt = useWaitForTransactionReceipt({
    hash: wrapTx.data,
    query: { enabled: Boolean(wrapTx.data) },
  });

  const unwrapTx = useWriteContract();
  const unwrapReceipt = useWaitForTransactionReceipt({
    hash: unwrapTx.data,
    query: { enabled: Boolean(unwrapTx.data) },
  });

  const ethBalance = eth.data?.value ?? 0n;
  const wethBalance = (weth.data as bigint | undefined) ?? 0n;

  const wrap = (amount: bigint) => {
    if (!wethAddress || amount <= 0n) return;
    wrapTx.writeContract({
      address: wethAddress,
      abi: WETH9_ABI,
      functionName: "deposit",
      value: amount,
    });
  };

  const unwrap = (amount: bigint) => {
    if (!wethAddress || amount <= 0n) return;
    unwrapTx.writeContract({
      address: wethAddress,
      abi: WETH9_ABI,
      functionName: "withdraw",
      args: [amount],
    });
  };

  // Refresh both sides once a conversion lands.
  useEffect(() => {
    if (wrapReceipt.isSuccess || unwrapReceipt.isSuccess) {
      void eth.refetch();
      void weth.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wrapReceipt.isSuccess, unwrapReceipt.isSuccess]);

  /** ETH that must be wrapped so wethBalance reaches `needed`. */
  const shortfallFor = (needed: bigint): bigint =>
    needed > wethBalance ? needed - wethBalance : 0n;

  const wrappableEth = ethBalance > WRAP_GAS_BUFFER ? ethBalance - WRAP_GAS_BUFFER : 0n;

  return {
    wethAddress,
    ethBalance,
    wethBalance,
    /** WETH + wrappable ETH — the ceiling for a WETH-side order size. */
    spendable: wethBalance + wrappableEth,
    wrappableEth,
    balancesLoading: eth.isLoading || weth.isLoading,
    refetchBalances: () => {
      void eth.refetch();
      void weth.refetch();
    },

    wrap,
    isWrapping: wrapTx.isPending || wrapReceipt.isLoading,
    isWrapConfirmed: wrapReceipt.isSuccess,
    wrapError: wrapTx.error,
    resetWrap: wrapTx.reset,

    unwrap,
    isUnwrapping: unwrapTx.isPending || unwrapReceipt.isLoading,
    isUnwrapConfirmed: unwrapReceipt.isSuccess,
    unwrapError: unwrapTx.error,

    shortfallFor,
  };
}
