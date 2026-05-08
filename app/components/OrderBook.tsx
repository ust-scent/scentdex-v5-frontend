"use client";

import { useOrderFillability } from "@/lib/hooks/useOrderFillability";
import {
  classifyCancelRate,
  useMakerStats,
} from "@/lib/hooks/useMakerStats";
import { TOKENS, type Pair } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Address } from "viem";
import { useAccount, useChainId } from "wagmi";
import { useTranslator } from "@/lib/locale-context";

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

type Row = {
  price: number;
  amount: number;
  total: number;
  partial: boolean;
  /** All makers contributing to this aggregated price level. Used to
   * compute reputation hints (e.g. "⚠ frequent canceller on this row"). */
  makers: Address[];
};

export function OrderBook({ pair }: { pair: Pair }) {
  const t = useTranslator();
  const chainId = useChainId();
  const { address: account } = useAccount();
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

  // Live "is this order actually fillable right now?" check.
  // Reads each maker's balance + Permit2 allowance via multicall and hides
  // any order where either has dropped below the sell amount, so takers
  // never burn gas on an order that's already dead.
  //
  // Exception: keep the connected maker's *own* orders visible even when
  // unfillable so they can see + cancel their order and take the action
  // (e.g. approve Permit2) needed to make it fillable. The unfillable
  // counter at the bottom still reflects the true count.
  const fillability = useOrderFillability(orders);

  const lowerAccount = account?.toLowerCase();
  const fillableOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (fillability.status[o.orderHash] !== "unfillable") return true;
        return Boolean(
          lowerAccount && o.order.maker.toLowerCase() === lowerAccount,
        );
      }),
    [orders, fillability.status, lowerAccount],
  );

  const ownUnfillableCount = useMemo(() => {
    if (!lowerAccount) return 0;
    return orders.reduce((acc, o) => {
      const isOwn = o.order.maker.toLowerCase() === lowerAccount;
      const isUnfillable = fillability.status[o.orderHash] === "unfillable";
      return acc + (isOwn && isUnfillable ? 1 : 0);
    }, 0);
  }, [orders, fillability.status, lowerAccount]);
  const othersUnfillableCount = Math.max(
    fillability.unfillableCount - ownUnfillableCount,
    0,
  );

  const { asks, bids, midPrice, spread, spreadBps } = useMemo(
    () => deriveBook(fillableOrders, pair, chainId),
    [fillableOrders, pair, chainId],
  );

  // Pull reputation for every maker visible in the (post-filter) book so we
  // can warn buyers about frequent cancellers before they spend gas.
  const visibleMakers = useMemo(() => {
    const set = new Set<Address>();
    for (const r of asks) for (const m of r.makers) set.add(m);
    for (const r of bids) for (const m of r.makers) set.add(m);
    return Array.from(set);
  }, [asks, bids]);
  const { stats: makerStats } = useMakerStats(visibleMakers);

  const empty = fillableOrders.length === 0;

  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
          {t("trade.orderBook.title")}
        </h2>
        <div className="text-[11px] text-fg-faint font-mono">
          {loading ? "loading…" : empty ? "empty" : "aggregated"}
        </div>
      </header>

      <div className="grid grid-cols-3 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        <div>{t("trade.placeOrder.price")} ({pair.quote})</div>
        <div className="text-right">{t("trade.placeOrder.amount")} ({pair.base})</div>
        <div className="text-right">{t("trade.placeOrder.total")} ({pair.base})</div>
      </div>

      {empty && !loading ? (
        <div className="px-4 py-12 text-center text-[13px] text-fg-faint whitespace-pre-line">
          {t("trade.orderBook.noOrders")}
        </div>
      ) : (
        <div className="font-mono text-[13px] leading-tight">
          {asks.map((r, i) => (
            <BookRow
              key={`ask-${i}`}
              row={r}
              side="sell"
              makerStats={makerStats}
            />
          ))}

          <div className="flex items-center justify-between px-4 py-3 border-y border-line bg-white/[0.015]">
            <span className="text-[18px] tnum">
              {midPrice ? midPrice.toFixed(4) : "—"}
            </span>
            <span className="text-[11px] text-fg-faint">
              {t("trade.orderBook.spread")}{" "}
              <span className="tnum text-fg-dim">
                {spread ? spread.toFixed(4) : "—"}
              </span>{" "}
              <span className="tnum">
                ({spreadBps ? spreadBps.toFixed(2) + "%" : "—"})
              </span>
            </span>
          </div>

          {bids.map((r, i) => (
            <BookRow
              key={`bid-${i}`}
              row={r}
              side="buy"
              makerStats={makerStats}
            />
          ))}
        </div>
      )}

      {othersUnfillableCount > 0 ? (
        <div
          className="px-4 py-2 text-[11px] text-fg-faint border-t border-line bg-white/[0.015] flex items-center gap-1.5"
          title={t("trade.orderBook.hiddenTooltip")}
        >
          <span aria-hidden="true">⚠</span>
          <span>
            {t("trade.orderBook.hidden")
              .replace("{count}", String(othersUnfillableCount))
              .replace("{orders}", othersUnfillableCount === 1 ? "order" : "orders")}
          </span>
        </div>
      ) : null}
    </section>
  );
}

function BookRow({
  row,
  side,
  makerStats,
}: {
  row: Row;
  side: "buy" | "sell";
  makerStats: Record<string, { cancelRate: number | undefined }>;
}) {
  const colour = side === "buy" ? "text-buy" : "text-sell";
  const bg = side === "buy" ? "bg-buy-soft" : "bg-sell-soft";

  // Reputation roll-up: take the worst (highest) cancel rate among makers
  // contributing to this aggregated price level.
  let worstCancelRate: number | undefined;
  for (const m of row.makers) {
    const r = makerStats[m.toLowerCase()]?.cancelRate;
    if (r === undefined) continue;
    if (worstCancelRate === undefined || r > worstCancelRate) worstCancelRate = r;
  }
  const cancelClass = classifyCancelRate(worstCancelRate);

  const reputationBadge =
    cancelClass === "ok" ? null : (
      <span
        title={`A maker on this row has cancelled ${
          worstCancelRate !== undefined
            ? `${Math.round(worstCancelRate * 100)}% of their orders`
            : "frequently"
        } — fills here are more likely to revert.`}
        className={`text-[9px] font-mono px-1 rounded ${
          cancelClass === "strong"
            ? "bg-sell/20 text-sell"
            : "bg-amber-500/15 text-amber-300"
        }`}
        aria-label="frequent canceller warning"
      >
        ⚠
      </span>
    );

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
        {reputationBadge}
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
      makers: [o.order.maker],
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
