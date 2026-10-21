/**
 * Contract price-sanity limits, shared by the order form (client) and
 * POST /api/orders (server).
 *
 * Mirrors `_fillOrder` in ScentDexV6.sol byte-for-byte:
 *
 *   if (order.takerAmount < minTakerAmount[order.takerToken]) revert TakerAmountBelowFloor();
 *   if (maxPriceRatio != 0 &&
 *       Math.mulDiv(order.makerAmount, 1e18, order.takerAmount) > maxPriceRatio)
 *       revert PriceRatioAboveCap();
 *
 * `Math.mulDiv` rounds down, which is exactly bigint integer division here.
 * The ratio is computed on RAW token units, so a pair whose tokens have
 * different decimals (SCENT 18 / USDT 6) lands at a very different ratio
 * than an 18/18 pair at the same human price — that is why the limit has
 * to be read from the contract rather than assumed.
 *
 * An order that fails either check can be signed and stored, but can never
 * be filled. Rejecting it up front keeps unfillable orders off the book.
 */

export type PriceLimits = {
  /** Contract `maxPriceRatio()`. 0 means the cap is disabled. */
  maxPriceRatio: bigint;
  /** Contract `minTakerAmount(takerToken)` for this order's takerToken. */
  minTakerAmount: bigint;
};

/** `makerAmount * 1e18 / takerAmount`, rounded down (contract semantics). */
export function priceRatio(makerAmount: bigint, takerAmount: bigint): bigint | null {
  if (takerAmount <= 0n) return null;
  return (makerAmount * 10n ** 18n) / takerAmount;
}

/** True when the contract would revert `PriceRatioAboveCap` for this order. */
export function exceedsPriceCap(
  makerAmount: bigint,
  takerAmount: bigint,
  maxPriceRatio: bigint,
): boolean {
  const ratio = priceRatio(makerAmount, takerAmount);
  if (ratio === null) return true; // takerAmount 0 never fills
  if (maxPriceRatio === 0n) return false; // cap disabled on-chain
  return ratio > maxPriceRatio;
}

/** True when the contract would revert `TakerAmountBelowFloor`. */
export function belowTakerFloor(takerAmount: bigint, minTakerAmount: bigint): boolean {
  return takerAmount < minTakerAmount;
}

export type PriceLimitViolation = "price-ratio-above-cap" | "taker-amount-below-floor";

export function checkPriceLimits(
  order: { makerAmount: bigint; takerAmount: bigint },
  limits: PriceLimits,
): PriceLimitViolation | null {
  if (belowTakerFloor(order.takerAmount, limits.minTakerAmount)) {
    return "taker-amount-below-floor";
  }
  if (exceedsPriceCap(order.makerAmount, order.takerAmount, limits.maxPriceRatio)) {
    return "price-ratio-above-cap";
  }
  return null;
}
