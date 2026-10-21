import { formatUnits } from "viem";

/**
 * Money-total formatter for the order-book depth sums.
 *
 * Deliberately NOT `formatPrice`. That one renders 4 significant figures,
 * which is exactly right for a unit price spanning dust-to-thousands and
 * exactly wrong for a total: 12,345,678 JPYC of resting bids would print as
 * "12,350,000", overstating the book by 4,322 JPYC. A depth number exists to
 * be trusted at a glance, so it renders at the quote token's own display
 * precision with thousands grouping and no silent re-scaling.
 *
 * Grouping/locale handling is `Intl.NumberFormat`, pinned to "en-US" to match
 * `formatPrice` — the board is a monospace numeric grid and the separator
 * style must not shift under the user's locale while the price column above
 * it stays fixed.
 */

const FORMATTERS = new Map<number, Intl.NumberFormat>();

function formatterFor(fractionDigits: number): Intl.NumberFormat {
  let formatter = FORMATTERS.get(fractionDigits);
  if (!formatter) {
    formatter = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
      useGrouping: true,
    });
    FORMATTERS.set(fractionDigits, formatter);
  }
  return formatter;
}

/**
 * Render an integer token amount as a grouped decimal total.
 *
 * @param units          amount in the token's smallest unit (wei-scale)
 * @param tokenDecimals  the token's on-chain `decimals`
 * @param fractionDigits fixed decimal places to display
 *
 * `formatUnits` runs BEFORE the Number cast on purpose: 1.2345678e25 wei
 * loses precision as a double, while the human-scale 12345678.0 it decodes to
 * does not. The result is exact for any total below 2^53 whole units — many
 * orders of magnitude beyond a real book.
 */
export function formatTokenTotal(
  units: bigint,
  tokenDecimals: number,
  fractionDigits: number,
): string {
  const value = Number(formatUnits(units, tokenDecimals));
  if (!Number.isFinite(value)) return "—";
  return formatterFor(fractionDigits).format(value);
}
