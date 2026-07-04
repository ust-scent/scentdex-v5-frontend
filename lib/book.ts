import { formatUnits, type Address } from "viem";

import { TOKENS, type Pair } from "@/lib/tokens";

/**
 * Minimal slice of the /api/orders row that best-price derivation needs.
 * Kept structurally compatible with OrderBook's ApiOrder so callers can
 * pass the raw API payload straight through.
 */
export type BookApiOrder = {
  status: "open" | "partially-filled" | "filled" | "cancelled" | "expired";
  order: {
    maker: Address;
    makerToken: Address;
    takerToken: Address;
    makerAmount: string;
    takerAmount: string;
    feeSide: Address;
  };
};

/**
 * Best bid / best ask from a raw order list, using the same side + price
 * derivation as OrderBook's deriveBook (E-10: PlaceOrder needs the live
 * book top to detect a crossing price *before* the maker signs, not the
 * 20x last-trade deviation heuristic alone).
 *
 * Deliberately ignores fillability (balance / Permit2 checks) — a crossing
 * warning should key off what is visibly resting on the board, and the
 * extra multicall the fillability filter needs isn't worth it for a
 * non-blocking warning.
 */
export function deriveBestPrices(
  orders: BookApiOrder[],
  pair: Pair,
  chainId: number,
): { bestAsk: number | null; bestBid: number | null } {
  const baseToken = TOKENS.find((t) => t.symbol === pair.base);
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote);
  if (!baseToken || !quoteToken) return { bestAsk: null, bestBid: null };

  const baseAddr = (baseToken.addresses[chainId] ?? "").toLowerCase();
  const quoteAddr = (quoteToken.addresses[chainId] ?? "").toLowerCase();

  let bestAsk: number | null = null;
  let bestBid: number | null = null;

  for (const o of orders) {
    if (o.status !== "open" && o.status !== "partially-filled") continue;
    const mt = o.order.makerToken.toLowerCase();
    const tt = o.order.takerToken.toLowerCase();

    const makerAmount = BigInt(o.order.makerAmount);
    const takerAmount = BigInt(o.order.takerAmount);
    if (makerAmount === 0n || takerAmount === 0n) continue;

    let isSell: boolean;
    if (baseAddr && mt === baseAddr && tt === quoteAddr) {
      isSell = true;
    } else if (baseAddr && mt === quoteAddr && tt === baseAddr) {
      isSell = false;
    } else if (!baseAddr && !quoteAddr) {
      isSell = o.order.feeSide.toLowerCase() === mt;
    } else {
      continue;
    }

    let price: number;
    if (isSell) {
      const amount = Number(formatUnits(makerAmount, baseToken.decimals));
      price = Number(formatUnits(takerAmount, quoteToken.decimals)) / amount;
    } else {
      const amount = Number(formatUnits(takerAmount, baseToken.decimals));
      price = Number(formatUnits(makerAmount, quoteToken.decimals)) / amount;
    }
    if (!Number.isFinite(price) || price <= 0) continue;

    if (isSell) {
      if (bestAsk === null || price < bestAsk) bestAsk = price;
    } else {
      if (bestBid === null || price > bestBid) bestBid = price;
    }
  }

  return { bestAsk, bestBid };
}
