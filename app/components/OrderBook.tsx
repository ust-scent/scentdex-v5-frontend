"use client";

import { TOKENS, type Pair } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Address } from "viem";
import { useChainId } from "wagmi";

/**
 * Order book — fetches signed orders from /api/orders, derives bids/asks
 * from each order's (makerToken, makerAmount, takerToken, takerAmount).
 *
 * Phase 3.3: client polls /api/orders every 3s. Phase 3.5 will switch
 * to a single websocket subscription via the indexer.
 */

type ApiOrder = {
  orderHash: string;
  pair: string;
  chainId: number;
  status: "open" | "partially-filled" | "filled" | "cancelled" | "expired";
  filledMakerAmount: string;
  filledTakerAmount: string;
  createdAt: number;
  order: {
    maker: Address;
    makerToken: Address;
    takerToken: Address;
    makerAmount: string;
    takerAmount: string;
    expiry: string;
    nonce: string;
    salt: `0x${string}`;
    feeSide: Address;
    feeBps: number;
  };
};

type Row = { price: number; amount: number; total: number; partial: boolean };

export function OrderBook({ pair }: { pair: Pair }) {
  const chainId = useChainId();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const pairKey = `${pair.base}/${pair.quote}`;

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      try {
        const params = new URLSearchParams({ pair: pairKey });
        const res = await fetch(`/api/orders?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as { orders: ApiOrder[] };
        if (cancelled) return;
        setOrders(data.orders);
      } finally {
        if (!cancelled) {
          setLoading(false);
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

  const { asks, bids, midPrice, spread, spreadBps } = useMemo(
    () => deriveBook(orders, pair, chainId),
    [orders, pair, chainId],
  );

  const empty = orders.length === 0;

  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
          Order Book
        </h2>
        <div className="text-[11px] text-fg-faint font-mono">
          {loading ? "loading…" : empty ? "empty" : "aggregated"}
        </div>
      </header>

      <div className="grid grid-cols-3 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        <div>Price ({pair.quote})</div>
        <div className="text-right">Amount ({pair.base})</div>
        <div className="text-right">Total ({pair.base})</div>
      </div>

      {empty && !loading ? (
        <div className="px-4 py-12 text-center text-[13px] text-fg-faint">
          No orders for this pair yet.
          <br />
          Be the first to place a signed order.
        </div>
      ) : (
        <div className="font-mono text-[13px] leading-tight">
          {asks.map((r, i) => (
            <BookRow key={`ask-${i}`} row={r} side="sell" />
          ))}

          <div className="flex items-center justify-between px-4 py-3 border-y border-line bg-white/[0.015]">
            <span className="text-[18px] tnum">
              {midPrice ? midPrice.toFixed(4) : "—"}
            </span>
            <span className="text-[11px] text-fg-faint">
              Spread{" "}
              <span className="tnum text-fg-dim">
                {spread ? spread.toFixed(4) : "—"}
              </span>{" "}
              <span className="tnum">
                ({spreadBps ? spreadBps.toFixed(2) + "%" : "—"})
              </span>
            </span>
          </div>

          {bids.map((r, i) => (
            <BookRow key={`bid-${i}`} row={r} side="buy" />
          ))}
        </div>
      )}
    </section>
  );
}

function BookRow({ row, side }: { row: Row; side: "buy" | "sell" }) {
  const colour = side === "buy" ? "text-buy" : "text-sell";
  const bg = side === "buy" ? "bg-buy-soft" : "bg-sell-soft";

  return (
    <div className="relative grid grid-cols-3 px-4 py-1 hover:bg-white/[0.02] cursor-pointer">
      <div
        className={`absolute inset-y-0 right-0 ${bg} pointer-events-none`}
        style={{ width: `${Math.min(row.total / 70, 100)}%` }}
      />
      <div className={`relative flex items-center gap-1.5 ${colour} tnum`}>
        {row.partial ? (
          <span
            className="w-1 h-1 rounded-full bg-current"
            aria-hidden="true"
          />
        ) : null}
        <span>{row.price.toFixed(4)}</span>
      </div>
      <div className="relative text-right tnum text-fg-dim">
        {row.amount.toFixed(2)}
      </div>
      <div className="relative text-right tnum text-fg-dim">
        {row.total.toFixed(2)}
      </div>
    </div>
  );
}

function deriveBook(orders: ApiOrder[], pair: Pair, chainId: number) {
  const baseToken = TOKENS.find((t) => t.symbol === pair.base);
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote);
  if (!baseToken || !quoteToken) {
    return { asks: [], bids: [], midPrice: null, spread: null, spreadBps: null };
  }

  const baseAddr = (baseToken.addresses[chainId] ?? "").toLowerCase();
  const quoteAddr = (quoteToken.addresses[chainId] ?? "").toLowerCase();

  const asks: Row[] = [];
  const bids: Row[] = [];

  for (const o of orders) {
    if (o.status !== "open" && o.status !== "partially-filled") continue;
    const mt = o.order.makerToken.toLowerCase();
    const tt = o.order.takerToken.toLowerCase();

    const makerAmount = BigInt(o.order.makerAmount);
    const takerAmount = BigInt(o.order.takerAmount);

    if (makerAmount === 0n || takerAmount === 0n) continue;

    let isSell: boolean;
    if (baseAddr && mt === baseAddr && tt === quoteAddr) {
      isSell = true;
    } else if (baseAddr && mt === quoteAddr && tt === baseAddr) {
      isSell = false;
    } else if (!baseAddr && !quoteAddr) {
      // Tokens not configured for this chain. Render best-effort using whatever
      // the order says about itself: classify by feeSide.
      isSell = o.order.feeSide.toLowerCase() === mt;
    } else {
      continue; // Order doesn't match the displayed pair on this chain.
    }

    const baseDecimals = baseToken.decimals;
    const quoteDecimals = quoteToken.decimals;

    let amount: number;
    let price: number;
    if (isSell) {
      amount = Number(formatUnits(makerAmount, baseDecimals));
      const quote = Number(formatUnits(takerAmount, quoteDecimals));
      price = quote / amount;
    } else {
      amount = Number(formatUnits(takerAmount, baseDecimals));
      const quote = Number(formatUnits(makerAmount, quoteDecimals));
      price = quote / amount;
    }

    const row: Row = {
      price,
      amount,
      total: amount,
      partial: o.status === "partially-filled",
    };
    (isSell ? asks : bids).push(row);
  }

  // Sort: asks ascending price (top of book at top), bids descending price
  asks.sort((a, b) => a.price - b.price);
  bids.sort((a, b) => b.price - a.price);

  // Aggregate cumulative totals (used for depth bars)
  let cum = 0;
  for (let i = asks.length - 1; i >= 0; i--) {
    cum += asks[i].amount;
    asks[i].total = cum;
  }
  cum = 0;
  for (const b of bids) {
    cum += b.amount;
    b.total = cum;
  }

  const bestAsk = asks[0]?.price ?? null;
  const bestBid = bids[0]?.price ?? null;
  const midPrice =
    bestAsk !== null && bestBid !== null
      ? (bestAsk + bestBid) / 2
      : bestAsk ?? bestBid;
  const spread =
    bestAsk !== null && bestBid !== null ? bestAsk - bestBid : null;
  const spreadBps =
    spread !== null && midPrice ? (spread / midPrice) * 100 : null;

  return { asks, bids, midPrice, spread, spreadBps };
}
