"use client";

import { pairsForChain, PAIRS, type Pair } from "@/lib/tokens";
import { useState } from "react";
import { useChainId } from "wagmi";

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
