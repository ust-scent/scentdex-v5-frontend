"use client";

import { useTranslator } from "@/lib/locale-context";
import { useFillEvents } from "@/lib/hooks/useFillEvents";
import { usePairConfig } from "@/lib/hooks/usePairConfig";
import { formatPrice } from "@/lib/format-price";
import { type Pair } from "@/lib/tokens";

/**
 * Pair stats strip — price, 24h change/volume/high/low, and protocol fee.
 *
 * All numbers come from on-chain reads:
 *   - latest price / change / volume / high / low: aggregated from
 *     OrderFilled events over the last ~24h via useFillEvents
 *   - maker fee: pairConfig(base, quote) live read via usePairConfig
 *
 * No placeholders. Empty fields render as "—" so it's obvious there's no
 * activity yet rather than showing a fake "0.0600" the tester might trust.
 */
export function StatsBar({ pair }: { pair: Pair }) {
  const t = useTranslator();
  const stats = useFillEvents(pair);
  const cfg = usePairConfig(pair);

  const priceText =
    stats.latestPrice !== undefined ? formatPrice(stats.latestPrice) : "—";
  const changeText =
    stats.priceChange24h !== undefined ? fmtChange(stats.priceChange24h) : "—";
  const positive = (stats.priceChange24h ?? 0) >= 0;

  const volumeText = stats.fills.length > 0
    ? `${fmtAmount(stats.volume24h)} ${pair.quote}`
    : "—";
  const highText = formatPrice(stats.high24h);
  const lowText = formatPrice(stats.low24h);

  // Use locale-aware formatting so sub-1% rates (e.g. 30 bps = 0.3%) survive
  // — the previous toFixed(0) collapsed them to "0%" and made traders think
  // the pair was fee-free. Max 2 fractional digits is enough granularity
  // for every bps value we actually use (10 → 0.1%, 30 → 0.3%, 1000 → 10%).
  const feePct =
    cfg.feeBps > 0
      ? `${(cfg.feeBps / 100).toLocaleString("en-US", {
          maximumFractionDigits: 2,
        })}%`
      : "—";

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-line">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <Field
          label=""
          value={
            <div className="flex items-baseline gap-3">
              <span className="text-[34px] font-medium tracking-tight tnum">
                {priceText}
              </span>
              <span
                className={`text-sm tnum ${
                  stats.priceChange24h === undefined
                    ? "text-fg-faint"
                    : positive
                    ? "text-buy"
                    : "text-sell"
                }`}
              >
                {changeText}
              </span>
            </div>
          }
        />
        <Field label={t("trade.statsBar.volume24h")} value={volumeText} />
        <Field label={t("trade.statsBar.high24h")} value={highText} mono />
        <Field label={t("trade.statsBar.low24h")} value={lowText} mono />
        <Field
          label={t("trade.statsBar.makerFee")}
          value={
            <div>
              <div className="text-fg">{feePct}</div>
              <div className="text-[11px] text-fg-faint mt-0.5">
                {t("trade.statsBar.makerFeeSuffix")}
              </div>
            </div>
          }
        />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div>
      {label ? (
        <div className="text-[10px] uppercase tracking-[0.16em] text-fg-faint mb-1">
          {label}
        </div>
      ) : null}
      <div className={mono ? "font-mono tnum text-[15px]" : "text-[15px]"}>
        {value}
      </div>
    </div>
  );
}

function fmtAmount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (n === 0) return "0";
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}M`;
  if (n >= 10_000)
    return `${(n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 1 })}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function fmtChange(change: number): string {
  const pct = change * 100;
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}
