/**
 * Significant-figure price formatter.
 *
 * Industry-standard layout used by Uniswap, Binance, dYdX, et al.: a
 * fixed-decimal display (`toFixed(4)`) breaks down on dust-priced pairs
 * — a real bid at 0.000004 USDT/SCENT collapses to "0.0000" and the
 * tester can't tell it from an actual zero. Switching to a fixed
 * number of significant digits keeps the magnitude visible at any
 * scale (0.000004, 0.07000, 100.0, 12,350) without ever printing
 * meaningless trailing zeros that occlude the leading nonzero digit.
 *
 *  4 sig figs is the sweet spot for the order book:
 *    - dust: 0.000004 stays legible
 *    - low: 0.07000 still shows 2 nonzero digits after the leading 7
 *    - mid: 100.0 fits the 34px hero price slot
 *    - high: 12,350 keeps thousands-grouping
 *
 * `Intl.NumberFormat` handles grouping (commas at the thousands
 * boundary), locale-aware separators, and the rounding semantics
 * (`roundingMode: "halfExpand"`, the JS default — fine here, we never
 * settle real funds against this string).
 */

const PRICE_FORMATTER = new Intl.NumberFormat("en-US", {
  minimumSignificantDigits: 4,
  maximumSignificantDigits: 4,
  useGrouping: true,
});

export function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value === 0) return "0";
  return PRICE_FORMATTER.format(value);
}
