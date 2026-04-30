/**
 * Order book — Phase 1 placeholder with dummy data.
 *
 * Phase 3 will source asks/bids from the off-chain indexer (Vercel Postgres
 * fed by an event-watcher cron). Until then, this component renders a static
 * snapshot so the page layout is reviewable end-to-end.
 */

type Row = { price: string; amount: string; total: string; partial?: boolean };

const ASKS: Row[] = [
  { price: "13.4036", amount: "891.69", total: "6,638.9" },
  { price: "13.3735", amount: "676.33", total: "5,747.21" },
  { price: "12.8741", amount: "811.42", total: "5,070.88" },
  { price: "12.8053", amount: "508.54", total: "4,259.46", partial: true },
  { price: "12.8766", amount: "481.45", total: "3,750.92" },
  { price: "12.6852", amount: "945.89", total: "3,269.47" },
  { price: "12.7262", amount: "424.83", total: "2,323.58" },
  { price: "12.5446", amount: "231.13", total: "1,898.75", partial: true },
  { price: "12.6040", amount: "112.36", total: "1,667.62" },
  { price: "12.5592", amount: "491.56", total: "1,555.26" },
  { price: "12.4959", amount: "1,063.7", total: "1,063.7" },
];

const BIDS: Row[] = [
  { price: "12.4450", amount: "538.05", total: "538.05" },
  { price: "12.4172", amount: "520.83", total: "1,058.88", partial: true },
  { price: "12.3759", amount: "235.89", total: "1,294.77" },
  { price: "12.4104", amount: "686.76", total: "1,981.53" },
  { price: "12.2384", amount: "247.25", total: "2,228.78" },
  { price: "12.3253", amount: "1,144.01", total: "3,372.79" },
  { price: "12.1240", amount: "256.02", total: "3,628.81" },
  { price: "12.2050", amount: "273.7", total: "3,902.51" },
  { price: "12.2064", amount: "374.9", total: "4,277.41" },
];

export function OrderBook() {
  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
          Order Book
        </h2>
        <div className="text-[11px] text-fg-faint font-mono">aggregated</div>
      </header>

      <div className="grid grid-cols-3 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        <div>Price (JPYC)</div>
        <div className="text-right">Amount (SCENT)</div>
        <div className="text-right">Total (SCENT)</div>
      </div>

      <div className="font-mono text-[13px] leading-tight">
        {ASKS.map((r) => (
          <BookRow key={r.price + "-ask"} row={r} side="sell" />
        ))}

        <div className="flex items-center justify-between px-4 py-3 border-y border-line bg-white/[0.015]">
          <span className="text-[18px] tnum">12.4800</span>
          <span className="text-[11px] text-fg-faint">
            Spread <span className="tnum text-fg-dim">0.0509</span>{" "}
            <span className="tnum">(0.41%)</span>
          </span>
        </div>

        {BIDS.map((r) => (
          <BookRow key={r.price + "-bid"} row={r} side="buy" />
        ))}
      </div>
    </section>
  );
}

function BookRow({ row, side }: { row: Row; side: "buy" | "sell" }) {
  const colour = side === "buy" ? "text-buy" : "text-sell";
  const bg = side === "buy" ? "bg-buy-soft" : "bg-sell-soft";

  return (
    <div className="relative grid grid-cols-3 px-4 py-1 hover:bg-white/[0.02] cursor-pointer">
      {/* depth bar */}
      <div
        className={`absolute inset-y-0 right-0 ${bg} pointer-events-none`}
        style={{ width: `${Math.min(parseFloat(row.total.replace(/,/g, "")) / 70, 100)}%` }}
      />
      <div className={`relative flex items-center gap-1.5 ${colour} tnum`}>
        {row.partial ? (
          <span className="w-1 h-1 rounded-full bg-current" aria-hidden="true" />
        ) : null}
        <span>{row.price}</span>
      </div>
      <div className="relative text-right tnum text-fg-dim">{row.amount}</div>
      <div className="relative text-right tnum text-fg-dim">{row.total}</div>
    </div>
  );
}
