"use client";

import { useTranslator } from "@/lib/locale-context";
import { useFillEvents } from "@/lib/hooks/useFillEvents";
import { usePairConfig } from "@/lib/hooks/usePairConfig";
import { formatPrice } from "@/lib/format-price";
import { symbolLabel, tokenLinks, type Pair } from "@/lib/tokens";

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

  // Links published by the BASE token's issuer, not by SCENTDEX. Keyed off the
  // active pair so a listing's links never show on another listing's tab —
  // rendering Seven DAO's links above SCENT/JPYC would read as SCENT's own.
  const links = tokenLinks(pair.base);

  const hasPrice = stats.latestPrice !== undefined;
  const priceText = hasPrice ? formatPrice(stats.latestPrice) : "—";
  const changeText =
    stats.priceChange24h !== undefined ? fmtChange(stats.priceChange24h) : "—";
  const positive = (stats.priceChange24h ?? 0) >= 0;

  const volumeText = stats.fills.length > 0
    ? `${fmtAmount(stats.volume24h)} ${symbolLabel(pair.quote)}`
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
          label={t("trade.statsBar.lastPrice")}
          value={
            <div className="flex items-baseline gap-x-3 gap-y-1 flex-wrap">
              {hasPrice ? (
                <span className="text-sm text-fg-dim tnum whitespace-nowrap">
                  1 {symbolLabel(pair.base)} =
                </span>
              ) : null}
              <span className="text-[34px] font-medium tracking-tight tnum">
                {priceText}
              </span>
              {hasPrice ? (
                <span className="text-lg font-medium text-fg-dim">
                  {symbolLabel(pair.quote)}
                </span>
              ) : null}
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
        {links ? (
          // ml-auto parks this at the right edge of the strip. On a narrow
          // viewport the row wraps and the block simply drops to its own line.
          <div className="ml-auto">
            <Field
              label={t("trade.statsBar.issuerLinks").replace(
                "{symbol}",
                symbolLabel(pair.base),
              )}
              value={
                <div className="flex items-center gap-2">
                  {links.website ? (
                    <LinkPill
                      href={links.website}
                      label={t("trade.statsBar.website")}
                      icon={<GlobeIcon />}
                    />
                  ) : null}
                  {links.x ? (
                    // Icon-only: the X mark IS the wordmark, so pairing it
                    // with an "X" label just renders "X X". The accessible
                    // name still comes from LinkPill's aria-label.
                    <LinkPill
                      href={links.x}
                      label="X"
                      icon={<XIcon />}
                      iconOnly
                    />
                  ) : null}
                </div>
              }
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LinkPill({
  href,
  label,
  icon,
  iconOnly,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  /** Render the glyph alone; `label` still supplies the accessible name. */
  iconOnly?: boolean;
}) {
  let host: string;
  try {
    host = new URL(href).host;
  } catch {
    host = href;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      // The destination is a third party's site, so name it in the accessible
      // label instead of leaving a bare "Website".
      aria-label={`${label} — ${host}`}
      title={host}
      className={`inline-flex items-center gap-1.5 rounded-md border border-line py-1 text-[12px] text-fg-dim hover:text-fg hover:border-fg-faint transition-colors ${
        iconOnly ? "px-2" : "px-2.5"
      }`}
    >
      {icon}
      {iconOnly ? null : <span>{label}</span>}
    </a>
  );
}

function GlobeIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M2 12h20" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
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
