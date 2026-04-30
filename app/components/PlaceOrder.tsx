"use client";

import type { Pair } from "@/lib/tokens";
import { useState } from "react";

type Side = "buy" | "sell";
type Expiry = "1h" | "1d" | "1w" | "custom";

export function PlaceOrder({ pair }: { pair: Pair }) {
  const [side, setSide] = useState<Side>("sell");
  const [price, setPrice] = useState("");
  const [amount, setAmount] = useState("");
  const [expiry, setExpiry] = useState<Expiry>("1d");

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
        {/* Side selector */}
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

        {/* Price */}
        <Field label="Price" suffix={pair.quote}>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full bg-transparent outline-none text-[16px] font-mono tnum placeholder:text-fg-faint"
          />
        </Field>

        {/* Amount */}
        <Field label="Amount" suffix={pair.base}>
          <input
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-transparent outline-none text-[16px] font-mono tnum placeholder:text-fg-faint"
          />
        </Field>

        {/* Quick % buttons */}
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

        {/* Expiry */}
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
          <Row k="Total" v={`0.00 ${pair.quote}`} />
          <Row
            k={
              <>
                Protocol fee (10%){" "}
                <span className="text-fg-faint">(maker)</span>
              </>
            }
            v={`0.00 ${pair.quote}`}
          />
          <Row k="You receive (at least)" v={`0.00 ${pair.quote}`} dim />
        </div>

        <button
          disabled
          className="mt-2 w-full py-3 rounded-md bg-accent text-bg font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
        >
          Sign Order
        </button>
      </div>
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
