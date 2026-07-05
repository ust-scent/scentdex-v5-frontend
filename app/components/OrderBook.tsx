"use client";

import { FillModal, type FillOrder } from "@/app/components/FillModal";
import { useOrderFillability } from "@/lib/hooks/useOrderFillability";
import {
  classifyCancelRate,
  useMakerStats,
} from "@/lib/hooks/useMakerStats";
import { formatPrice } from "@/lib/format-price";
import { TOKENS, symbolLabel, type Pair } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Address, type Hex } from "viem";
import { useAccount, useChainId } from "wagmi";
import { useTranslator } from "@/lib/locale-context";

/**
 * Order book — fetches signed orders from /api/orders, derives bids/asks
 * from each order's (makerToken, makerAmount, takerToken, takerAmount).
 *
 * Phase 3.5 (this round): each row is ONE order, not an aggregated price
 * level. Tap a row → FillModal → on-chain fillOrder(). Aggregation across
 * orders at the same price level is deferred (it's a depth-bar nicety,
 * not a fill-flow requirement, and aggregated rows can't carry the single
 * orderHash + maker permit2 signature the fill modal needs).
 */

type ApiOrder = {
  orderHash: Hex;
  pair: string;
  chainId: number;
  status: "open" | "partially-filled" | "filled" | "cancelled" | "expired";
  filledMakerAmount: string;
  filledTakerAmount: string;
  createdAt: number;
  signature: Hex;
  order: {
    maker: Address;
    makerToken: Address;
    takerToken: Address;
    makerAmount: string;
    takerAmount: string;
    expiry: string;
    nonce: string;
    salt: Hex;
    feeSide: Address;
    feeBps: number;
  };
  permitSingle?: FillOrder["permitSingle"];
  permitSignature?: Hex;
};

type Row = {
  price: number;
  amount: number;
  total: number;
  partial: boolean;
  maker: Address;
  apiOrder: ApiOrder;
};

export function OrderBook({ pair }: { pair: Pair }) {
  const t = useTranslator();
  const chainId = useChainId();
  const { address: account } = useAccount();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected order for the fill modal. `null` = closed.
  const [selected, setSelected] = useState<ApiOrder | null>(null);

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
  // (e.g. approve Permit2) needed to make it fillable.
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

  const { asks, bids, midPrice, spread, spreadBps, crossed } = useMemo(
    () => deriveBook(fillableOrders, pair, chainId),
    [fillableOrders, pair, chainId],
  );

  // Pull reputation for every visible maker so we can warn buyers about
  // frequent cancellers before they spend gas.
  const visibleMakers = useMemo(() => {
    const set = new Set<Address>();
    for (const r of asks) set.add(r.maker);
    for (const r of bids) set.add(r.maker);
    return Array.from(set);
  }, [asks, bids]);
  const { stats: makerStats } = useMakerStats(visibleMakers);

  const empty = fillableOrders.length === 0;

  return (
    <>
      <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
        <header className="flex items-center justify-between px-4 py-3 border-b border-line">
          <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
            {t("trade.orderBook.title")}
          </h2>
          <div className="text-[11px] text-fg-faint font-mono">
            {loading
              ? t("trade.orderBook.statusLoading")
              : empty
              ? t("trade.orderBook.statusEmpty")
              : t("trade.orderBook.statusAggregated")}
          </div>
        </header>

        <div className="grid grid-cols-3 px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint">
          <div>
            {t("trade.placeOrder.price")} ({symbolLabel(pair.quote)})
          </div>
          <div className="text-right">
            {t("trade.placeOrder.amount")} ({symbolLabel(pair.base)})
          </div>
          <div className="text-right">
            {t("trade.placeOrder.total")} ({symbolLabel(pair.base)})
          </div>
        </div>

        {empty && !loading ? (
          <div className="px-4 py-12 text-center text-[13px] text-fg-faint whitespace-pre-line">
            {t("trade.orderBook.noOrders")}
          </div>
        ) : (
          <div className="font-mono text-[13px] leading-tight">
            {asks.map((r) => (
              <BookRow
                key={`ask-${r.apiOrder.orderHash}`}
                row={r}
                side="sell"
                makerStats={makerStats}
                isOwn={
                  Boolean(lowerAccount) &&
                  r.maker.toLowerCase() === lowerAccount
                }
                onClick={() => setSelected(r.apiOrder)}
              />
            ))}

            {crossed ? (
              <div className="flex items-center gap-2 px-4 py-3 border-y border-amber-500/40 bg-amber-500/10 text-[12px] text-amber-200">
                <span aria-hidden="true">⚠</span>
                <span>{t("trade.orderbook.crossedWarning")}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between px-4 py-3 border-y border-line bg-white/[0.015]">
                <span className="text-[18px] tnum">{formatPrice(midPrice)}</span>
                <span className="text-[11px] text-fg-faint">
                  {t("trade.orderBook.spread")}{" "}
                  <span className="tnum text-fg-dim">{formatPrice(spread)}</span>{" "}
                  <span className="tnum">
                    ({spreadBps !== null ? spreadBps.toFixed(2) + "%" : "—"})
                  </span>
                </span>
              </div>
            )}

            {bids.map((r) => (
              <BookRow
                key={`bid-${r.apiOrder.orderHash}`}
                row={r}
                side="buy"
                makerStats={makerStats}
                isOwn={
                  Boolean(lowerAccount) &&
                  r.maker.toLowerCase() === lowerAccount
                }
                onClick={() => setSelected(r.apiOrder)}
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
                .replace(
                  "{orders}",
                  othersUnfillableCount === 1 ? "order" : "orders",
                )}
            </span>
          </div>
        ) : null}
      </section>

      <FillModal
        open={selected !== null}
        order={selected as FillOrder | null}
        onClose={() => setSelected(null)}
        onFilled={() => {
          // Trigger a fresh fetch on next tick so the row disappears.
          setSelected(null);
        }}
      />
    </>
  );
}

function BookRow({
  row,
  side,
  makerStats,
  isOwn,
  onClick,
}: {
  row: Row;
  side: "buy" | "sell";
  makerStats: Record<string, { cancelRate: number | undefined }>;
  isOwn: boolean;
  onClick: () => void;
}) {
  const t = useTranslator();
  const colour = side === "buy" ? "text-buy" : "text-sell";
  const bg = side === "buy" ? "bg-buy-soft" : "bg-sell-soft";

  const r = makerStats[row.maker.toLowerCase()]?.cancelRate;
  const cancelClass = classifyCancelRate(r);
  const reputationBadge =
    cancelClass === "ok" ? null : (
      <span
        title={
          r !== undefined
            ? t("trade.orderBook.cancellerWarnPct").replace(
                "{pct}",
                String(Math.round(r * 100)),
              )
            : t("trade.orderBook.cancellerWarnOften")
        }
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
    <button
      type="button"
      onClick={onClick}
      disabled={isOwn}
      className={`relative grid grid-cols-3 px-4 py-1 w-full text-left ${
        isOwn ? "opacity-60 cursor-not-allowed" : "hover:bg-white/[0.04] cursor-pointer"
      }`}
      title={isOwn ? "Your own order — use Cancel from My Orders" : "Tap to fill"}
    >
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
        <span>{formatPrice(row.price)}</span>
        {reputationBadge}
        {isOwn ? (
          <span className="text-[9px] font-mono px-1 rounded bg-white/[0.06] text-fg-faint">
            you
          </span>
        ) : null}
      </div>
      <div className="relative text-right tnum text-fg-dim">
        {row.amount.toFixed(2)}
      </div>
      <div className="relative text-right tnum text-fg-dim">
        {row.total.toFixed(2)}
      </div>
    </button>
  );
}

function deriveBook(orders: ApiOrder[], pair: Pair, chainId: number) {
  const baseToken = TOKENS.find((t) => t.symbol === pair.base);
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote);
  if (!baseToken || !quoteToken) {
    return {
      asks: [],
      bids: [],
      midPrice: null,
      spread: null,
      spreadBps: null,
      crossed: false,
    };
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
      isSell = o.order.feeSide.toLowerCase() === mt;
    } else {
      continue;
    }

    const baseDecimals = baseToken.decimals;
    const quoteDecimals = quoteToken.decimals;

    // Partial fills: the board must show what's still buyable (remaining),
    // not the original size. Price stays the order's constant unit price
    // (computed from the FULL amounts), only the displayed quantity shrinks.
    const filledMaker = BigInt(o.filledMakerAmount ?? "0");
    const remainingMaker =
      makerAmount > filledMaker ? makerAmount - filledMaker : 0n;
    if (remainingMaker === 0n) continue; // fully filled — nothing left to show

    let amount: number;
    let price: number;
    if (isSell) {
      const fullBase = Number(formatUnits(makerAmount, baseDecimals));
      price = Number(formatUnits(takerAmount, quoteDecimals)) / fullBase;
      amount = Number(formatUnits(remainingMaker, baseDecimals));
    } else {
      const fullBase = Number(formatUnits(takerAmount, baseDecimals));
      price = Number(formatUnits(makerAmount, quoteDecimals)) / fullBase;
      // remaining base = takerAmount × remainingMaker / makerAmount
      const remainingBase = (takerAmount * remainingMaker) / makerAmount;
      amount = Number(formatUnits(remainingBase, baseDecimals));
    }

    const row: Row = {
      price,
      amount,
      total: amount,
      partial: o.status === "partially-filled",
      maker: o.order.maker,
      apiOrder: o,
    };
    (isSell ? asks : bids).push(row);
  }

  // Sort so both sides converge on best-price toward the centre spread —
  // standard DEX order-book layout (Binance, Uniswap, 1inch, 0x, …):
  //   asks (descending): top row = highest ask, bottom row = best ask
  //   bids (descending): top row = best bid, bottom row = lowest bid
  // Reading down the asks → up the bids therefore tracks falling price
  // through the spread continuously.
  asks.sort((a, b) => b.price - a.price);
  bids.sort((a, b) => b.price - a.price);

  // Cumulative totals for the depth bars. Both sides accumulate AWAY
  // from the centre spread so the bar visually grows as you move toward
  // worse prices. For asks: walk bottom→top (best ask is at the bottom);
  // for bids: walk top→bottom (best bid is at the top).
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

  // Best prices sit adjacent to the spread: best ask = last asks row
  // (bottom of the asks block), best bid = first bids row (top of the
  // bids block).
  const bestAsk = asks[asks.length - 1]?.price ?? null;
  const bestBid = bids[0]?.price ?? null;
  // A crossed book (bestAsk < bestBid) is structurally an open arbitrage
  // — signed-order DEX semantics mean the wires don't auto-match, so the
  // condition can persist until a taker (or a keeper bot) fills both
  // legs. We surface it as a banner instead of computing a negative
  // spread / nonsensical mid, which would otherwise read as a real
  // market level.
  const crossed =
    bestAsk !== null && bestBid !== null && bestAsk < bestBid;
  const midPrice = crossed
    ? null
    : bestAsk !== null && bestBid !== null
      ? (bestAsk + bestBid) / 2
      : bestAsk ?? bestBid;
  const spread =
    !crossed && bestAsk !== null && bestBid !== null
      ? bestAsk - bestBid
      : null;
  const spreadBps =
    spread !== null && midPrice ? (spread / midPrice) * 100 : null;

  return { asks, bids, midPrice, spread, spreadBps, crossed };
}
