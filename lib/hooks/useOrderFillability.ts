"use client";

import { useMemo } from "react";
import { type Address, type Hex } from "viem";
import { useChainId, useReadContracts } from "wagmi";

import { ERC20_ABI } from "@/lib/abi";
import { PERMIT2_ADDRESS, SCENTDEX_V5_ADDRESS } from "@/lib/contracts";

/**
 * Live "is this signed order still fillable right now?" check.
 *
 * Round-3 changed what "fillable" means. With per-order Permit2
 * signatures attached to each order, the spend-allowance question is
 * answered by the order itself (the `permitSingle + permitSignature`
 * pair scoped to amount=makerAmount, expiration=expiry). The contract
 * does `permit2.permit(...)` just-in-time at fill, so there's no
 * standing Permit2 → DEX allowance to inspect.
 *
 * What is still required at fill time, and therefore still worth
 * checking on the order book to keep takers from burning gas:
 *
 *   1. ERC20.balanceOf(maker)              — does the maker still hold
 *                                              the sell side?
 *   2. ERC20.allowance(maker, Permit2)     — is the wallet → Permit2
 *                                              hop still in place?
 *
 * If a maker revoked Permit2 from their ERC-20 after signing, or the
 * tokens left their wallet, the order would revert at fill. The hook
 * marks those as `unfillable`, OrderBook hides them, and BottomTabs
 * surfaces an "Approval needed" badge so the maker can re-approve.
 *
 * Notes:
 *  - Orders whose chainId != connected chain are treated as "unknown"
 *    (we cannot read their state); OrderBook's deriveBook already
 *    filters those out by token-address match before display.
 *  - On RPC blip / loading, we fail open ("unknown") to avoid empty
 *    books on transient errors.
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

  // Only orders on the currently connected chain can be checked — the ERC20
  // reads target the wallet's RPC.
  const checkable = useMemo(
    () => orders.filter((o) => o.chainId === connectedChainId && dexAddress),
    [orders, connectedChainId, dexAddress],
  );

  const contracts = useMemo(() => {
    if (!dexAddress) return [];
    const calls: Array<{
      address: Address;
      abi: typeof ERC20_ABI;
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
        address: o.order.makerToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [o.order.maker, PERMIT2_ADDRESS],
        chainId: connectedChainId,
      });
    }
    return calls;
  }, [checkable, dexAddress, connectedChainId]);

  const { data, isLoading } = useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: contracts as any,
    query: {
      enabled: contracts.length > 0,
      // Poll every 8s so the maker's "Approval needed" badge clears within
      // one refresh window after they fix the underlying issue (rare but
      // possible: tokens move out of the wallet, ERC-20 → Permit2 revoked).
      refetchInterval: 8000,
      refetchOnWindowFocus: true,
    },
  });

  return useMemo<FillabilityCheck>(() => {
    const status: Record<string, FillabilityStatus> = {};
    let unfillableCount = 0;

    if (!data || data.length === 0) {
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
      const erc20Allowance = allowanceR.result as bigint;

      if (balance >= need && erc20Allowance >= need) {
        status[o.orderHash] = "fillable";
      } else {
        status[o.orderHash] = "unfillable";
        unfillableCount++;
      }
    }

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
