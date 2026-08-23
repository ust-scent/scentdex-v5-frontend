"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatUnits } from "viem";
import { useChainId } from "wagmi";

import { useFillEvents } from "@/lib/hooks/useFillEvents";
import { TOKENS, pairKey, type Pair } from "@/lib/tokens";

/**
 * Trade tape for the Recent Trades panel — deeper than the 24h stats window.
 *
 * Two sources, unioned:
 *
 *  1. `/api/trades` — the off-chain `order_events` fill log. One indexed query,
 *     no block-range ceiling, carries the tx hash and a server-recorded
 *     timestamp. This is what lets the panel show a month of history instead
 *     of the handful of fills that happen to land inside 24h.
 *  2. `useFillEvents` — the on-chain OrderFilled index (~24h). Already fetched
 *     for the StatsBar, so react-query serves it from cache: joining it here
 *     costs no extra RPC. It covers the one thing the book cannot see — a fill
 *     submitted straight to the contract by an external client, which never
 *     reports back through `POST /api/orders/[hash]/filled`.
 *
 * Neither source alone is complete: (1) misses externally-executed fills,
 * (2) misses everything older than a day. De-duplication is on
 * (txHash, orderHash) because a single tx can settle several orders.
 *
 * The 24h aggregates (volume / high / low / change) deliberately do NOT come
 * from here — they stay on `useFillEvents`, scoped to its 24h window. Widening
 * the tape must never widen the numbers labelled "24H".
 */

export type Trade = {
  /** Stable render + de-duplication key: `${txHash}:${orderHash}`. */
  key: string;
  txHash: string | null;
  /** Quote per base, decimal-aware. */
  price: number;
  baseAmount: number;
  quoteAmount: number;
  /** "buy" if the taker received base, "sell" if the taker delivered base. */
  side: "buy" | "sell";
  /** Unix seconds. Absolute so both sources sort against one basis. */
  atSec: number;
  /** Seconds since the fill, derived at render time from `atSec`. */
  ageSec: number;
};

export type TradeHistory = {
  trades: Trade[];
  loading: boolean;
};

type TradeRow = {
  orderHash: string;
  txHash: string | null;
  blockNumber: number | null;
  at: number;
  makerToken: string;
  takerToken: string;
  fillMakerAmount: string;
  fillTakerAmount: string;
};

/** Fill log rows plus the clock reading taken when they were fetched. */
type BookPayload = { fetchedAt: number; rows: TradeRow[] };

export function useTradeHistory(pair: Pair, limit: number): TradeHistory {
  const chainId = useChainId();

  const baseToken = TOKENS.find((t) => t.symbol === pair.base);
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote);
  const baseAddr = baseToken?.addresses[chainId]?.toLowerCase();
  const quoteAddr = quoteToken?.addresses[chainId]?.toLowerCase();

  const key = pairKey(pair);

  const { data: book, isLoading: bookLoading } = useQuery<BookPayload>({
    queryKey: ["scentdex.trades", chainId, key, limit],
    enabled: Boolean(baseToken && quoteToken && baseAddr && quoteAddr),
    // Matches the on-chain index's cadence so the two halves of the tape
    // don't visibly lag each other.
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const res = await fetch(
        `/api/trades?pair=${encodeURIComponent(key)}&chainId=${chainId}&limit=${limit}`,
      );
      // Stamped here rather than at render: the clock is impure, and a value
      // read during render would drift on every unrelated re-render. Ages are
      // therefore accurate to within one refetch interval — the same accuracy
      // the on-chain index has always had.
      const fetchedAt = Math.floor(Date.now() / 1000);
      if (!res.ok) return { fetchedAt, rows: [] };
      const { trades } = (await res.json()) as { trades: TradeRow[] };
      return { fetchedAt, rows: trades ?? [] };
    },
  });

  // Same query key as the StatsBar's call → served from the react-query cache,
  // no additional getLogs traffic.
  const onChain = useFillEvents(pair);

  return useMemo<TradeHistory>(() => {
    if (!baseToken || !quoteToken || !baseAddr || !quoteAddr) {
      return { trades: [], loading: false };
    }

    const byKey = new Map<string, Trade>();

    // Book first: it owns the tx hash and a real recorded timestamp, so when
    // the same fill appears in both sources this is the copy we want to keep.
    for (const row of book?.rows ?? []) {
      const derived = derive(
        row.makerToken,
        row.takerToken,
        row.fillMakerAmount,
        row.fillTakerAmount,
        baseAddr,
        quoteAddr,
        baseToken.decimals,
        quoteToken.decimals,
      );
      if (!derived) continue;
      const k = dedupeKey(row.txHash, row.orderHash);
      byKey.set(k, {
        key: k,
        txHash: row.txHash,
        ...derived,
        atSec: row.at,
        ageSec: Math.max(0, (book?.fetchedAt ?? row.at) - row.at),
      });
    }

    for (const fill of onChain.fills) {
      const k = dedupeKey(fill.txHash, fill.orderHash);
      if (byKey.has(k)) continue;
      byKey.set(k, {
        key: k,
        txHash: fill.txHash,
        price: fill.price,
        baseAmount: fill.baseAmount,
        quoteAmount: fill.quoteAmount,
        side: fill.side,
        atSec: fill.atSec,
        ageSec: fill.ageSec,
      });
    }

    const trades = Array.from(byKey.values())
      .sort((a, b) => b.atSec - a.atSec)
      .slice(0, limit);

    return {
      trades,
      // Only "loading" while BOTH sources are still cold — one of them
      // returning early is enough to start rendering rows.
      loading: trades.length === 0 && (bookLoading || onChain.loading),
    };
  }, [
    book,
    bookLoading,
    onChain.fills,
    onChain.loading,
    baseToken,
    quoteToken,
    baseAddr,
    quoteAddr,
    limit,
  ]);
}

function dedupeKey(txHash: string | null, orderHash: string): string {
  return `${(txHash ?? "").toLowerCase()}:${orderHash.toLowerCase()}`;
}

/**
 * Resolve a fill's base/quote orientation. Mirrors the logic in
 * `useFillEvents` — the maker/taker token pair tells us which side the taker
 * was on. Returns undefined when the fill isn't for this pair at all.
 */
function derive(
  makerToken: string,
  takerToken: string,
  fillMakerAmount: string,
  fillTakerAmount: string,
  baseAddr: string,
  quoteAddr: string,
  baseDecimals: number,
  quoteDecimals: number,
):
  | Pick<Trade, "price" | "baseAmount" | "quoteAmount" | "side">
  | undefined {
  const mt = makerToken.toLowerCase();
  const tt = takerToken.toLowerCase();

  let makerAmount: bigint;
  let takerAmount: bigint;
  try {
    makerAmount = BigInt(fillMakerAmount);
    takerAmount = BigInt(fillTakerAmount);
  } catch {
    return undefined;
  }

  let baseAmount: number;
  let quoteAmount: number;
  let side: "buy" | "sell";

  if (mt === baseAddr && tt === quoteAddr) {
    baseAmount = Number(formatUnits(makerAmount, baseDecimals));
    quoteAmount = Number(formatUnits(takerAmount, quoteDecimals));
    side = "buy";
  } else if (mt === quoteAddr && tt === baseAddr) {
    baseAmount = Number(formatUnits(takerAmount, baseDecimals));
    quoteAmount = Number(formatUnits(makerAmount, quoteDecimals));
    side = "sell";
  } else {
    return undefined;
  }

  if (baseAmount <= 0) return undefined;
  return { price: quoteAmount / baseAmount, baseAmount, quoteAmount, side };
}
