"use client";

import { pairsForChain, PAIRS, type Pair } from "@/lib/tokens";
import { useState } from "react";
import { useChainId } from "wagmi";

type Stats = { price: string; change: string; positive: boolean };

// Placeholder market data — replaced by on-chain `useFillEvents` numbers
// once a real fill lands. Keys are canonical pair labels and work on every
// chain that lists the pair; chains without a listing simply skip the
// dummy entry because `pairsForChain` filters the pair out.
const DUMMY_STATS: Record<string, Stats> = {
  "SCENT/JPYC": { price: "0.0600", change: "+2.84%", positive: true },
  "SCENT/USDT": { price: "0.000420", change: "-1.21%", positive: false },
  "SDO/USDT": { price: "0.0010", change: "+5.42%", positive: true },
  "SDO/SCENT": { price: "2.4500", change: "+0.86%", positive: true },
};

function pairKey(p: Pair) {
  return `${p.base}/${p.quote}`;
}

export function PairTabs({
  active,
  onChange,
}: {
  active: Pair;
  onChange: (p: Pair) => void;
}) {
  const chainId = useChainId();
  const pairs = pairsForChain(chainId);
  // Fallback to the canonical list when wagmi hasn't reported a chainId yet
  // (SSR / first paint). Filtering kicks in as soon as it resolves.
  const list = pairs.length > 0 ? pairs : PAIRS;
  return (
    <div
      role="tablist"
      className="flex items-stretch gap-2 px-3 sm:px-6 border-b border-line overflow-x-auto"
    >
      {list.map((p) => {
        const k = pairKey(p);
        const stats = DUMMY_STATS[k];
        const isActive = pairKey(active) === k;
        return (
          <button
            key={k}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(p)}
            className={`px-3 py-3 -mb-px border-b-2 transition-colors text-[13px] flex items-center gap-2.5 tnum ${
              isActive
                ? "border-accent text-fg"
                : "border-transparent text-fg-dim hover:text-fg"
            }`}
          >
            <span className="font-medium">{k}</span>
            {stats ? (
              <>
                <span
                  className={`font-mono ${isActive ? "text-fg" : "text-fg-dim"}`}
                >
                  {stats.price}
                </span>
                <span className={stats.positive ? "text-buy" : "text-sell"}>
                  {stats.change}
                </span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function usePair() {
  // Default to SCENT/JPYC — listed on every supported chain.
  return useState<Pair>({ base: "SCENT", quote: "JPYC" });
}
