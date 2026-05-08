"use client";

import { type Address } from "viem";
import { useChainId, useReadContract } from "wagmi";

import { SCENTDEX_V5_ABI } from "@/lib/abi";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { TOKENS, type Pair } from "@/lib/tokens";

/**
 * Live read of the on-chain pair configuration.
 *
 * V5 stores `(enabled, feeSide, feeBps)` per canonical (lo, hi) pair via
 * `pairConfig(tokenA, tokenB)`; the result is what determines the protocol
 * fee a maker pays at fill time. Reading it here means StatsBar's "maker fee"
 * tile and the order-signing flow both source from the contract instead of
 * the lib/tokens.ts mirror, which can drift after a `setPair` execute.
 */
export type PairConfigData = {
  enabled: boolean;
  feeSide: Address | undefined;
  feeBps: number;
  /** The pair token whose symbol matches `feeSide`, if resolvable. */
  feeSideSymbol: string | undefined;
  loading: boolean;
  error: unknown;
};

export function usePairConfig(pair: Pair): PairConfigData {
  const chainId = useChainId();
  const dex = SCENTDEX_V5_ADDRESS[chainId];
  const baseToken = TOKENS.find((t) => t.symbol === pair.base);
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote);
  const baseAddr = baseToken?.addresses[chainId];
  const quoteAddr = quoteToken?.addresses[chainId];

  const { data, isLoading, error } = useReadContract({
    address: dex,
    abi: SCENTDEX_V5_ABI,
    functionName: "pairConfig",
    args: baseAddr && quoteAddr ? [baseAddr, quoteAddr] : undefined,
    query: {
      enabled: Boolean(dex && baseAddr && quoteAddr),
      refetchInterval: 60_000,
    },
  });

  if (!data) {
    return {
      enabled: false,
      feeSide: undefined,
      feeBps: 0,
      feeSideSymbol: undefined,
      loading: isLoading,
      error,
    };
  }
  const cfg = data as {
    enabled: boolean;
    feeSide: Address;
    feeBps: number;
  };

  const feeSideLower = cfg.feeSide.toLowerCase();
  const feeSideSymbol =
    baseAddr && baseAddr.toLowerCase() === feeSideLower
      ? baseToken?.symbol
      : quoteAddr && quoteAddr.toLowerCase() === feeSideLower
      ? quoteToken?.symbol
      : undefined;

  return {
    enabled: cfg.enabled,
    feeSide: cfg.feeSide,
    feeBps: Number(cfg.feeBps),
    feeSideSymbol,
    loading: isLoading,
    error,
  };
}
