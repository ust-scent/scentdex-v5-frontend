"use client";

import type { Address } from "viem";
import { useReadContracts } from "wagmi";

import { SCENTDEX_V5_ABI } from "@/lib/abi";
import type { PriceLimits } from "@/lib/price-limits";

export type PriceLimitsState =
  | { status: "loading"; limits: undefined }
  | { status: "error"; limits: undefined }
  | { status: "ready"; limits: PriceLimits };

/**
 * Live `maxPriceRatio()` and `minTakerAmount(takerToken)` from the DEX the
 * order will be signed against. The order form uses these to refuse to sign
 * an order the contract would reject at fill time (lib/price-limits.ts).
 */
export function usePriceLimits(
  chainId: number,
  dex: Address | undefined,
  takerToken: Address | undefined,
): PriceLimitsState & { refetch: () => void } {
  const enabled = Boolean(dex && takerToken);
  const q = useReadContracts({
    allowFailure: false,
    contracts: enabled
      ? [
          {
            chainId,
            address: dex!,
            abi: SCENTDEX_V5_ABI,
            functionName: "maxPriceRatio",
          },
          {
            chainId,
            address: dex!,
            abi: SCENTDEX_V5_ABI,
            functionName: "minTakerAmount",
            args: [takerToken!],
          },
        ]
      : [],
    query: { enabled, staleTime: 60_000, refetchInterval: 60_000 },
  });

  const refetch = () => {
    void q.refetch();
  };

  if (!enabled || q.isError) {
    return { status: "error", limits: undefined, refetch };
  }
  if (!q.data) {
    return { status: "loading", limits: undefined, refetch };
  }
  const [maxPriceRatio, minTakerAmount] = q.data as readonly [bigint, bigint];
  return { status: "ready", limits: { maxPriceRatio, minTakerAmount }, refetch };
}
