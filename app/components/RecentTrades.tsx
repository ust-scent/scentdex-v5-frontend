"use client";

/**
 * Recent Trades — the executed-fill tape for the active pair.
 *
 * Fed by `useTradeHistory`, which unions the off-chain fill log (deep history,
 * carries tx hashes) with the on-chain OrderFilled index (catches fills
 * executed outside this frontend). The panel used to read the on-chain index
 * alone, which only reaches back ~24h and so showed a single row on a quiet
 * pair even though the pair had traded plenty before that.
 *
 * Side colour follows the taker's perspective: green if the taker bought base,
 * red if the taker sold it. Empty state is explicit: no fake "live" stream
 * when there's nothing to show.
 */

import { useChainId } from "wagmi";

import { explorerName, explorerTxUrl } from "@/lib/explorer";
import { useTradeHistory } from "@/lib/hooks/useTradeHistory";
import { useTranslator } from "@/lib/locale-context";
import { type Pair } from "@/lib/tokens";

const MAX_ROWS = 30;

export function RecentTrades({ pair }: { pair: Pair }) {
  const t = useTranslator();
  const chainId = useChainId();
  const { trades, loading } = useTradeHistory(pair, MAX_ROWS);
  const explorer = explorerName(chainId);

  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
          {t("trade.recentTrades.title")}
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              loading ? "bg-fg-faint animate-pulse" : "bg-buy"
            }`}
            aria-hidden="true"
          />
          {loading ? t("trade.recentTrades.syncing") : t("trade.recentTrades.live")}
        </div>
      </header>

      <div className="grid grid-cols-3 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        <div>{t("trade.recentTrades.price")}</div>
        <div className="text-right">{t("trade.recentTrades.amount")}</div>
        <div className="text-right">{t("trade.recentTrades.time")}</div>
      </div>

      {trades.length === 0 ? (
        <div className="px-4 py-12 text-center text-[13px] text-fg-faint">
          {loading
            ? t("trade.recentTrades.loading")
            : t("trade.recentTrades.empty")}
        </div>
      ) : (
        // Capped so a full tape doesn't stretch the column past the order book
        // and leave the rest of the row short.
        <div className="font-mono text-[13px] leading-tight max-h-[560px] overflow-y-auto">
          {trades.map((trade) => {
            const txUrl = explorerTxUrl(chainId, trade.txHash);
            const age = fmtAge(trade.ageSec);
            return (
              <div
                key={trade.key}
                className="grid grid-cols-3 px-4 py-1 hover:bg-white/[0.02]"
              >
                <div
                  className={`tnum ${
                    trade.side === "buy" ? "text-buy" : "text-sell"
                  }`}
                >
                  {fmtPrice(trade.price)}
                </div>
                <div className="text-right tnum text-fg-dim">
                  {fmtAmount(trade.baseAmount)}
                </div>
                <div className="text-right tnum text-fg-faint">
                  {txUrl ? (
                    <a
                      href={txUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-fg hover:underline"
                      aria-label={t("trade.recentTrades.viewTx").replace(
                        "{explorer}",
                        explorer ?? "explorer",
                      )}
                    >
                      {age}
                      <ExternalLinkIcon />
                    </a>
                  ) : (
                    age
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/** 10px external-link glyph. Inline so the row height doesn't change. */
function ExternalLinkIcon() {
  return (
    <svg
      width="9"
      height="9"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0 opacity-60"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
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
