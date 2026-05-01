/**
 * Recent Trades — Phase 1 placeholder.
 * Phase 3 source: indexer subscription to OrderFilled events.
 */

type Trade = { price: string; amount: string; time: string; side: "buy" | "sell" };

const TRADES: Trade[] = [
  { price: "0.0599", amount: "1,234.20", time: "now", side: "buy" },
  { price: "0.0601", amount: "421.59", time: "2s", side: "sell" },
  { price: "0.0602", amount: "1,773.40", time: "5s", side: "sell" },
  { price: "0.0598", amount: "1,914.70", time: "6s", side: "buy" },
  { price: "0.0603", amount: "4,314.70", time: "12s", side: "sell" },
  { price: "0.0604", amount: "892.80", time: "13s", side: "sell" },
  { price: "0.0596", amount: "5,688.60", time: "18s", side: "buy" },
  { price: "0.0599", amount: "3,538.80", time: "12s", side: "buy" },
  { price: "0.0605", amount: "609.86", time: "26s", side: "sell" },
  { price: "0.0601", amount: "3,509.90", time: "14s", side: "sell" },
  { price: "0.0593", amount: "4,444.30", time: "28s", side: "buy" },
  { price: "0.0606", amount: "470.51", time: "26s", side: "sell" },
  { price: "0.0608", amount: "1,243.60", time: "37s", side: "sell" },
  { price: "0.0594", amount: "1,926.30", time: "24s", side: "buy" },
  { price: "0.0591", amount: "2,547.00", time: "40s", side: "buy" },
  { price: "0.0607", amount: "2,344.70", time: "24s", side: "sell" },
  { price: "0.0606", amount: "6,140.30", time: "30s", side: "sell" },
  { price: "0.0593", amount: "961.20", time: "37s", side: "buy" },
  { price: "0.0609", amount: "2,836.60", time: "38s", side: "sell" },
  { price: "0.0610", amount: "1,235.70", time: "32s", side: "sell" },
];

export function RecentTrades() {
  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
          Recent Trades
        </h2>
        <div className="flex items-center gap-1.5 text-[11px] text-fg-faint">
          <span
            className="w-1.5 h-1.5 rounded-full bg-buy"
            aria-hidden="true"
          />
          live
        </div>
      </header>

      <div className="grid grid-cols-3 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        <div>Price</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Time</div>
      </div>

      <div className="font-mono text-[13px] leading-tight">
        {TRADES.map((t, i) => (
          <div
            key={i}
            className="grid grid-cols-3 px-4 py-1 hover:bg-white/[0.02] cursor-pointer"
          >
            <div className={`tnum ${t.side === "buy" ? "text-buy" : "text-sell"}`}>
              {t.price}
            </div>
            <div className="text-right tnum text-fg-dim">{t.amount}</div>
            <div className="text-right tnum text-fg-faint">{t.time}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
