import type { Pair } from "@/lib/tokens";

export function StatsBar({ pair }: { pair: Pair }) {
  // Phase 1 placeholder data — Phase 3+ will source from indexer / on-chain reads.
  const stats =
    pair.quote === "JPYC"
      ? {
          price: "0.0600",
          change: "+2.84%",
          positive: true,
          volume24h: "1.24M JPYC",
          high24h: "0.0618",
          low24h: "0.0584",
        }
      : {
          price: "0.000420",
          change: "-1.21%",
          positive: false,
          volume24h: "8.7K USDT",
          high24h: "0.000432",
          low24h: "0.000415",
        };

  return (
    <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-line">
      <div className="flex flex-wrap items-end gap-x-10 gap-y-3">
        <Field
          label=""
          value={
            <div className="flex items-baseline gap-3">
              <span className="text-[34px] font-medium tracking-tight tnum">
                {stats.price}
              </span>
              <span
                className={`text-sm tnum ${
                  stats.positive ? "text-buy" : "text-sell"
                }`}
              >
                {stats.change}
              </span>
            </div>
          }
        />
        <Field label="24H Volume" value={stats.volume24h} />
        <Field label="24H High" value={stats.high24h} mono />
        <Field label="24H Low" value={stats.low24h} mono />
        <Field
          label="Maker Fee"
          value={
            <div>
              <div className="text-fg">10%</div>
              <div className="text-[11px] text-fg-faint mt-0.5">
                paid in {pair.base} (sell side)
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
