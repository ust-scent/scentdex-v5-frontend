"use client";

import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";

import { deriveBestPrices, type BookApiOrder } from "@/lib/book";
import type { Pair } from "@/lib/tokens";

/**
 * Live best bid / best ask for a pair, polled from /api/orders on the same
 * 3-second cadence OrderBook uses. Feeds PlaceOrder's crossing-price
 * warning (E-10) — the board and the form are sibling components with no
 * shared store, so the form gets its own lightweight poll rather than a
 * page-level state lift that would touch every pair's layout.
 */
export function useBestPrices(pair: Pair): {
  bestAsk: number | null;
  bestBid: number | null;
} {
  const chainId = useChainId();
  // Own resting orders are excluded from the derived book top (bug_003):
  // the crossing warning must not fire against the user's own liquidity.
  const { address: account } = useAccount();
  const [orders, setOrders] = useState<BookApiOrder[]>([]);

  const pairKey = `${pair.base}/${pair.quote}`;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      try {
        const params = new URLSearchParams({ pair: pairKey });
        const res = await fetch(`/api/orders?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as { orders: BookApiOrder[] };
        if (cancelled) return;
        setOrders(data.orders);
      } catch {
        // Transient fetch failure — keep the previous book top; the next
        // poll tick will refresh it. A missing warning beats a crash here.
      } finally {
        if (!cancelled) {
          timer = setTimeout(fetchOnce, 3000);
        }
      }
    }
    fetchOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [pairKey]);

  return deriveBestPrices(orders, pair, chainId, account);
}
