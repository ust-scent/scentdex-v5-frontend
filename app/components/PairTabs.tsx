"use client";

import { pairsForChain, PAIRS, type Pair } from "@/lib/tokens";
import { useEffect, useState } from "react";
import { useChainId } from "wagmi";

function pairKey(p: Pair) {
  return `${p.base}/${p.quote}`;
}

/**
 * Resolve a `?pair=` query value (e.g. "SDT-WETH" or "SDT/WETH") to a known
 * pair. Used by the /sdt → /trade redirect to preselect the right tab. Returns
 * null for anything not in PAIRS so a stale link can't select a dead market.
 */
function parsePairParam(raw: string | null): Pair | null {
  if (!raw) return null;
  const key = raw.replace("-", "/").toUpperCase();
  return PAIRS.find((p) => pairKey(p).toUpperCase() === key) ?? null;
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

export function usePair(): [Pair, (next: Pair) => void] {
  const chainId = useChainId();
  // Default to the first canonical pair — SDT/WETH, the mainnet flagship.
  const [pair, setPair] = useState<Pair>(PAIRS[0]);

  // Honor `?pair=` once on mount. This is how the legacy /sdt route lands
  // users on the correct /trade tab after it redirects here.
  useEffect(() => {
    const parsed = parsePairParam(
      new URLSearchParams(window.location.search).get("pair"),
    );
    if (parsed) setPair(parsed);
  }, []);

  // Keep the active pair tradable on the connected chain. SDT/WETH is
  // mainnet-only, so on Sepolia (or before wagmi reports a chainId) snap to
  // the first pair that actually lists on this chain. Functional update keeps
  // `pair` out of the deps so this only re-runs on a real chain change.
  useEffect(() => {
    const avail = pairsForChain(chainId);
    if (avail.length === 0) return;
    setPair((cur) =>
      avail.some((p) => pairKey(p) === pairKey(cur)) ? cur : avail[0],
    );
  }, [chainId]);

  return [pair, setPair];
}
