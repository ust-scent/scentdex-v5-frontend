"use client";

import { useTranslator } from "@/lib/locale-context";
import { useTokenStatus } from "@/lib/hooks/useTokenStatus";
import { useOrderFillability } from "@/lib/hooks/useOrderFillability";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { TOKENS, type Token } from "@/lib/tokens";
import { useEffect, useMemo, useState } from "react";
import {
  formatUnits,
  type Address,
  type Hex,
} from "viem";
import { useAccount, useChainId, useSignTypedData } from "wagmi";

type Tab = "orders" | "history" | "permit2";

type ApiOrder = {
  orderHash: string;
  pair: string;
  chainId: number;
  status: "open" | "partially-filled" | "filled" | "cancelled" | "expired";
  filledMakerAmount: string;
  filledTakerAmount: string;
  createdAt: number;
  signature: string;
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

const ACTIVE_STATUSES = new Set(["open", "partially-filled"]);
const HISTORICAL_STATUSES = new Set(["filled", "cancelled", "expired"]);

function useMyOrders(chainId: number) {
  const { address } = useAccount();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  const refresh = () => setTick((n) => n + 1);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const lower = address?.toLowerCase();

    async function fetchOnce() {
      if (cancelled) return;
      if (!lower) {
        setOrders([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(
          `/api/orders?chainId=${chainId}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { orders: ApiOrder[] };
        if (cancelled) return;
        setOrders(
          data.orders.filter((o) => o.order.maker.toLowerCase() === lower),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
          if (lower) timer = setTimeout(fetchOnce, 3000);
        }
      }
    }
    fetchOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [address, chainId, tick]);

  return { orders, loading, refresh };
}

export function BottomTabs() {
  const t = useTranslator();
  const chainId = useChainId();
  const [tab, setTab] = useState<Tab>("orders");
  const { orders, loading, refresh } = useMyOrders(chainId);

  const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
  const historicalCount = orders.filter((o) =>
    HISTORICAL_STATUSES.has(o.status),
  ).length;

  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-3 pt-3 border-b border-line">
        <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} count={activeCount}>
          {t("trade.tabs.orders")}
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} count={historicalCount}>
          {t("trade.tabs.history")}
        </TabBtn>
        <TabBtn active={tab === "permit2"} onClick={() => setTab("permit2")}>
          {t("trade.tabs.approvedTokens")}
        </TabBtn>
      </div>

      {tab === "orders" ? (
        <MyOrders orders={orders} loading={loading} onChanged={refresh} />
      ) : null}
      {tab === "history" ? <History orders={orders} loading={loading} /> : null}
      {tab === "permit2" ? <Permit2 /> : null}
    </section>
  );
}

function TabBtn({
  children,
  active,
  onClick,
  count,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-4 py-2.5 -mb-px border-b-2 transition-colors text-[13px] uppercase tracking-[0.1em] ${
        active
          ? "border-accent text-fg"
          : "border-transparent text-fg-dim hover:text-fg"
      }`}
    >
      {children}
      {count !== undefined ? (
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.05] tabular-nums">
          {count}
        </span>
      ) : null}
    </button>
  );
}

function MyOrders({
  orders,
  loading,
  onChanged,
}: {
  orders: ApiOrder[];
  loading: boolean;
  onChanged: () => void;
}) {
  const t = useTranslator();
  const { isConnected } = useAccount();
  const [historical, setHistorical] = useState(false);

  const visible = useMemo(
    () =>
      orders.filter((o) =>
        historical ? HISTORICAL_STATUSES.has(o.status) : ACTIVE_STATUSES.has(o.status),
      ),
    [orders, historical],
  );
  const activeCount = orders.filter((o) => ACTIVE_STATUSES.has(o.status)).length;
  const historicalCount = orders.filter((o) =>
    HISTORICAL_STATUSES.has(o.status),
  ).length;

  // Fillability for the Active list, so we can flag orders that are signed
  // but not actually fillable yet (typically: maker hasn't approved Permit2).
  const fillability = useOrderFillability(
    visible.filter((o) => ACTIVE_STATUSES.has(o.status)),
  );

  if (!isConnected) {
    return (
      <div className="px-4 py-12 text-center text-[13px] text-fg-faint">
        {t("trade.myOrders.connect")}
      </div>
    );
  }

  return (
    <div>
      <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-line">
        <div className="flex items-center gap-1">
          <SubTab active={!historical} onClick={() => setHistorical(false)}>
            {t("trade.myOrders.active").replace("{count}", String(activeCount))}
          </SubTab>
          <SubTab active={historical} onClick={() => setHistorical(true)}>
            {t("trade.myOrders.historical").replace("{count}", String(historicalCount))}
          </SubTab>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="px-4 py-12 text-center text-[13px] text-fg-faint">
          {loading
            ? t("trade.myOrders.loading")
            : historical
            ? t("trade.myOrders.emptyHistorical")
            : t("trade.myOrders.empty")}
        </div>
      ) : (
        <>
          {/* Desktop table header */}
          <div className="hidden md:grid grid-cols-[1fr_80px_140px_1fr_140px_100px] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint border-b border-line">
            <div>{t("trade.myOrders.pair")}</div>
            <div>{t("trade.myOrders.side")}</div>
            <div>{t("trade.myOrders.price")}</div>
            <div className="text-right">{t("trade.myOrders.amountFilled")}</div>
            <div className="text-center">{t("trade.myOrders.status")}</div>
            <div className="text-right">{t("trade.myOrders.action")}</div>
          </div>

          {visible.map((o) => (
            <OrderRow
              key={o.orderHash}
              o={o}
              fillStatus={fillability.status[o.orderHash]}
              cancellable={!historical && ACTIVE_STATUSES.has(o.status)}
              onChanged={onChanged}
            />
          ))}
        </>
      )}
    </div>
  );
}

function deriveSide(o: ApiOrder): { side: "buy" | "sell"; base: Token; quote: Token } | null {
  // Derive side from the pair string ("BASE/QUOTE") + makerToken.
  const [baseSym, quoteSym] = o.pair.split("/") as [Token["symbol"], Token["symbol"]];
  const base = TOKENS.find((t) => t.symbol === baseSym);
  const quote = TOKENS.find((t) => t.symbol === quoteSym);
  if (!base || !quote) return null;
  const baseAddr = base.addresses[o.chainId]?.toLowerCase();
  const quoteAddr = quote.addresses[o.chainId]?.toLowerCase();
  const mt = o.order.makerToken.toLowerCase();
  if (baseAddr && mt === baseAddr) return { side: "sell", base, quote };
  if (quoteAddr && mt === quoteAddr) return { side: "buy", base, quote };
  return null;
}

function priceAndAmount(o: ApiOrder, side: "buy" | "sell", base: Token, quote: Token) {
  const makerAmount = BigInt(o.order.makerAmount);
  const takerAmount = BigInt(o.order.takerAmount);
  if (makerAmount === 0n || takerAmount === 0n) {
    return { price: 0, amount: 0, filledPct: 0 };
  }
  let amountBase: number;
  let amountQuote: number;
  if (side === "sell") {
    amountBase = Number(formatUnits(makerAmount, base.decimals));
    amountQuote = Number(formatUnits(takerAmount, quote.decimals));
  } else {
    amountBase = Number(formatUnits(takerAmount, base.decimals));
    amountQuote = Number(formatUnits(makerAmount, quote.decimals));
  }
  const price = amountBase > 0 ? amountQuote / amountBase : 0;
  const filledMaker = BigInt(o.filledMakerAmount);
  const filledPct =
    makerAmount > 0n ? Number((filledMaker * 10000n) / makerAmount) / 100 : 0;
  return { price, amount: amountBase, filledPct };
}

function OrderRow({
  o,
  fillStatus,
  cancellable,
  onChanged,
}: {
  o: ApiOrder;
  fillStatus: "fillable" | "unfillable" | "unknown" | undefined;
  cancellable: boolean;
  onChanged: () => void;
}) {
  const t = useTranslator();
  const derived = deriveSide(o);
  if (!derived) return null;
  const { side, base, quote } = derived;
  const { price, amount, filledPct } = priceAndAmount(o, side, base, quote);
  const needsApproval =
    fillStatus === "unfillable" && ACTIVE_STATUSES.has(o.status);
  const sellSymbol = side === "sell" ? base.symbol : quote.symbol;

  return (
    <div className="border-b border-line last:border-b-0 hover:bg-white/[0.02]">
      {/* Desktop row */}
      <div className="hidden md:grid grid-cols-[1fr_80px_140px_1fr_140px_100px] px-4 py-3 text-[13px] items-center">
        <div className="font-medium">{o.pair}</div>
        <div className={side === "buy" ? "text-buy" : "text-sell"}>
          {side.toUpperCase()}
        </div>
        <div className="font-mono tnum">{fmtPrice(price)}</div>
        <div className="text-right tnum flex items-center justify-end gap-3">
          <span className="font-mono">{fmtAmount(amount)}</span>
          <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
            <div className="h-full bg-accent" style={{ width: `${filledPct}%` }} />
          </div>
          <span className="text-fg-faint w-10 text-right">
            {filledPct.toFixed(0)}%
          </span>
        </div>
        <div className="text-center flex items-center justify-center gap-1.5">
          <StatusBadge status={o.status} />
          {needsApproval ? (
            <ApprovalBadge symbol={sellSymbol} />
          ) : null}
        </div>
        <div className="text-right">
          {cancellable ? (
            <CancelButton order={o} onChanged={onChanged} />
          ) : (
            <span className="text-fg-faint text-[12px]">—</span>
          )}
        </div>
      </div>

      {/* Mobile card */}
      <div className="md:hidden px-4 py-3">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[14px]">{o.pair}</span>
            <span
              className={`text-[11px] font-medium ${
                side === "buy" ? "text-buy" : "text-sell"
              }`}
            >
              {side.toUpperCase()}
            </span>
            {needsApproval ? <ApprovalBadge symbol={sellSymbol} /> : null}
          </div>
          <StatusBadge status={o.status} />
        </div>
        <div className="grid grid-cols-2 gap-y-1.5 text-[13px] mb-3">
          <span className="text-fg-faint">{t("trade.myOrders.price")}</span>
          <span className="text-right font-mono tnum">{fmtPrice(price)}</span>
          <span className="text-fg-faint">{t("trade.myOrders.amount")}</span>
          <span className="text-right font-mono tnum">{fmtAmount(amount)}</span>
          <span className="text-fg-faint">{t("trade.myOrders.filled")}</span>
          <span className="text-right">
            <span className="inline-flex items-center gap-2">
              <span className="w-14 h-1 rounded-full bg-white/[0.05] overflow-hidden inline-block">
                <span
                  className="block h-full bg-accent"
                  style={{ width: `${filledPct}%` }}
                />
              </span>
              <span className="font-mono tnum">{filledPct.toFixed(0)}%</span>
            </span>
          </span>
        </div>
        {cancellable ? <CancelButton order={o} onChanged={onChanged} block /> : null}
      </div>
    </div>
  );
}

const CANCEL_TYPES = {
  CancelOrder: [
    { name: "orderHash", type: "bytes32" },
    { name: "action", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
} as const;

function CancelButton({
  order,
  onChanged,
  block,
}: {
  order: ApiOrder;
  onChanged: () => void;
  block?: boolean;
}) {
  const t = useTranslator();
  const { signTypedDataAsync, isPending: signing } = useSignTypedData();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onClick = async () => {
    const dexAddress = SCENTDEX_V5_ADDRESS[order.chainId];
    if (!dexAddress) {
      setError(`SCENTDEX V5 not deployed on chain ${order.chainId}`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const signature = await signTypedDataAsync({
        domain: {
          name: "SCENTDEX",
          version: "6",
          chainId: order.chainId,
          verifyingContract: dexAddress,
        },
        types: CANCEL_TYPES,
        primaryType: "CancelOrder",
        message: {
          orderHash: order.orderHash as Hex,
          action: "cancel",
          chainId: BigInt(order.chainId),
        },
      } as Parameters<typeof signTypedDataAsync>[0]);

      const res = await fetch(
        `/api/orders/${order.orderHash}/cancel`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ signature, chainId: order.chainId }),
        },
      );
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      onChanged();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 120));
    } finally {
      setBusy(false);
    }
  };

  const label = busy || signing ? t("trade.myOrders.cancelling") : t("trade.myOrders.cancel");

  return (
    <div className={block ? "w-full" : "inline-flex flex-col items-end"}>
      <button
        onClick={onClick}
        disabled={busy || signing}
        className={
          block
            ? "w-full py-2 rounded-md bg-white/[0.04] text-[13px] text-fg-dim hover:text-fg hover:bg-white/[0.08] disabled:opacity-60"
            : "text-[12px] px-2 py-1 rounded text-fg-dim hover:text-fg hover:bg-white/[0.05] disabled:opacity-60"
        }
      >
        {label}
      </button>
      {error ? (
        <span className="text-[10px] text-sell mt-1 max-w-[160px] truncate" title={error}>
          {error}
        </span>
      ) : null}
    </div>
  );
}

function ApprovalBadge({ symbol }: { symbol: string }) {
  const t = useTranslator();
  return (
    <span
      title={t("trade.myOrders.needsApprovalTooltip").replace("{symbol}", symbol)}
      className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300"
    >
      ⚠ {t("trade.myOrders.needsApproval")}
    </span>
  );
}

function fmtPrice(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0";
  if (n < 0.001) return n.toExponential(2);
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function fmtAmount(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

function History({ orders, loading }: { orders: ApiOrder[]; loading: boolean }) {
  const t = useTranslator();
  const { isConnected } = useAccount();

  if (!isConnected) {
    return (
      <div className="px-4 py-12 text-center text-[13px] text-fg-faint">
        {t("trade.history.connect")}
      </div>
    );
  }

  // Until the on-chain fill indexer (Phase 3.5b) lands, "history" surfaces
  // the maker's own resolved orders (filled / cancelled / expired) as proxy
  // for trade history. The protocol-fee column doesn't apply yet — left as —.
  const items = orders
    .filter((o) => HISTORICAL_STATUSES.has(o.status))
    .sort((a, b) => b.createdAt - a.createdAt);

  if (items.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-[13px] text-fg-faint">
        {loading ? "loading…" : t("trade.history.empty")}
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table header */}
      <div className="hidden md:grid grid-cols-[160px_140px_70px_1fr_120px_120px] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint border-b border-line">
        <div>{t("trade.history.time")}</div>
        <div>{t("trade.history.pair")}</div>
        <div>{t("trade.history.side")}</div>
        <div className="text-right">{t("trade.history.amount")}</div>
        <div className="text-right">{t("trade.history.price")}</div>
        <div className="text-center">{t("trade.myOrders.status")}</div>
      </div>

      {items.map((o) => {
        const derived = deriveSide(o);
        if (!derived) return null;
        const { side, base, quote } = derived;
        const { price, amount } = priceAndAmount(o, side, base, quote);
        const time = new Date(o.createdAt * 1000)
          .toISOString()
          .replace("T", " ")
          .slice(0, 16);
        return (
          <div
            key={o.orderHash}
            className="border-b border-line last:border-b-0 hover:bg-white/[0.02]"
          >
            {/* Desktop row */}
            <div className="hidden md:grid grid-cols-[160px_140px_70px_1fr_120px_120px] px-4 py-3 text-[13px] font-mono items-center">
              <div className="text-fg-dim tnum">{time}</div>
              <div className="font-sans font-medium">{o.pair}</div>
              <div className={side === "buy" ? "text-buy" : "text-sell"}>
                {side.toUpperCase()}
              </div>
              <div className="text-right tnum">{fmtAmount(amount)}</div>
              <div className="text-right tnum">{fmtPrice(price)}</div>
              <div className="text-center">
                <StatusBadge status={o.status} />
              </div>
            </div>

            {/* Mobile card */}
            <div className="md:hidden px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[14px]">{o.pair}</span>
                  <span
                    className={`text-[11px] font-medium ${
                      side === "buy" ? "text-buy" : "text-sell"
                    }`}
                  >
                    {side.toUpperCase()}
                  </span>
                  <StatusBadge status={o.status} />
                </div>
                <span className="text-[11px] font-mono tnum text-fg-faint">
                  {time}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 text-[13px]">
                <span className="text-fg-faint">{t("trade.history.amount")}</span>
                <span className="text-right font-mono tnum">{fmtAmount(amount)}</span>
                <span className="text-fg-faint">{t("trade.history.price")}</span>
                <span className="text-right font-mono tnum">{fmtPrice(price)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Permit2() {
  const t = useTranslator();

  return (
    <div className="p-4">
      <div className="px-4 py-3 mb-4 rounded-md bg-accent-soft border border-accent/30 text-[13px] flex items-start gap-2">
        <span aria-hidden="true">🛡</span>
        <span>
          {t("trade.approvedTokens.description")}{" "}
          <a className="text-accent underline-offset-2 hover:underline" href="/permit2">
            {t("trade.approvedTokens.learnMore")}
          </a>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {TOKENS.map((token) => (
          <Permit2Card key={token.symbol} token={token} />
        ))}
      </div>
    </div>
  );
}

function Permit2Card({ token }: { token: Token }) {
  const t = useTranslator();
  const s = useTokenStatus(token);
  const hasAddress = Boolean(s.tokenAddress);

  const state: "no-address" | "disconnected" | "approved" | "partial" | "not-approved" =
    !hasAddress
      ? "no-address"
      : !s.isConnected
      ? "disconnected"
      : s.isFullyApproved
      ? "approved"
      : s.isErc20Approved
      ? "partial"
      : "not-approved";

  return (
    <div className="border border-line rounded-md p-4 bg-white/[0.015]">
      <div className="flex items-center gap-3 mb-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-bg font-bold text-[12px] ${token.accentClass}`}
        >
          {token.symbol.charAt(0)}
        </div>
        <div className="font-medium text-[14px] flex-1">
          {token.symbol}
          <div className="text-[11px] text-fg-faint font-normal">
            {token.name}
          </div>
        </div>
        <StateBadge state={state} />
      </div>

      {state === "no-address" ? (
        <p className="text-[12px] text-fg-faint leading-relaxed">
          {t("trade.approvedTokens.notDeployed")}
        </p>
      ) : state === "disconnected" ? (
        <p className="text-[12px] text-fg-dim leading-relaxed">
          {t("trade.approvedTokens.connectWallet").replace("{symbol}", token.symbol)}
        </p>
      ) : (
        <PermitBody token={token} status={s} />
      )}
    </div>
  );
}

function StateBadge({
  state,
}: {
  state: "no-address" | "disconnected" | "approved" | "partial" | "not-approved";
}) {
  if (state === "approved") {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-buy/15 text-buy">
        Active
      </span>
    );
  }
  if (state === "partial") {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
        Step 2/2
      </span>
    );
  }
  if (state === "not-approved") {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] text-fg-dim">
        Not approved
      </span>
    );
  }
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.05] text-fg-faint">
      —
    </span>
  );
}

function PermitBody({
  token,
  status,
}: {
  token: Token;
  status: ReturnType<typeof useTokenStatus>;
}) {
  const t = useTranslator();
  const balance = formatBalanceWithCommas(status.balance, token.decimals);

  const isFullyApproved = status.isFullyApproved;
  const isPartial = !isFullyApproved && status.isErc20Approved;

  let statusCopy: string;
  if (isFullyApproved) {
    statusCopy = t("trade.approvedTokens.approved");
  } else if (isPartial) {
    statusCopy = t("trade.approvedTokens.partialDescription");
  } else {
    statusCopy = t("trade.approvedTokens.statusNotApproved");
  }

  return (
    <>
      <div className="mb-3 flex items-baseline justify-between text-[12px]">
        <span className="text-fg-faint uppercase tracking-[0.14em] text-[10px]">
          {t("trade.approvedTokens.balance")}
        </span>
        <span className="font-mono tnum text-fg">
          {status.balanceLoading ? "…" : balance} {token.symbol}
        </span>
      </div>

      <div className="mb-3 flex flex-col gap-1 text-[11px]">
        <StepRow
          label={t("trade.approvedTokens.step1Label")}
          done={status.isErc20Approved}
        />
        <StepRow
          label={t("trade.approvedTokens.step2Label")}
          done={status.isPermit2DexApproved}
        />
      </div>

      <p className="text-[12px] text-fg-dim mb-3 leading-relaxed">
        {statusCopy}
      </p>

      {isFullyApproved ? (
        <button
          onClick={status.revoke}
          disabled={status.isRevoking}
          className="w-full py-2 rounded-md border border-line text-[13px] text-fg-dim hover:text-fg hover:border-sell disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status.isRevoking
            ? t("trade.approvedTokens.revoking")
            : t("trade.approvedTokens.revoke")}
        </button>
      ) : null}

      {status.approveError ? (
        <p className="mt-2 text-[11px] text-sell">
          {status.approveError.message.slice(0, 120)}
        </p>
      ) : null}
      {status.revokeError ? (
        <p className="mt-2 text-[11px] text-sell">
          {status.revokeError.message.slice(0, 120)}
        </p>
      ) : null}
    </>
  );
}

function formatBalanceWithCommas(raw: bigint, decimals: number): string {
  const whole = raw / 10n ** BigInt(decimals);
  const fracRaw = raw % 10n ** BigInt(decimals);
  const wholeStr = whole.toLocaleString("en-US");
  if (fracRaw === 0n) return wholeStr;
  const fracPadded = fracRaw.toString().padStart(decimals, "0").slice(0, 4);
  const fracTrimmed = fracPadded.replace(/0+$/, "");
  return fracTrimmed.length === 0 ? wholeStr : `${wholeStr}.${fracTrimmed}`;
}

function StepRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-[9px] ${
          done ? "bg-buy/20 text-buy" : "bg-white/[0.06] text-fg-faint"
        }`}
        aria-hidden="true"
      >
        {done ? "✓" : "•"}
      </span>
      <span className={done ? "text-fg-dim" : "text-fg-faint"}>{label}</span>
    </div>
  );
}

function trimTrailingZeros(s: string, maxDecimals = 4): string {
  if (!s.includes(".")) return s;
  const [whole, frac] = s.split(".");
  const trimmed = frac.replace(/0+$/, "").slice(0, maxDecimals);
  return trimmed.length === 0 ? whole : `${whole}.${trimmed}`;
}

function SubTab({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-[12px] ${
        active ? "bg-white/[0.06] text-fg" : "text-fg-dim hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "open"
      ? "bg-buy/15 text-buy"
      : status === "partially-filled"
      ? "bg-accent-soft text-accent"
      : status === "filled"
      ? "bg-buy/10 text-buy"
      : status === "cancelled"
      ? "bg-white/[0.05] text-fg-dim"
      : status === "expired"
      ? "bg-white/[0.05] text-fg-faint"
      : "bg-white/[0.05] text-fg-dim";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${cls}`}>
      {status}
    </span>
  );
}
