"use client";

import { useTokenStatus } from "@/lib/hooks/useTokenStatus";
import { TOKENS, type Token } from "@/lib/tokens";
import { useState } from "react";
import { formatUnits } from "viem";

type Tab = "orders" | "history" | "permit2";

export function BottomTabs() {
  const [tab, setTab] = useState<Tab>("orders");

  return (
    <section className="bg-bg-soft border border-line rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 px-3 pt-3 border-b border-line">
        <TabBtn active={tab === "orders"} onClick={() => setTab("orders")} count={4}>
          My Orders
        </TabBtn>
        <TabBtn active={tab === "history"} onClick={() => setTab("history")} count={6}>
          History
        </TabBtn>
        <TabBtn active={tab === "permit2"} onClick={() => setTab("permit2")}>
          Permit2
        </TabBtn>
      </div>

      {tab === "orders" ? <MyOrders /> : null}
      {tab === "history" ? <History /> : null}
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

function MyOrders() {
  const orders = [
    { pair: "SCENT/JPYC", side: "sell", price: "12.5500", amount: 800, filled: 30, status: "PartiallyFilled" },
    { pair: "SCENT/JPYC", side: "sell", price: "12.6200", amount: 1200, filled: 0, status: "Open" },
    { pair: "SCENT/JPYC", side: "buy", price: "12.3000", amount: 500, filled: 0, status: "Open" },
    { pair: "SCENT/USDT", side: "sell", price: "0.0840", amount: 2500, filled: 0, status: "Open" },
  ];

  return (
    <div>
      <div className="px-3 py-2 flex flex-wrap items-center justify-between gap-2 border-b border-line">
        <div className="flex items-center gap-1">
          <SubTab active>Active (4)</SubTab>
          <SubTab>Historical (4)</SubTab>
        </div>
        <button className="text-[12px] px-2.5 py-1 rounded border border-line text-fg-dim hover:text-fg hover:border-line-strong">
          🗑 Bulk cancel
        </button>
      </div>

      {/* Desktop table header */}
      <div className="hidden md:grid grid-cols-[1fr_80px_120px_1fr_120px_80px] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint border-b border-line">
        <div>Pair</div>
        <div>Side</div>
        <div>Price</div>
        <div className="text-right">Amount / Filled</div>
        <div className="text-center">Status</div>
        <div className="text-right">Action</div>
      </div>

      {orders.map((o, i) => (
        <div
          key={i}
          className="border-b border-line last:border-b-0 hover:bg-white/[0.02]"
        >
          {/* Desktop row */}
          <div className="hidden md:grid grid-cols-[1fr_80px_120px_1fr_120px_80px] px-4 py-3 text-[13px] items-center">
            <div className="font-medium">{o.pair}</div>
            <div className={o.side === "buy" ? "text-buy" : "text-sell"}>
              {o.side.toUpperCase()}
            </div>
            <div className="font-mono tnum">{o.price}</div>
            <div className="text-right tnum flex items-center justify-end gap-3">
              <span className="font-mono">{o.amount.toLocaleString()}</span>
              <div className="w-16 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div className="h-full bg-accent" style={{ width: `${o.filled}%` }} />
              </div>
              <span className="text-fg-faint w-8 text-left">{o.filled}%</span>
            </div>
            <div className="text-center">
              <StatusBadge status={o.status} />
            </div>
            <div className="text-right">
              <button className="text-[12px] px-2 py-1 rounded text-fg-dim hover:text-fg hover:bg-white/[0.05]">
                Cancel
              </button>
            </div>
          </div>

          {/* Mobile card */}
          <div className="md:hidden px-4 py-3">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[14px]">{o.pair}</span>
                <span
                  className={`text-[11px] font-medium ${
                    o.side === "buy" ? "text-buy" : "text-sell"
                  }`}
                >
                  {o.side.toUpperCase()}
                </span>
              </div>
              <StatusBadge status={o.status} />
            </div>
            <div className="grid grid-cols-2 gap-y-1.5 text-[13px] mb-3">
              <span className="text-fg-faint">Price</span>
              <span className="text-right font-mono tnum">{o.price}</span>
              <span className="text-fg-faint">Amount</span>
              <span className="text-right font-mono tnum">
                {o.amount.toLocaleString()}
              </span>
              <span className="text-fg-faint">Filled</span>
              <span className="text-right">
                <span className="inline-flex items-center gap-2">
                  <span className="w-14 h-1 rounded-full bg-white/[0.05] overflow-hidden inline-block">
                    <span
                      className="block h-full bg-accent"
                      style={{ width: `${o.filled}%` }}
                    />
                  </span>
                  <span className="font-mono tnum">{o.filled}%</span>
                </span>
              </span>
            </div>
            <button className="w-full py-2 rounded-md bg-white/[0.04] text-[13px] text-fg-dim hover:text-fg hover:bg-white/[0.08]">
              Cancel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function History() {
  const trades = [
    { time: "2026-05-01 10:42", pair: "SCENT/JPYC", side: "sell", amount: 240, price: "12.5500", role: "Maker", cp: "0x7a4b…2e91", fee: "24 JPYC" },
    { time: "2026-05-01 09:18", pair: "SCENT/JPYC", side: "buy", amount: 180, price: "12.4200", role: "Taker", cp: "0xc1f0…9d2a", fee: "18 JPYC" },
    { time: "2026-04-30 22:05", pair: "SCENT/JPYC", side: "sell", amount: 600, price: "12.4000", role: "Maker", cp: "0x2c8a…51f4", fee: "60 JPYC" },
    { time: "2026-04-30 16:51", pair: "SCENT/USDT", side: "sell", amount: 1100, price: "0.0810", role: "Maker", cp: "0xe55d…3a02", fee: "8.91 USDT" },
    { time: "2026-04-30 11:33", pair: "SCENT/JPYC", side: "buy", amount: 90, price: "12.5100", role: "Taker", cp: "0x09bf…cc11", fee: "11 JPYC" },
    { time: "2026-04-29 19:12", pair: "SCENT/JPYC", side: "sell", amount: 320, price: "12.2800", role: "Maker", cp: "0x4f12…b7e3", fee: "32 JPYC" },
  ];

  return (
    <div>
      {/* Desktop table header */}
      <div className="hidden md:grid grid-cols-[160px_140px_70px_1fr_120px_80px_1fr_100px] px-4 py-2 text-[10px] uppercase tracking-[0.14em] text-fg-faint border-b border-line">
        <div>Time</div>
        <div>Pair</div>
        <div>Side</div>
        <div className="text-right">Amount</div>
        <div className="text-right">Price</div>
        <div className="text-fg-faint">Role</div>
        <div className="text-right">Counter-party</div>
        <div className="text-right">Protocol Fee</div>
      </div>

      {trades.map((t, i) => (
        <div
          key={i}
          className="border-b border-line last:border-b-0 hover:bg-white/[0.02]"
        >
          {/* Desktop row */}
          <div className="hidden md:grid grid-cols-[160px_140px_70px_1fr_120px_80px_1fr_100px] px-4 py-3 text-[13px] font-mono items-center">
            <div className="text-fg-dim tnum">{t.time}</div>
            <div className="font-sans font-medium">{t.pair}</div>
            <div className={t.side === "buy" ? "text-buy" : "text-sell"}>
              {t.side.toUpperCase()}
            </div>
            <div className="text-right tnum">{t.amount.toLocaleString()}</div>
            <div className="text-right tnum">{t.price}</div>
            <div className="text-fg-faint">{t.role}</div>
            <div className="text-right text-fg-dim">{t.cp}</div>
            <div className="text-right tnum">{t.fee}</div>
          </div>

          {/* Mobile card */}
          <div className="md:hidden px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-[14px]">{t.pair}</span>
                <span
                  className={`text-[11px] font-medium ${
                    t.side === "buy" ? "text-buy" : "text-sell"
                  }`}
                >
                  {t.side.toUpperCase()}
                </span>
                <span className="text-[10px] uppercase tracking-[0.12em] text-fg-faint border border-line rounded px-1.5">
                  {t.role}
                </span>
              </div>
              <span className="text-[11px] font-mono tnum text-fg-faint">
                {t.time}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-y-1 text-[13px]">
              <span className="text-fg-faint">Amount</span>
              <span className="text-right font-mono tnum">
                {t.amount.toLocaleString()}
              </span>
              <span className="text-fg-faint">Price</span>
              <span className="text-right font-mono tnum">{t.price}</span>
              <span className="text-fg-faint">Counter-party</span>
              <span className="text-right font-mono text-fg-dim">{t.cp}</span>
              <span className="text-fg-faint">Protocol Fee</span>
              <span className="text-right font-mono tnum">{t.fee}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Permit2() {
  return (
    <div className="p-4">
      <div className="px-4 py-3 mb-4 rounded-md bg-accent-soft border border-accent/30 text-[13px] flex items-start gap-2">
        <span aria-hidden="true">🛡</span>
        <span>
          Permit2 lets SCENTDEX execute your signed orders without a separate{" "}
          <code className="font-mono text-fg-dim">approve</code> tx per token.
          Re-approve any time.{" "}
          <a className="text-accent underline-offset-2 hover:underline" href="/permit2">
            Learn more →
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
  const s = useTokenStatus(token);
  const isApproved = s.allowance > 0n;
  const hasAddress = Boolean(s.tokenAddress);
  // Faucet is only meaningful when the deployed token contract has a public
  // mint() (true for the MockERC20 we ship; production ERC-20s do not).
  // We expose it on every chain where a token address is configured;
  // mainnet ERC-20s without mint will simply revert client-side.
  const faucetEnabled = hasAddress;

  // Decide displayed state.
  const state: "no-address" | "disconnected" | "approved" | "not-approved" =
    !hasAddress
      ? "no-address"
      : !s.isConnected
      ? "disconnected"
      : isApproved
      ? "approved"
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
          Not deployed on this network.
        </p>
      ) : state === "disconnected" ? (
        <p className="text-[12px] text-fg-dim leading-relaxed">
          Connect your wallet to view your {token.symbol} balance and Permit2
          status.
        </p>
      ) : (
        <PermitBody
          token={token}
          status={s}
          isApproved={isApproved}
          faucetEnabled={faucetEnabled}
        />
      )}
    </div>
  );
}

function StateBadge({
  state,
}: {
  state: "no-address" | "disconnected" | "approved" | "not-approved";
}) {
  if (state === "approved") {
    return (
      <span className="text-[11px] px-2 py-0.5 rounded-full bg-buy/15 text-buy">
        Active
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
  isApproved,
  faucetEnabled,
}: {
  token: Token;
  status: ReturnType<typeof useTokenStatus>;
  isApproved: boolean;
  faucetEnabled: boolean;
}) {
  const balance = formatUnits(status.balance, token.decimals);
  const balanceShort = trimTrailingZeros(balance, 4);

  return (
    <>
      <div className="mb-3 flex items-baseline justify-between text-[12px]">
        <span className="text-fg-faint uppercase tracking-[0.14em] text-[10px]">
          Balance
        </span>
        <span className="font-mono tnum text-fg">
          {status.balanceLoading ? "…" : balanceShort} {token.symbol}
        </span>
      </div>

      {isApproved ? (
        <>
          <div className="mb-2 text-[12px] text-fg-dim leading-relaxed">
            Permit2 is approved. SCENTDEX can route your signed orders without
            another <code className="font-mono">approve</code> tx.
          </div>
          <div className="flex items-center justify-end">
            <button
              onClick={status.approve}
              disabled={status.isApproving}
              className="px-3 py-1 rounded text-[12px] text-fg-dim border border-line hover:text-fg hover:border-line-strong disabled:opacity-50"
            >
              {status.isApproving ? "Re-approving…" : "Re-approve"}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-[12px] text-fg-dim mb-3 leading-relaxed">
            Approve once to start trading {token.symbol}. You'll sign a single
            on-chain transaction granting Permit2 a max allowance.
          </p>
          <button
            onClick={status.approve}
            disabled={status.isApproving}
            className="w-full py-2 rounded-md bg-accent text-bg font-medium text-[13px] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {status.isApproving ? "Approving…" : `Approve ${token.symbol}`}
          </button>
        </>
      )}

      {faucetEnabled ? (
        <div className="mt-3 pt-3 border-t border-line">
          <div className="text-[10px] uppercase tracking-[0.14em] text-fg-faint mb-1.5">
            Faucet
          </div>
          <button
            onClick={status.mintDefault}
            disabled={status.isMinting}
            className="w-full py-1.5 rounded-md bg-white/[0.04] text-[12px] text-fg-dim hover:text-fg hover:bg-white/[0.08] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status.isMinting
              ? "Minting…"
              : `Get 1,000 ${token.symbol}`}
          </button>
        </div>
      ) : null}

      {status.approveError ? (
        <p className="mt-2 text-[11px] text-sell">
          {status.approveError.message.slice(0, 120)}
        </p>
      ) : null}
      {status.mintError ? (
        <p className="mt-2 text-[11px] text-sell">
          {status.mintError.message.slice(0, 120)}
        </p>
      ) : null}
    </>
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
}: {
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
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
    status === "Open"
      ? "bg-buy/15 text-buy"
      : status === "PartiallyFilled"
      ? "bg-accent-soft text-accent"
      : "bg-white/[0.05] text-fg-dim";
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded font-mono ${cls}`}>
      {status}
    </span>
  );
}
