"use client";

import { useMemo } from "react";
import { type Address, type Hex } from "viem";
import { useChainId, useReadContracts } from "wagmi";

import { ERC20_ABI, PERMIT2_ABI } from "@/lib/abi";
import { PERMIT2_ADDRESS, SCENTDEX_V5_ADDRESS } from "@/lib/contracts";

/**
 * Live "is this signed order still fillable right now?" check.
 *
 * For each open order we read, in a single multicall:
 *   1. ERC20.balanceOf(maker)         — does the maker still hold the sell side?
 *   2. Permit2.allowance(maker, makerToken, scentdexV5)
 *                                     — does Permit2 still have spend permission?
 *
 * An order needs *both* readings ≥ makerAmount to be fillable. If either is
 * short, a taker who clicks "fill" would burn gas on a revert. The order book
 * uses the result to hide the row entirely (and tell the user how many were
 * hidden), so unsuspecting takers don't pay gas for orders that are already
 * dead in the water.
 *
 * Notes:
 * - Orders whose chainId != connected chain are treated as "fillable" here
 *   (we cannot read their state from this network); the OrderBook deriveBook
 *   already filters them out by token-address match before display.
 * - When reads are still loading or have errored we treat the order as
 *   fillable (i.e. fail-open) to avoid empty books on transient RPC issues.
 */

export type FillabilityStatus = "fillable" | "unfillable" | "unknown";

export type FillabilityCheck = {
  status: Record<string, FillabilityStatus>;
  unfillableCount: number;
  loading: boolean;
};

type OrderInput = {
  orderHash: string;
  chainId: number;
  order: {
    maker: Address;
    makerToken: Address;
    makerAmount: string; // bigint as decimal string
  };
};

export function useOrderFillability(orders: OrderInput[]): FillabilityCheck {
  const connectedChainId = useChainId();
  const dexAddress = SCENTDEX_V5_ADDRESS[connectedChainId];

  // Only orders on the currently connected chain can be checked — Permit2 +
  // ERC20 reads target the wallet's RPC.
  const checkable = useMemo(
    () => orders.filter((o) => o.chainId === connectedChainId && dexAddress),
    [orders, connectedChainId, dexAddress],
  );

  const contracts = useMemo(() => {
    if (!dexAddress) return [];
    const calls: Array<{
      address: Address;
      abi: typeof ERC20_ABI | typeof PERMIT2_ABI;
      functionName: string;
      args: readonly unknown[];
      chainId: number;
    }> = [];
    for (const o of checkable) {
      calls.push({
        address: o.order.makerToken,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [o.order.maker],
        chainId: connectedChainId,
      });
      calls.push({
        address: PERMIT2_ADDRESS,
        abi: PERMIT2_ABI,
        functionName: "allowance",
        args: [o.order.maker, o.order.makerToken, dexAddress],
        chainId: connectedChainId,
      });
    }
    return calls;
  }, [checkable, dexAddress, connectedChainId]);

  const { data, isLoading } = useReadContracts({
    // wagmi accepts a heterogeneous tuple here; the union of ABIs is fine at
    // runtime, but TS infers it strictly so we relax via cast.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: contracts as any,
    query: { enabled: contracts.length > 0 },
  });

  return useMemo<FillabilityCheck>(() => {
    const status: Record<string, FillabilityStatus> = {};
    let unfillableCount = 0;

    if (!data || data.length === 0) {
      // Without read results we cannot judge — leave everything as unknown
      // (treated as fillable downstream).
      for (const o of orders) status[o.orderHash] = "unknown";
      return {
        status,
        unfillableCount: 0,
        loading: contracts.length > 0 && isLoading,
      };
    }

    for (let i = 0; i < checkable.length; i++) {
      const o = checkable[i];
      const balanceR = data[i * 2];
      const allowanceR = data[i * 2 + 1];
      const need = safeBigInt(o.order.makerAmount);

      if (
        !balanceR ||
        !allowanceR ||
        balanceR.status !== "success" ||
        allowanceR.status !== "success" ||
        need === null
      ) {
        status[o.orderHash] = "unknown";
        continue;
      }

      const balance = balanceR.result as bigint;
      const tuple = allowanceR.result as readonly [bigint, number, number];
      const allowAmount = BigInt(tuple[0]);
      const allowExpiry = Number(tuple[1]);

      const nowSec = Math.floor(Date.now() / 1000);
      const allowanceLive = allowExpiry === 0 || allowExpiry > nowSec;

      if (balance >= need && allowAmount >= need && allowanceLive) {
        status[o.orderHash] = "fillable";
      } else {
        status[o.orderHash] = "unfillable";
        unfillableCount++;
      }
    }

    // Orders we couldn't check (different chain) — mark unknown.
    for (const o of orders) {
      if (status[o.orderHash] === undefined) status[o.orderHash] = "unknown";
    }

    return {
      status,
      unfillableCount,
      loading: false,
    };
  }, [data, checkable, orders, contracts.length, isLoading]);
}

function safeBigInt(value: string | Hex): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}
