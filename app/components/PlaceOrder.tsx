"use client";

import {
  SignConfirmModal,
  type SignConfirmContext,
} from "@/app/components/SignConfirmModal";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import {
  buildAmounts,
  buildDomain,
  expiryFromChoice,
  ORDER_TYPES,
  randomSalt,
  type Order,
} from "@/lib/order";
import { TOKENS, feeConfig, type Pair } from "@/lib/tokens";
import { useMemo, useState } from "react";
import { useAccount, useChainId, useSignTypedData } from "wagmi";

type Side = "buy" | "sell";
type Expiry = "1h" | "1d" | "1w" | "custom";

export function PlaceOrder({ pair }: { pair: Pair }) {
  const [side, setSide] = useState<Side>("sell");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [expiry, setExpiry] = useState<Expiry>("1d");

  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];

  const baseToken = TOKENS.find((t) => t.symbol === pair.base)!;
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote)!;

  const { signTypedDataAsync, isPending: signing } = useSignTypedData();

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [lastResult, setLastResult] = useState<
    { ok: true; signature: string; orderHash?: string } | { ok: false; error: string } | null
  >(null);

  // -- Form-derived totals ---------------------------------------------
  const cfg = feeConfig(pair);
  const totals = useMemo(() => {
    const priceN = Number(price);
    const amountN = Number(amount);
    if (Number.isNaN(priceN) || Number.isNaN(amountN) || priceN <= 0 || amountN <= 0) {
      return { total: 0, fee: 0, receive: 0 };
    }
    const total = priceN * amountN;
    // Fee only applies on the Case-A side (when the maker is selling feeSide token).
    // For a sell of base: maker pays fee iff feeSide == base.
    // For a buy of base: maker pays fee iff feeSide == quote.
    const isFeeOnThisOrder =
      side === "sell" ? cfg.feeSide === pair.base : cfg.feeSide === pair.quote;
    const fee = isFeeOnThisOrder ? (total * cfg.feeBps) / 10_000 : 0;
    return { total, fee, receive: total - fee };
  }, [price, amount, side, cfg.feeBps, cfg.feeSide, pair.base, pair.quote]);

  // -- Reasons we can't sign yet ---------------------------------------
  const reasons: string[] = [];
  if (!isConnected) reasons.push("Connect wallet");
  if (!dexAddress) reasons.push("Switch to a supported network");
  if (
    dexAddress &&
    (!baseToken.addresses[chainId] || !quoteToken.addresses[chainId])
  )
    reasons.push("Pair not available on this network");
  if (!price || Number(price) <= 0) reasons.push("Enter a price");
  if (!amount || Number(amount) <= 0) reasons.push("Enter an amount");
  const canSign = reasons.length === 0;

  function startSign() {
    if (!canSign || !account || !dexAddress) return;

    const amounts = buildAmounts({
      side,
      base: baseToken,
      quote: quoteToken,
      amount,
      price,
    });
    if (!amounts) {
      setLastResult({ ok: false, error: "Could not build order amounts" });
      return;
    }

    // Pair fee config from lib/tokens.ts.
    // Phase 3.4 will read these directly from the contract via pairConfig().
    const feeSideToken = TOKENS.find((t) => t.symbol === cfg.feeSide);
    const feeSide = feeSideToken?.addresses[chainId];
    if (!feeSide) {
      setLastResult({ ok: false, error: `Fee side ${cfg.feeSide} not deployed on this chain` });
      return;
    }
    const feeBps = cfg.feeBps;

    const order: Order = {
      maker: account,
      makerToken: amounts.makerToken,
      takerToken: amounts.takerToken,
      makerAmount: amounts.makerAmount,
      takerAmount: amounts.takerAmount,
      expiry: expiryFromChoice(expiry),
      nonce: BigInt(Math.floor(Date.now() / 1000)), // unix-second monotonic seed
      salt: randomSalt(),
      feeSide,
      feeBps,
    };

    setPendingOrder(order);
    setLastResult(null);
    setModalOpen(true);
  }

  async function confirmSign() {
    if (!pendingOrder || !dexAddress) return;
    try {
      const signature = await signTypedDataAsync({
        domain: buildDomain(chainId, dexAddress),
        types: ORDER_TYPES,
        primaryType: "Order",
        message: pendingOrder as unknown as Record<string, unknown>,
      } as Parameters<typeof signTypedDataAsync>[0]);

      // Post to /api/orders so it lands on the order book.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order: serialiseOrder(pendingOrder),
          signature,
          pair: `${pair.base}/${pair.quote}`,
          chainId,
        }),
      });

      if (!res.ok) {
        const { error } = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setLastResult({
          ok: false,
          error: `Order book rejected: ${error ?? `HTTP ${res.status}`}`,
        });
        return;
      }

      setLastResult({ ok: true, signature });
      setModalOpen(false);
      setAmount("");
      setPrice("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastResult({ ok: false, error: msg.slice(0, 160) });
    }
  }

  const ctx: SignConfirmContext | null =
    pendingOrder && account
      ? {
          chainId,
          walletAddress: account,
          order: pendingOrder,
          baseToken,
          quoteToken,
          side,
          // Phase 3.4: read these from the contract.
          minTakerAmount: undefined,
          maxPriceRatio: undefined,
        }
      : null;

  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-line">
        <h2 className="text-[11px] uppercase tracking-[0.18em] text-fg-faint">
          Place Order
        </h2>
        <div className="flex items-center gap-1 text-[11px] font-mono text-fg-faint">
          <kbd className="px-1.5 py-0.5 border border-line rounded">B</kbd>
          <span className="text-fg-faint">/</span>
          <kbd className="px-1.5 py-0.5 border border-line rounded">S</kbd>
        </div>
      </header>

      <div className="p-4 flex flex-col gap-4 flex-1">
        {/* Side */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setSide("buy")}
            className={`py-2.5 rounded-md text-[14px] font-medium transition-colors ${
              side === "buy"
                ? "bg-buy text-bg"
                : "bg-white/[0.03] text-fg-dim hover:text-fg"
            }`}
          >
            Buy {pair.base}
          </button>
          <button
            onClick={() => setSide("sell")}
            className={`py-2.5 rounded-md text-[14px] font-medium transition-colors ${
              side === "sell"
                ? "bg-sell text-bg"
                : "bg-white/[0.03] text-fg-dim hover:text-fg"
            }`}
          >
            Sell {pair.base}
          </button>
        </div>

        <Field label="Price" suffix={pair.quote}>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-transparent outline-none text-[16px] font-mono tnum placeholder:text-fg-faint"
          />
        </Field>

        <Field label="Amount" suffix={pair.base}>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent outline-none text-[16px] font-mono tnum placeholder:text-fg-faint"
          />
        </Field>

        <div className="grid grid-cols-4 gap-2">
          {[25, 50, 75, 100].map((p) => (
            <button
              key={p}
              className="py-1.5 rounded-md border border-line bg-white/[0.02] text-[12px] text-fg-dim hover:text-fg hover:border-line-strong transition-colors"
            >
              {p} %
            </button>
          ))}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-fg-faint mb-2">
            Expires
          </div>
          <div className="grid grid-cols-4 gap-2">
            {(["1h", "1d", "1w", "custom"] as const).map((opt) => (
              <button
                key={opt}
                onClick={() => setExpiry(opt)}
                className={`py-1.5 rounded-md border text-[12px] transition-colors ${
                  expiry === opt
                    ? "border-accent text-fg bg-accent-soft"
                    : "border-line bg-white/[0.02] text-fg-dim hover:text-fg hover:border-line-strong"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="mt-2 px-3 py-3 rounded-md bg-white/[0.015] border border-line space-y-2 text-[13px]">
          <Row k="Total" v={`${fmtNum(totals.total)} ${pair.quote}`} />
          <Row
            k={
              <>
                Protocol fee ({(cfg.feeBps / 100).toFixed(0)}%){" "}
                <span className="text-fg-faint">(maker)</span>
              </>
            }
            v={`${fmtNum(totals.fee)} ${pair.quote}`}
          />
          <Row
            k="You receive (at least)"
            v={`${fmtNum(totals.receive)} ${pair.quote}`}
            dim
          />
        </div>

        {lastResult ? (
          lastResult.ok ? (
            <div className="px-3 py-2 rounded-md border border-buy/30 bg-buy/[0.05] text-[12px] text-buy">
              Order signed. Signature: <span className="font-mono text-[11px]">{lastResult.signature.slice(0, 10)}…{lastResult.signature.slice(-8)}</span>
              <div className="text-fg-faint mt-1">
                Phase 3.3 next: post to /api/orders so it appears on the book.
              </div>
            </div>
          ) : (
            <div className="px-3 py-2 rounded-md border border-sell/30 bg-sell/[0.05] text-[12px] text-sell">
              {lastResult.error}
            </div>
          )
        ) : null}

        <button
          onClick={startSign}
          disabled={!canSign || signing}
          className="mt-2 w-full py-3 rounded-md bg-accent text-bg font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          title={reasons.join(" · ")}
        >
          {!canSign ? reasons[0] : signing ? "Waiting for wallet…" : "Sign Order"}
        </button>
      </div>

      <SignConfirmModal
        open={modalOpen}
        ctx={ctx}
        onCancel={() => setModalOpen(false)}
        onConfirm={confirmSign}
        signing={signing}
      />
    </section>
  );
}

function Field({
  label,
  suffix,
  children,
}: {
  label: string;
  suffix: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-[0.14em] text-fg-faint">
          {label}
        </span>
        <span className="text-[11px] text-fg-faint font-mono">{suffix}</span>
      </div>
      <div className="px-3 py-2.5 bg-white/[0.02] border border-line rounded-md focus-within:border-line-strong">
        {children}
      </div>
    </div>
  );
}

function Row({
  k,
  v,
  dim,
}: {
  k: React.ReactNode;
  v: React.ReactNode;
  dim?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={dim ? "text-fg-faint" : "text-fg-dim"}>{k}</span>
      <span className="font-mono tnum">{v}</span>
    </div>
  );
}

function fmtNum(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "0.00";
  return n.toLocaleString(undefined, { maximumFractionDigits: 6 });
}

function serialiseOrder(order: Order) {
  return {
    maker: order.maker,
    makerToken: order.makerToken,
    takerToken: order.takerToken,
    makerAmount: order.makerAmount.toString(),
    takerAmount: order.takerAmount.toString(),
    expiry: order.expiry.toString(),
    nonce: order.nonce.toString(),
    salt: order.salt,
    feeSide: order.feeSide,
    feeBps: order.feeBps,
  };
}
