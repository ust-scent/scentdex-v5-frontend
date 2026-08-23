/**
 * Fat-finger guard: shared reference-price + deviation maths for the
 * maker form (PlaceOrder) and the taker modal (FillModal).
 *
 * A price more than PRICE_DEVIATION_WARN_THRESHOLD away from the market
 * reference triggers a warning the user must explicitly push through —
 * it never hard-blocks, because posting or taking far from market is a
 * legitimate strategy on a signed-order DEX. The reference is chosen in
 * confidence order:
 *
 *   1. last traded price — an actually consummated price (24h on-chain
 *      OrderFilled window); a single mis-priced RESTING order cannot
 *      skew it, which matters on a thin book
 *   2. book mid — (bestBid + bestAsk) / 2 when both sides rest
 *   3. the single resting side (bestBid or bestAsk) when only one exists
 *
 * When none of these exist (empty market, no trades) there is nothing to
 * deviate FROM and no warning can fire — callers should treat a null
 * reference as "check unavailable", not "check passed".
 */

export const PRICE_DEVIATION_WARN_THRESHOLD = 0.3;

export type PriceReference = {
  price: number;
  source: "lastTrade" | "mid" | "bestBid" | "bestAsk";
};

export function referencePrice(
  lastTradePrice: number | undefined,
  bestBid: number | null,
  bestAsk: number | null,
): PriceReference | null {
  if (
    lastTradePrice !== undefined &&
    Number.isFinite(lastTradePrice) &&
    lastTradePrice > 0
  ) {
    return { price: lastTradePrice, source: "lastTrade" };
  }
  if (bestBid !== null && bestAsk !== null) {
    return { price: (bestBid + bestAsk) / 2, source: "mid" };
  }
  if (bestBid !== null) return { price: bestBid, source: "bestBid" };
  if (bestAsk !== null) return { price: bestAsk, source: "bestAsk" };
  return null;
}

export type DeviationWarning = {
  /** Absolute deviation as an integer percentage, e.g. 45 for ±45%. */
  pct: number;
  /** true when the price is above the reference, false when below. */
  above: boolean;
};

/**
 * Returns the warning payload when `price` deviates from `ref` by at least
 * the threshold in EITHER direction, else null. Both directions warn:
 * above-reference buys overpay and below-reference sells undersell, and
 * the mirror cases are still overwhelmingly typos worth a second look.
 */
export function deviationWarning(
  price: number,
  ref: number,
): DeviationWarning | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  if (!Number.isFinite(ref) || ref <= 0) return null;
  const dev = (price - ref) / ref;
  if (Math.abs(dev) < PRICE_DEVIATION_WARN_THRESHOLD) return null;
  return { pct: Math.round(Math.abs(dev) * 100), above: dev > 0 };
}
