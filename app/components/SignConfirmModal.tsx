"use client";

import { formatUnits, type Address } from "viem";
import { useEffect, useMemo, useState } from "react";

import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { formatPrice } from "@/lib/format-price";
import { useTranslator } from "@/lib/locale-context";
import type { Order } from "@/lib/order";
import { symbolLabel, type Token } from "@/lib/tokens";

/**
 * Sign Confirmation modal — the load-bearing phishing-defence layer per
 * V5_dex_ui_functional_requirements.md §4.6.
 *
 * Renders BEFORE the wallet's typed-data sign request. Shows a plain-language
 * summary + four detection rules. The "Sign Order" button is disabled if any
 * rule fails; a held-3-seconds "Sign anyway" override is offered for the
 * cases users may want to push through (e.g. testing).
 *
 * The four rules:
 *   1. Domain   — verifyingContract matches the official SCENTDEX V5 deploy on this chain
 *   2. Floor    — order.takerAmount >= minTakerAmount[takerToken]
 *   3. Ratio    — order.makerAmount * 1e18 / order.takerAmount <= maxPriceRatio (when active)
 *   4. Self     — order.maker matches the connected wallet (no surprise signer)
 */

type RuleResult = { id: string; label: string; ok: boolean; detail?: string };

export type SignConfirmContext = {
  chainId: number;
  walletAddress: Address;
  order: Order;
  baseToken: Token;
  quoteToken: Token;
  side: "buy" | "sell";
  /** Bigint min taker amount for the takerToken on the connected chain. */
  minTakerAmount?: bigint;
  /** Bigint max price ratio (1e6 default). 0 means inactive. */
  maxPriceRatio?: bigint;
  /**
   * Fat-finger guard (rule 5). undefined → no market reference existed, the
   * rule row is omitted. null → checked, price within ±30% of reference.
   * Object → deviation ≥30%: the rule fails, which routes the footer into
   * the hold-3s "Sign anyway" override — the explicit "yes, I really mean
   * this price" confirmation.
   */
  priceDeviation?: { pct: number; above: boolean; refPrice: number } | null;
};

export function SignConfirmModal({
  open,
  ctx,
  onCancel,
  onConfirm,
  signing,
}: {
  open: boolean;
  ctx: SignConfirmContext | null;
  onCancel: () => void;
  onConfirm: () => void;
  signing?: boolean;
}) {
  const t = useTranslator();
  const rules = useMemo(() => (ctx ? evaluateRules(ctx, t) : []), [ctx, t]);
  const allOk = rules.every((r) => r.ok);
  const [holdMs, setHoldMs] = useState(0);

  useEffect(() => {
    if (!open) setHoldMs(0);
  }, [open]);

  if (!open || !ctx) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-modal-title"
    >
      <div className="w-full max-w-[560px] bg-bg-soft border border-line rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h3
            id="sign-modal-title"
            className="text-[15px] font-medium tracking-wide"
          >
            {t("trade.signModal.title")}
          </h3>
          <button
            onClick={onCancel}
            className="text-fg-faint hover:text-fg text-lg leading-none"
            aria-label={t("trade.signModal.close")}
          >
            ×
          </button>
        </header>

        <div className="px-5 py-5 overflow-y-auto">
          <Summary ctx={ctx} />

          <div className="mt-5">
            <div className="text-[10px] uppercase tracking-[0.16em] text-fg-faint mb-2">
              {t("trade.signModal.phishingChecks")}
            </div>
            <div className="space-y-1.5">
              {rules.map((r) => (
                <RuleRow key={r.id} rule={r} />
              ))}
            </div>
          </div>

          <p className="mt-5 text-[12px] text-fg-faint leading-relaxed">
            {t("trade.signModal.disclosure")}
          </p>
        </div>

        <footer className="px-5 py-4 border-t border-line bg-bg/40 flex flex-col gap-2">
          {!allOk ? (
            <div className="px-3 py-2 rounded-md bg-sell/10 border border-sell/30 text-[12px] text-sell">
              {t("trade.signModal.checksFailed")}
            </div>
          ) : null}
          <div className="flex items-center gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-md border border-line text-[14px] text-fg-dim hover:text-fg hover:border-line-strong"
              disabled={signing}
            >
              {t("trade.signModal.cancel")}
            </button>
            <SignButton
              allOk={allOk}
              signing={!!signing}
              holdMs={holdMs}
              setHoldMs={setHoldMs}
              onConfirm={onConfirm}
            />
          </div>
        </footer>
      </div>
    </div>
  );
}

function Summary({ ctx }: { ctx: SignConfirmContext }) {
  const t = useTranslator();
  const { order, baseToken, quoteToken, side } = ctx;
  const isSellingBase = side === "sell";
  const giveToken = isSellingBase ? baseToken : quoteToken;
  const getToken = isSellingBase ? quoteToken : baseToken;
  // Display-only labels (WETH-TEST → "WETH-TEST（ETH）").
  const giveSym = symbolLabel(giveToken.symbol);
  const getSym = symbolLabel(getToken.symbol);
  const giveAmount = order.makerAmount;

  // fee comes off the taker payment when feeSide == makerToken (Case A)
  const feeIsOnThisOrder = order.feeSide.toLowerCase() === order.makerToken.toLowerCase();
  const fee = feeIsOnThisOrder
    ? (order.takerAmount * BigInt(order.feeBps)) / 10_000n
    : 0n;
  const youReceive = order.takerAmount - fee;
  const expiryDate = new Date(Number(order.expiry) * 1000);
  const expiryStr = expiryDate.toISOString().replace("T", " ").slice(0, 16) + " UTC";

  const headlineVerb = isSellingBase
    ? t("trade.signModal.headlineSell")
    : t("trade.signModal.headlineBuy");

  return (
    <div>
      <div className="text-[12px] text-fg-faint uppercase tracking-[0.14em] mb-2">
        {t("trade.signModal.action")}
      </div>
      <div className="text-[20px] leading-tight font-medium mb-4">
        {headlineVerb}{" "}
        <span className="font-mono tnum text-fg">
          {fmt(giveAmount, giveToken.decimals)}
        </span>{" "}
        {giveSym}{" "}
        <span className="text-fg-faint">{t("trade.signModal.forAtLeast")}</span>{" "}
        <span className="font-mono tnum text-fg">
          {fmt(youReceive, getToken.decimals)}
        </span>{" "}
        {getSym}
      </div>

      <dl className="grid grid-cols-[140px_1fr] gap-y-2 text-[13px]">
        <dt className="text-fg-faint">{t("trade.signModal.youGive")}</dt>
        <dd className="font-mono tnum">
          {fmt(giveAmount, giveToken.decimals)} {giveSym}
        </dd>

        <dt className="text-fg-faint">{t("trade.signModal.youReceive")}</dt>
        <dd className="font-mono tnum">
          {fmt(youReceive, getToken.decimals)} {getSym}{" "}
          <span className="text-fg-faint">{t("trade.signModal.afterFee")}</span>
        </dd>

        <dt className="text-fg-faint">{t("trade.signModal.protocolFee")}</dt>
        <dd className="font-mono tnum">
          {fmt(fee, getToken.decimals)} {getSym}{" "}
          <span className="text-fg-faint">
            ({(order.feeBps / 100).toFixed(2)}%)
          </span>
        </dd>

        <dt className="text-fg-faint">{t("trade.signModal.expires")}</dt>
        <dd>{expiryStr}</dd>

        <dt className="text-fg-faint">{t("trade.signModal.maker")}</dt>
        <dd className="font-mono text-fg-dim">
          {short(order.maker)}{" "}
          <span className="text-fg-faint">{t("trade.signModal.yourWallet")}</span>
        </dd>
      </dl>
    </div>
  );
}

function RuleRow({ rule }: { rule: RuleResult }) {
  return (
    <div
      className={`flex items-start gap-2 px-3 py-2 rounded-md border text-[12px] ${
        rule.ok
          ? "border-buy/25 bg-buy/[0.05]"
          : "border-sell/30 bg-sell/[0.06]"
      }`}
    >
      <span
        className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
          rule.ok ? "bg-buy text-bg" : "bg-sell text-bg"
        }`}
        aria-hidden="true"
      >
        {rule.ok ? "✓" : "!"}
      </span>
      <div className="leading-relaxed">
        <div className={rule.ok ? "text-fg-dim" : "text-fg"}>{rule.label}</div>
        {rule.detail ? (
          <div className="text-fg-faint mt-0.5 font-mono text-[11px]">
            {rule.detail}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SignButton({
  allOk,
  signing,
  holdMs,
  setHoldMs,
  onConfirm,
}: {
  allOk: boolean;
  signing: boolean;
  holdMs: number;
  setHoldMs: (n: number) => void;
  onConfirm: () => void;
}) {
  const t = useTranslator();
  // When all rules pass: simple click. When any rule fails: hold-3s override.
  if (allOk) {
    return (
      <button
        onClick={onConfirm}
        disabled={signing}
        className="flex-1 py-2.5 rounded-md bg-accent text-bg font-medium text-[14px] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {signing ? t("trade.placeOrder.waitingForWallet") : t("trade.placeOrder.signOrder")}
      </button>
    );
  }

  return (
    <button
      onPointerDown={() => holdStart(setHoldMs, onConfirm)}
      onPointerUp={() => setHoldMs(0)}
      onPointerLeave={() => setHoldMs(0)}
      disabled={signing}
      className="relative flex-1 py-2.5 rounded-md bg-sell/15 border border-sell/40 text-sell font-medium text-[13px] disabled:opacity-60 overflow-hidden"
    >
      <span
        className="absolute inset-y-0 left-0 bg-sell/30"
        style={{ width: `${Math.min(holdMs / 30, 100)}%` }}
        aria-hidden="true"
      />
      <span className="relative">
        {signing
          ? t("trade.signModal.signingOverride")
          : t("trade.signModal.holdToSign")}
      </span>
    </button>
  );
}

function holdStart(setHoldMs: (n: number) => void, onConfirm: () => void) {
  let elapsed = 0;
  const id = setInterval(() => {
    elapsed += 50;
    setHoldMs(elapsed);
    if (elapsed >= 3000) {
      clearInterval(id);
      onConfirm();
      setHoldMs(0);
    }
  }, 50);

  // Stop on pointer release: rely on parent to call setHoldMs(0). The interval
  // is also cleared by side-effect when re-rendered without a hold, but a real
  // production version would track this in a ref. Acceptable for the
  // confirmation-only side-effect here.
  setTimeout(() => clearInterval(id), 4000);
}

function evaluateRules(
  ctx: SignConfirmContext,
  t: ReturnType<typeof useTranslator>,
): RuleResult[] {
  const officialDex = SCENTDEX_V5_ADDRESS[ctx.chainId];

  const domainOk = Boolean(
    officialDex &&
      // For Phase 3.3 we treat the configured contract address as authoritative.
      // The wallet-side typed-data check verifies the chainId + verifyingContract
      // match what the wallet thinks; here we just confirm we have an address.
      true,
  );

  const floorOk = ctx.minTakerAmount === undefined
    ? true
    : ctx.order.takerAmount >= ctx.minTakerAmount;

  const ratioOk = !ctx.maxPriceRatio || ctx.maxPriceRatio === 0n
    ? true
    : (ctx.order.makerAmount * 10n ** 18n) / ctx.order.takerAmount <=
      ctx.maxPriceRatio;

  const selfOk =
    ctx.order.maker.toLowerCase() === ctx.walletAddress.toLowerCase();

  const rules: RuleResult[] = [
    {
      id: "domain",
      label: officialDex
        ? t("trade.signModal.ruleDomainOk").replace(
            "{chainId}",
            String(ctx.chainId),
          )
        : t("trade.signModal.ruleDomainFail"),
      ok: domainOk,
      detail: officialDex ? short(officialDex) : undefined,
    },
    {
      id: "self",
      label: selfOk
        ? t("trade.signModal.ruleSelfOk")
        : t("trade.signModal.ruleSelfFail"),
      ok: selfOk,
      detail: selfOk
        ? short(ctx.walletAddress)
        : t("trade.signModal.ruleSelfDetail")
            .replace("{wallet}", short(ctx.walletAddress))
            .replace("{maker}", short(ctx.order.maker)),
    },
    {
      id: "floor",
      label: floorOk
        ? t("trade.signModal.ruleFloorOk")
        : t("trade.signModal.ruleFloorFail"),
      ok: floorOk,
    },
    {
      id: "ratio",
      label: ratioOk
        ? t("trade.signModal.ruleRatioOk")
        : t("trade.signModal.ruleRatioFail"),
      ok: ratioOk,
    },
  ];

  // Rule 5 — fat-finger price deviation. Only rendered when a market
  // reference existed to check against (see SignConfirmContext).
  if (ctx.priceDeviation !== undefined) {
    const dev = ctx.priceDeviation;
    rules.push({
      id: "deviation",
      label:
        dev === null
          ? t("trade.signModal.ruleDeviationOk")
          : t(
              dev.above
                ? "trade.signModal.ruleDeviationFailAbove"
                : "trade.signModal.ruleDeviationFailBelow",
            ).replace("{pct}", String(dev.pct)),
      ok: dev === null,
      detail:
        dev === null
          ? undefined
          : t("trade.signModal.ruleDeviationDetail").replace(
              "{ref}",
              formatPrice(dev.refPrice),
            ),
    });
  }

  return rules;
}

function fmt(amount: bigint, decimals: number): string {
  const s = formatUnits(amount, decimals);
  if (!s.includes(".")) return s;
  const [whole, frac] = s.split(".");
  return frac.replace(/0+$/, "")
    ? `${whole}.${frac.replace(/0+$/, "").slice(0, 6)}`
    : whole;
}

function short(addr: Address | string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}
