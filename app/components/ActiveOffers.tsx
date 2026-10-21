"use client";

import { FillModal, type FillOrder } from "@/app/components/FillModal";
import { useOrderFillability } from "@/lib/hooks/useOrderFillability";
import { formatPrice } from "@/lib/format-price";
import { TOKENS, type Pair } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import { formatUnits, type Address, type Hex } from "viem";
import { useAccount, useChainId } from "wagmi";
import { useTranslator } from "@/lib/locale-context";

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

type Card = {
  apiOrder: ApiOrder;
  side: "sell" | "buy";
  amount: number;
  price: number;
  filledPct: number;
  createdAtMs: number;
  maker: Address;
};

export function ActiveOffers({ pair }: { pair: Pair }) {
  const t = useTranslator();
  const chainId = useChainId();
  const { address: account } = useAccount();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ApiOrder | null>(null);
  const [now, setNow] = useState(() => Date.now());

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

  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(tick);
  }, []);

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

  const cards = useMemo(
    () => deriveCards(fillableOrders, pair, chainId),
    [fillableOrders, pair, chainId],
  );

  return (
    <section className="mt-4 mx-3 sm:mx-6">
      <header className="mb-3">
        <h2 className="text-[16px] font-medium text-fg">
          {t("activeOffers.heading")}
        </h2>
        <p className="text-[12px] text-fg-faint mt-0.5">
          {t("activeOffers.subtext")}
        </p>
      </header>

      {!loading && cards.length === 0 ? (
        <div className="rounded-lg border border-line bg-bg-soft px-4 py-12 text-center">
          <div className="text-[14px] text-fg-dim">
            {t("activeOffers.empty.title")}
          </div>
          <div className="text-[12px] text-fg-faint mt-1">
            {t("activeOffers.empty.body")}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {cards.map((c) => (
            <OfferCard
              key={c.apiOrder.orderHash}
              card={c}
              pair={pair}
              isOwn={
                Boolean(lowerAccount) &&
                c.maker.toLowerCase() === lowerAccount
              }
              now={now}
              onClick={() => setSelected(c.apiOrder)}
            />
          ))}
        </div>
      )}

      <FillModal
        open={selected !== null}
        order={selected as FillOrder | null}
        onClose={() => setSelected(null)}
        onFilled={() => setSelected(null)}
      />
    </section>
  );
}

function OfferCard({
  card,
  pair,
  isOwn,
  now,
  onClick,
}: {
  card: Card;
  pair: Pair;
  isOwn: boolean;
  now: number;
  onClick: () => void;
}) {
  const t = useTranslator();
  const isSell = card.side === "sell";

  const badgeBg = isSell ? "bg-emerald-500/15" : "bg-rose-500/15";
  const badgeFg = isSell ? "text-emerald-300" : "text-rose-300";
  const badgeBorder = isSell ? "border-emerald-500/30" : "border-rose-500/30";
  const badgeText = isSell
    ? t("activeOffers.badge.sell")
    : t("activeOffers.badge.buy");

  const ageMs = Math.max(now - card.createdAtMs, 0);
  const ageLabel = formatAge(ageMs, t);
  const filledLabel =
    card.filledPct > 0
      ? t("activeOffers.label.filled").replace(
          "{pct}",
          card.filledPct.toFixed(0),
        )
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isOwn}
      title={isOwn ? t("activeOffers.disabled.own") : undefined}
      className={`relative text-left rounded-lg border border-line bg-bg-soft p-4 transition-colors ${
        isOwn
          ? "opacity-60 cursor-not-allowed"
          : "hover:border-line-strong hover:bg-white/[0.02] cursor-pointer"
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-medium tracking-wider border ${badgeBg} ${badgeFg} ${badgeBorder}`}
        >
          {badgeText}
        </span>
        <span className="text-[10px] text-fg-faint">{ageLabel}</span>
      </div>

      <div className="mb-1">
        <div className="text-[18px] font-medium tnum text-fg">
          {card.amount.toFixed(2)}{" "}
          <span className="text-[13px] text-fg-dim font-normal">
            {pair.base}
          </span>
        </div>
        <div className="text-[13px] text-fg-dim tnum mt-0.5">
          @ {formatPrice(card.price)}{" "}
          <span className="text-fg-faint font-normal">{pair.quote}</span>
        </div>
      </div>

      {filledLabel ? (
        <div className="text-[11px] text-fg-faint mt-2">{filledLabel}</div>
      ) : null}

      <div className="text-[11px] text-fg-faint mt-2 font-mono">
        {t("activeOffers.label.maker")} {truncateAddress(card.maker)}
        {isOwn ? (
          <span className="ml-1.5 px-1 rounded bg-white/[0.06]">you</span>
        ) : null}
      </div>

      <div className="mt-3 pt-3 border-t border-line">
        <span
          className={`block w-full text-center text-[12px] font-medium py-2 rounded-md ${
            isOwn
              ? "bg-white/[0.03] text-fg-faint"
              : "bg-white/[0.06] text-fg group-hover:bg-white/[0.10]"
          }`}
        >
          {isOwn
            ? t("activeOffers.disabled.own")
            : t("activeOffers.button.take")}
        </span>
      </div>
    </button>
  );
}

function deriveCards(
  orders: ApiOrder[],
  pair: Pair,
  chainId: number,
): Card[] {
  const baseToken = TOKENS.find((t) => t.symbol === pair.base);
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote);
  if (!baseToken || !quoteToken) return [];

  const baseAddr = (baseToken.addresses[chainId] ?? "").toLowerCase();
  const quoteAddr = (quoteToken.addresses[chainId] ?? "").toLowerCase();

  const sells: Card[] = [];
  const buys: Card[] = [];

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

    const filledRaw = BigInt(o.filledMakerAmount);
    const filledPct =
      makerAmount > 0n ? Number((filledRaw * 10000n) / makerAmount) / 100 : 0;

    const card: Card = {
      apiOrder: o,
      side: isSell ? "sell" : "buy",
      amount,
      price,
      filledPct,
      createdAtMs: o.createdAt * 1000,
      maker: o.order.maker,
    };
    (isSell ? sells : buys).push(card);
  }

  // Best price first per side, then concatenate sells → buys.
  // - Sells: lowest ask first (best for the taker buying SCENT)
  // - Buys:  highest bid first (best for the taker selling SCENT)
  sells.sort((a, b) => a.price - b.price);
  buys.sort((a, b) => b.price - a.price);

  return [...sells, ...buys];
}

function formatAge(
  ms: number,
  t: ReturnType<typeof useTranslator>,
): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return t("activeOffers.label.ago_just_now");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return t("activeOffers.label.ago_minutes").replace("{n}", String(minutes));
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return t("activeOffers.label.ago_hours").replace("{n}", String(hours));
  }
  const days = Math.floor(hours / 24);
  return t("activeOffers.label.ago_days").replace("{n}", String(days));
}

function truncateAddress(addr: Address): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
