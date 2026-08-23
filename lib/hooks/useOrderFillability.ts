"use client";

import { useMemo } from "react";
import { type Address, type Hex } from "viem";
import { useChainId, useReadContracts } from "wagmi";

import { ERC20_ABI, PERMIT2_ABI } from "@/lib/abi";
import { PERMIT2_ADDRESS, SCENTDEX_V5_ADDRESS } from "@/lib/contracts";

/**
 * Live "is this signed order still fillable right now?" check.
 *
 * Round-3 changed what "fillable" means. With per-order Permit2
 * signatures attached to each order, the spend-allowance question is
 * answered by the order itself (the `permitSingle + permitSignature`
 * pair scoped to amount=makerAmount, expiration=expiry). The contract
 * does `permit2.permit(...)` just-in-time at fill.
 *
 * What is still required at fill time, and therefore still worth
 * checking on the order book to keep takers from burning gas:
 *
 *   1. ERC20.balanceOf(maker)              — does the maker still hold
 *                                              the sell side?
 *   2. ERC20.allowance(maker, Permit2)     — is the wallet → Permit2
 *                                              hop still in place?
 *   3. Permit2.allowance(maker, makerToken, DEX).nonce  — does the
 *                                              signed permit's nonce
 *                                              still match what
 *                                              Permit2 will accept?
 *
 * (3) is the addition that catches "looks open in UI but reverts at
 * fill". If the maker ever filled (or otherwise consumed a Permit2
 * permit through this spender) since signing, the on-chain nonce has
 * advanced past the order's signed nonce and `permit2.permit()` will
 * revert with InvalidNonce. MetaMask then guesses ~21M gas and the
 * taker sees a broken-looking quote.
 *
 * Notes:
 *  - Orders whose chainId != connected chain are treated as "unknown"
 *    (we cannot read their state); OrderBook's deriveBook already
 *    filters those out by token-address match before display.
 *  - On RPC blip / loading, we fail open ("unknown") to avoid empty
 *    books on transient errors.
 *  - Orders missing `permitSingle.details.nonce` skip check (3) and
 *    fall back to balance + ERC20-allowance only — preserves the
 *    previous behaviour for legacy rows.
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
  /**
   * makerToken already transferred by prior (partial) fills, as a decimal
   * string. Fillability gates on the REMAINING amount (makerAmount − filled),
   * not the original size — otherwise a maker who sold part of their order
   * looks unfillable once their balance drops below the full amount.
   */
  filledMakerAmount?: string;
  order: {
    maker: Address;
    makerToken: Address;
    makerAmount: string; // bigint as decimal string
  };
  /**
   * The Permit2 nonce baked into the maker's signed PermitSingle. When
   * present we read Permit2's current on-chain nonce for the same
   * (owner, token, DEX) triple. Optional so older callers / legacy rows work.
   */
  permitSingle?: {
    details: {
      nonce: number | string | bigint;
    };
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

  // 3 calls per order: balanceOf, ERC20→Permit2 allowance, and
  // Permit2.allowance(maker, makerToken, DEX) for the nonce/permit
  // state. Result indices below assume this stride.
  const contracts = useMemo(() => {
    if (!dexAddress) return [];
    // The abi type union forces the type erasure here — wagmi's
    // useReadContracts accepts a heterogeneous abi list at runtime but
    // TS can't infer the union, so we cast on the consumer side.
    const calls: Array<{
      address: Address;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi: any;
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
      const balanceR = data[i * 3];
      const allowanceR = data[i * 3 + 1];
      const permit2R = data[i * 3 + 2];
      const makerAmount = safeBigInt(o.order.makerAmount);
      const filled = safeBigInt(o.filledMakerAmount ?? "0") ?? 0n;

      if (
        !balanceR ||
        !allowanceR ||
        !permit2R ||
        balanceR.status !== "success" ||
        allowanceR.status !== "success" ||
        permit2R.status !== "success" ||
        makerAmount === null
      ) {
        status[o.orderHash] = "unknown";
        continue;
      }

      // Gate on what's actually still fillable, not the original size.
      const need = makerAmount > filled ? makerAmount - filled : 0n;

      const balance = balanceR.result as bigint;
      const erc20Allowance = allowanceR.result as bigint;
      // Permit2.allowance returns a (uint160 amount, uint48 expiration,
      // uint48 nonce) tuple. viem types it as a heterogeneous array.
      const permit2Tuple = permit2R.result as readonly [bigint, number, number];
      const registeredAmount = permit2Tuple[0];
      const registeredExpiration = BigInt(permit2Tuple[1]);
      const onChainNonce = BigInt(permit2Tuple[2]);
      const nowSec = BigInt(Math.floor(Date.now() / 1000));

      // Skip nonce check for legacy rows that don't carry a signed
      // permitSingle.nonce; preserve their previous fillability story.
      const signedNonceRaw = o.permitSingle?.details?.nonce;
      const signedNonce: bigint | null =
        signedNonceRaw === undefined
          ? null
          : safeBigInt(String(signedNonceRaw));

      // The maker's Permit2 authorisation is usable for THIS fill if either:
      //  - the signed nonce still matches on-chain (first fill — the taker
      //    will submit the stored permit, which registers the allowance), OR
      //  - a prior (partial) fill already registered an allowance that still
      //    covers the remaining amount and hasn't expired (subsequent fills
      //    reuse it with an empty permit; the signed nonce has advanced).
      // Without the second branch, every partially-filled order was flagged
      // unfillable and vanished from the board (tester H-05).
      const permitUsable =
        (signedNonce !== null && signedNonce === onChainNonce) ||
        (registeredAmount >= need && registeredExpiration > nowSec);

      if (need > 0n && balance >= need && erc20Allowance >= need && permitUsable) {
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
