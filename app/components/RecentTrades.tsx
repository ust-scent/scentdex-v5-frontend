"use client";

/**
 * Recent Trades — fed by the on-chain OrderFilled event index.
 *
 * Displays up to 30 most-recent fills for the current pair. Side colour
 * follows the taker's perspective: green if the taker bought base, red if
 * the taker sold it. Empty state is explicit: no fake "live" stream when
 * there's nothing to show.
 */

import { useTranslator } from "@/lib/locale-context";
import { useFillEvents } from "@/lib/hooks/useFillEvents";
import { type Pair } from "@/lib/tokens";

const MAX_ROWS = 30;

export function RecentTrades({ pair }: { pair: Pair }) {
  const t = useTranslator();
  const stats = useFillEvents(pair);
  const rows = stats.fills.slice(0, MAX_ROWS);

  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
          {t("trade.recentTrades.title")}
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              stats.loading ? "bg-fg-faint animate-pulse" : "bg-buy"
            }`}
            aria-hidden="true"
          />
          {stats.loading ? t("trade.recentTrades.syncing") : t("trade.recentTrades.live")}
        </div>
      </header>

      <div className="grid grid-cols-3 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        <div>{t("trade.recentTrades.price")}</div>
        <div className="text-right">{t("trade.recentTrades.amount")}</div>
        <div className="text-right">{t("trade.recentTrades.time")}</div>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-12 text-center text-[13px] text-fg-faint">
          {stats.loading
            ? t("trade.recentTrades.loading")
            : t("trade.recentTrades.empty")}
        </div>
      ) : (
        <div className="font-mono text-[13px] leading-tight">
          {rows.map((fill) => (
            <div
              key={`${fill.txHash}-${fill.blockNumber}`}
              className="grid grid-cols-3 px-4 py-1 hover:bg-white/[0.02]"
            >
              <div
                className={`tnum ${
                  fill.side === "buy" ? "text-buy" : "text-sell"
                }`}
              >
                {fmtPrice(fill.price)}
              </div>
              <div className="text-right tnum text-fg-dim">
                {fmtAmount(fill.baseAmount)}
              </div>
              <div className="text-right tnum text-fg-faint">
                {fmtAge(fill.ageSec)}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function fmtPrice(price: number): string {
  if (!Number.isFinite(price) || price === 0) return "0";
  const decimals = price >= 1 ? 4 : price >= 0.0001 ? 6 : 8;
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

function fmtAmount(amount: number): string {
  if (!Number.isFinite(amount)) return "0";
  return amount.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function fmtAge(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  if (sec < 5) return "now";
  if (sec < 60) return `${Math.floor(sec)}s`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)}h`;
  return `${Math.floor(sec / 86_400)}d`;
}
