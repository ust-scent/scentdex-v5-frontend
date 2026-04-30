"use client";

import { PAIRS, type Pair } from "@/lib/tokens";
import { useState } from "react";

type Stats = { price: string; change: string; positive: boolean };

const DUMMY_STATS: Record<string, Stats> = {
  "SCENT/JPYC": { price: "12.4800", change: "+2.84%", positive: true },
  "SCENT/USDT": { price: "0.0832", change: "-1.21%", positive: false },
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
  return (
    <div
      role="tablist"
      className="flex items-stretch gap-2 px-3 sm:px-6 border-b border-line overflow-x-auto"
    >
      {PAIRS.map((p) => {
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
            <span className={`font-mono ${isActive ? "text-fg" : "text-fg-dim"}`}>
              {stats.price}
            </span>
            <span className={stats.positive ? "text-buy" : "text-sell"}>
              {stats.change}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function usePair() {
  return useState<Pair>(PAIRS[0]);
}
