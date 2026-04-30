/**
 * Recent Trades — Phase 1 placeholder.
 * Phase 3 source: indexer subscription to OrderFilled events.
 */

type Trade = { price: string; amount: string; time: string; side: "buy" | "sell" };

const TRADES: Trade[] = [
  { price: "12.3964", amount: "98.24", time: "now", side: "buy" },
  { price: "12.4622", amount: "421.59", time: "2s", side: "sell" },
  { price: "12.5106", amount: "177.34", time: "5s", side: "sell" },
  { price: "12.5037", amount: "191.47", time: "6s", side: "buy" },
  { price: "12.5567", amount: "431.47", time: "12s", side: "sell" },
  { price: "12.5673", amount: "289.28", time: "13s", side: "sell" },
  { price: "12.4618", amount: "568.86", time: "18s", side: "buy" },
  { price: "12.5025", amount: "353.88", time: "12s", side: "buy" },
  { price: "12.5637", amount: "609.86", time: "26s", side: "sell" },
  { price: "12.4603", amount: "350.99", time: "14s", side: "sell" },
  { price: "12.4415", amount: "444.43", time: "28s", side: "buy" },
  { price: "12.4875", amount: "470.51", time: "26s", side: "sell" },
  { price: "12.5240", amount: "124.36", time: "37s", side: "sell" },
  { price: "12.4860", amount: "192.63", time: "24s", side: "buy" },
  { price: "12.4407", amount: "25.47", time: "40s", side: "buy" },
  { price: "12.4890", amount: "234.47", time: "24s", side: "sell" },
  { price: "12.4753", amount: "614.03", time: "30s", side: "sell" },
  { price: "12.4861", amount: "96.12", time: "37s", side: "buy" },
  { price: "12.5616", amount: "283.66", time: "38s", side: "sell" },
  { price: "12.5329", amount: "123.57", time: "32s", side: "sell" },
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
