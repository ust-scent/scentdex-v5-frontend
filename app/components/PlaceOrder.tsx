"use client";

import {
  SignConfirmModal,
  type SignConfirmContext,
} from "@/app/components/SignConfirmModal";
import { TermsConsentCheckbox } from "@/app/components/TermsConsentCheckbox";
import { useTranslator } from "@/lib/locale-context";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { useTokenStatus } from "@/lib/hooks/useTokenStatus";
import {
  buildAmounts,
  buildDomain,
  expiryFromChoice,
  ORDER_TYPES,
  randomSalt,
  type Order,
} from "@/lib/order";
import {
  buildOrderPermit,
  buildPermit2Domain,
  PERMIT_SINGLE_TYPES,
  serialisePermitSingle,
  type PermitSingle,
} from "@/lib/permit2";
import { useBestPrices } from "@/lib/hooks/useBestPrices";
import { useIsWrongNetwork } from "@/lib/hooks/useNetworkGuard";
import { useFillEvents } from "@/lib/hooks/useFillEvents";
import { formatPrice } from "@/lib/format-price";
import { useWeth } from "@/lib/hooks/useWeth";
import { TOKENS, feeConfig, symbolLabel, type Pair, type Token } from "@/lib/tokens";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatUnits, parseUnits, type Hex } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSignTypedData,
} from "wagmi";

import { PERMIT2_ABI } from "@/lib/abi";
import { PERMIT2_ADDRESS } from "@/lib/contracts";

type Side = "buy" | "sell";
type ExpiryChoice = "1d" | "1w" | "1mo" | "1y";

const DEFAULT_EXPIRY: ExpiryChoice = "1mo";

export function PlaceOrder({ pair }: { pair: Pair }) {
  const t = useTranslator();
  const [side, setSide] = useState<Side>("sell");
  /** Unit price the maker wants, expressed as quote per 1 base. */
  const [unitPrice, setUnitPrice] = useState("");
  /**
   * Maker-side size: how much the maker is giving up.
   *  - SELL: base amount to sell
   *  - BUY:  quote budget to spend
   */
  const [size, setSize] = useState("");
  const [expiry, setExpiry] = useState<ExpiryChoice>(DEFAULT_EXPIRY);
  const [showExpiryDetail, setShowExpiryDetail] = useState(false);

  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const isWrongNetwork = useIsWrongNetwork();
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  // Direct viem client. Needed to read Permit2.allowance(maker, makerToken,
  // DEX).nonce SYNCHRONOUSLY at sign time so we never embed a stale nonce
  // into PermitSingle. The wagmi useReadContract path is cache-driven and
  // gives the value as of the last mount/refetch, which means once the
  // maker has filled any prior order on the same token the cached "0"
  // mismatches the on-chain "1" and AllowanceTransfer.permit reverts
  // InvalidNonce at fill time.
  const publicClient = usePublicClient({ chainId });

  const baseToken = TOKENS.find((t) => t.symbol === pair.base)!;
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote)!;

  // The maker token is the one the user gives up: base on sell, quote on buy.
  // Permit2 needs to be approved for THAT token before any taker can fill.
  const makerToken = side === "sell" ? baseToken : quoteToken;
  const makerStatus = useTokenStatus(makerToken);

  // Auto-wrap (SDT/WETH test market): when the maker pays in WETH, the user
  // thinks in ETH — if their WETH balance can't cover the order we wrap the
  // shortfall via WETH9.deposit() as an extra leading tx, then continue the
  // normal approve→sign chain. Inert on every non-WETH pair (and WETH has no
  // mainnet address, so mainnet behaviour is untouched).
  const weth = useWeth();
  const isWethMaker = Boolean(makerToken.wrapsNative);
  const neededMakerAmount = useMemo(() => {
    if (!isWethMaker) return 0n;
    try {
      return parseUnits((size || "0") as `${number}`, makerToken.decimals);
    } catch {
      return 0n;
    }
  }, [isWethMaker, size, makerToken.decimals]);
  const wethShortfall = isWethMaker ? weth.shortfallFor(neededMakerAmount) : 0n;
  // True between the wrap click and its receipt; the effect below advances
  // to approve/sign exactly once.
  const awaitingWrap = useRef(false);

  // Live price hint from on-chain OrderFilled events (round-2). Used as
  // the placeholder in the unit price input so the user has a sane anchor
  // when they don't know what number to type.
  const stats = useFillEvents(pair);

  const { signTypedDataAsync, isPending: signing } = useSignTypedData();

  const [modalOpen, setModalOpen] = useState(false);
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null);
  const [lastResult, setLastResult] = useState<
    { ok: true; signature: string; orderHash?: string } | { ok: false; error: string } | null
  >(null);
  // Per-order click-wrap consent. Reset to `false` after every submit
  // attempt (success or failure) so the maker must re-tick the box for
  // each new order — i.e. the user re-affirms the Terms every time.
  const [termsAgreed, setTermsAgreed] = useState(false);

  // True between the moment the user clicks "Sign Order" and the modal opens.
  // While set, the auto-approve flow is gating: as soon as the maker token's
  // ERC-20 → Permit2 leg is in place, we proceed to build + show the sign
  // modal. (Permit2 → DEX is no longer a pre-approved allowance — round-3
  // moved that to a per-order PermitSingle signed inside confirmSign().)
  const awaitingApproval = useRef(false);

  // -- Form-derived totals ---------------------------------------------
  const cfg = feeConfig(pair, chainId);
  const totals = useMemo(() => {
    // Comma / space tolerant: "1,000,000" would otherwise Number() to NaN and
    // collapse the whole receipt preview to 0.00 (tester D-02).
    const sizeN = Number(size.replace(/[,\s]/g, ""));
    const priceN = Number(unitPrice.replace(/[,\s]/g, ""));
    if (
      !Number.isFinite(sizeN) ||
      !Number.isFinite(priceN) ||
      sizeN <= 0 ||
      priceN <= 0
    ) {
      return {
        gross: 0,
        fee: 0,
        net: 0,
        derivedReceive: 0,
        derivedReceiveSymbol: symbolLabel(
          side === "sell" ? quoteToken.symbol : baseToken.symbol,
        ),
      };
    }

    // Sell: the maker gives `size` of base, expects size * price of quote.
    // Buy:  the maker gives `size` of quote (budget), expects size / price of base.
    let derivedReceive: number;
    let derivedReceiveSymbol: string;
    let grossInQuote: number;
    if (side === "sell") {
      derivedReceive = sizeN * priceN;
      derivedReceiveSymbol = symbolLabel(quoteToken.symbol);
      grossInQuote = derivedReceive;
    } else {
      derivedReceive = sizeN / priceN;
      derivedReceiveSymbol = symbolLabel(baseToken.symbol);
      grossInQuote = sizeN; // budget IS the gross quote amount
    }

    // Fee is paid in the takerToken (Case A from V5 contract). Only applies
    // when the maker's makerToken matches the pair's feeSide token.
    // Sell: makerToken = base; fee applies iff feeSide == base. Fee comes off the maker's quote receive.
    // Buy:  makerToken = quote; fee applies iff feeSide == quote. Fee comes off the maker's base receive.
    const feeApplies =
      side === "sell" ? cfg.feeSide === pair.base : cfg.feeSide === pair.quote;
    const fee = feeApplies ? (derivedReceive * cfg.feeBps) / 10_000 : 0;
    const net = derivedReceive - fee;

    return {
      gross: grossInQuote,
      fee,
      net,
      derivedReceive,
      derivedReceiveSymbol,
    };
  }, [size, unitPrice, side, cfg.feeBps, cfg.feeSide, pair.base, pair.quote, baseToken.symbol, quoteToken.symbol]);

  // Pre-build the order (bigint-exact) so the form can validate before sign:
  //  - null when inputs are empty/invalid, OR when the amounts round to 0
  //    (dust order) — buildAmounts returns null for a zero maker/taker amount.
  //  - the maker-token amount the order actually spends (for the balance gate).
  const builtOrder = useMemo(() => {
    const sizeN = Number(size);
    const priceN = Number(unitPrice);
    if (!Number.isFinite(sizeN) || !Number.isFinite(priceN) || sizeN <= 0 || priceN <= 0)
      return null;
    return buildAmounts({ side, base: baseToken, quote: quoteToken, size, unitPrice, chainId });
  }, [side, size, unitPrice, chainId, baseToken, quoteToken]);
  const makerNeeded = builtOrder?.makerAmount ?? 0n;

  // -- Reasons we can't sign yet ---------------------------------------
  const reasons: string[] = [];
  if (!isConnected) reasons.push(t("trade.placeOrder.connectWallet"));
  // Wrong-network gate keyed off the wallet's REAL chain (useIsWrongNetwork),
  // not useChainId() — on a single-chain prod config useChainId is clamped to
  // mainnet even when the wallet is on Polygon, which let orders be signed
  // from the wrong network (tester E-04).
  if (isConnected && isWrongNetwork) reasons.push(t("trade.placeOrder.wrongNetwork"));
  else if (!dexAddress) reasons.push(t("trade.placeOrder.wrongNetwork"));
  if (
    dexAddress &&
    (!baseToken.addresses[chainId] || !quoteToken.addresses[chainId])
  )
    reasons.push(t("trade.placeOrder.pairNotAvailable"));
  if (!unitPrice || Number(unitPrice) <= 0)
    reasons.push(t("trade.placeOrder.enterPrice"));
  if (!size || Number(size) <= 0)
    reasons.push(t("trade.placeOrder.enterAmount"));
  // Amount-too-small: valid positive inputs but the order rounds to a zero
  // maker/taker amount (dust, e.g. 1e-20 SDT). Would be a degenerate order.
  else if (unitPrice && Number(unitPrice) > 0 && builtOrder === null)
    reasons.push(t("trade.placeOrder.amountTooSmall"));
  // Balance gate. WETH maker side counts WETH + wrappable ETH (auto-wrap);
  // every other maker token gates on the plain token balance so a maker
  // cannot sign an order for more than they hold (fails at fill otherwise).
  if (isWethMaker) {
    if (neededMakerAmount > 0n && neededMakerAmount > weth.spendable)
      reasons.push(t("trade.placeOrder.insufficientEthWeth"));
  } else if (makerNeeded > 0n && makerNeeded > makerStatus.balance) {
    reasons.push(t("trade.placeOrder.insufficientBalance"));
  }
  const canSign = reasons.length === 0;

  // Non-blocking warning: the entered unit price is wildly off the last
  // traded price (fat-finger / crossed book). Does NOT disable signing — the
  // maker may legitimately post far from market — but flags it so a mis-typed
  // 1e24 price isn't submitted silently (tester E-07 / E-10).
  const priceFarFromMarket = (() => {
    const p = Number(unitPrice.replace(/[,\s]/g, ""));
    const last = stats.latestPrice;
    if (!last || last <= 0 || !Number.isFinite(p) || p <= 0) return false;
    return p > last * 20 || p < last / 20;
  })();

  // Non-blocking warning (E-10 strict): the entered price crosses the live
  // book — a buy at/above the best ask, or a sell at/below the best bid.
  // Complements the last-trade deviation heuristic above with the actual
  // resting orders, so a maker who is about to be instantly filled at their
  // own price sees it BEFORE signing. Never disables signing: crossing on
  // purpose is a legitimate way to take liquidity on a signed-order DEX.
  const book = useBestPrices(pair);
  const crossesBook = (() => {
    const p = Number(unitPrice.replace(/[,\s]/g, ""));
    if (!Number.isFinite(p) || p <= 0) return null;
    if (side === "buy" && book.bestAsk !== null && p >= book.bestAsk)
      return { key: "trade.placeOrder.crossesBookBuy" as const, at: book.bestAsk };
    if (side === "sell" && book.bestBid !== null && p <= book.bestBid)
      return { key: "trade.placeOrder.crossesBookSell" as const, at: book.bestBid };
    return null;
  })();

  function proceedToModal() {
    if (!account || !dexAddress) return;

    const amounts = buildAmounts({
      side,
      base: baseToken,
      quote: quoteToken,
      size,
      unitPrice,
      chainId,
    });
    if (!amounts) {
      setLastResult({ ok: false, error: t("trade.placeOrder.couldNotBuild") });
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
      nonce: BigInt(Math.floor(Date.now() / 1000)),
      salt: randomSalt(),
      feeSide,
      feeBps,
    };

    setPendingOrder(order);
    setLastResult(null);
    setModalOpen(true);
  }

  // Effect: when an order-sign click is gated on approval, auto-advance to
  // building + opening the modal as soon as both legs are in place.
  // proceedToModal sets pendingOrder + modalOpen, which is what we want — the
  // strict purity rule flags this but the cascade is intentional here, gated
  // by the awaitingApproval ref so it only fires once per click.
  useEffect(() => {
    if (!awaitingApproval.current) return;
    if (!makerStatus.isFullyApproved) return;
    awaitingApproval.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    proceedToModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makerStatus.isFullyApproved]);

  // Effect: auto-advance after the auto-wrap deposit confirms — continue the
  // same chain a plain startSign() click would have taken (approve if the
  // Permit2 leg is missing, otherwise straight to the sign modal).
  useEffect(() => {
    if (!awaitingWrap.current) return;
    if (!weth.isWrapConfirmed) return;
    awaitingWrap.current = false;
    void makerStatus.refetchBalance();
    if (!makerStatus.isErc20Approved) {
      awaitingApproval.current = true;
      makerStatus.approve();
      return;
    }
    proceedToModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weth.isWrapConfirmed]);

  // Effect: surface a wrap failure (user reject / RPC error) instead of
  // leaving the button stuck in the wrapping state.
  useEffect(() => {
    if (!weth.wrapError || !awaitingWrap.current) return;
    awaitingWrap.current = false;
    const msg =
      weth.wrapError instanceof Error
        ? weth.wrapError.message
        : String(weth.wrapError);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLastResult({ ok: false, error: msg.slice(0, 160) });
    weth.resetWrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weth.wrapError]);

  function startSign() {
    if (!canSign || !account || !dexAddress) return;

    // Auto-wrap leg (WETH maker side only): top the WETH balance up to the
    // order size from native ETH before anything else. The effect above
    // resumes the approve/sign chain once the deposit confirms.
    if (isWethMaker && wethShortfall > 0n) {
      awaitingWrap.current = true;
      weth.wrap(wethShortfall);
      return;
    }

    // If the wallet → Permit2 leg isn't approved yet, fire that one
    // on-chain transaction first. The effect above watches for it and
    // auto-advances to the sign modal once it confirms. The user gets at
    // most: 1 on-chain approve tx (only if missing) + 2 wallet signatures
    // (Order + per-order PermitSingle, both off-chain, no gas).
    if (!makerStatus.isErc20Approved) {
      awaitingApproval.current = true;
      makerStatus.approve();
      return;
    }

    proceedToModal();
  }

  async function confirmSign() {
    if (!pendingOrder || !dexAddress) return;

    // Why two signatures and not one:
    //
    // V5's `_fillOrder` independently ECDSA-recovers two signatures —
    // one over the Order EIP-712 hash, one over the Permit2 PermitSingle
    // hash. Different domain separators, different struct hashes, two
    // distinct messages by construction. There is no standard EIP-712
    // multi-sign primitive (eth_signTypedData_v4 takes a single typed
    // data per call), and EIP-5792 `wallet_sendCalls` only batches
    // on-chain transactions, not signatures. MetaMask in particular
    // does not implement batch signing.
    //
    // To collapse to one wallet popup we'd need to either (a) redesign
    // the contract so a single signature covers both hashes (V6 +
    // re-audit), or (b) drop Permit2 in favour of a custom transfer
    // path (significant audit surface regression). Round-3 keeps the
    // two-popup UX since it matches the Uniswap / CoW Swap industry
    // pattern and preserves the per-order security gain.

    try {
      // Read Permit2 allowance.nonce DIRECTLY from RPC (no wagmi cache).
      // The on-chain nonce increments every time _fillOrder calls
      // permit2.permit(maker, ...), so any cached value goes stale the
      // instant one of this maker's prior orders on this token fills.
      // Embedding the stale value reverts AllowanceTransfer.permit at
      // fill time and burns the taker's gas.
      let permit2Nonce = makerStatus.permit2DexNonce;
      if (publicClient && account) {
        try {
          const allowance = (await publicClient.readContract({
            address: PERMIT2_ADDRESS,
            abi: PERMIT2_ABI,
            functionName: "allowance",
            args: [account, pendingOrder.makerToken, dexAddress],
          })) as readonly [bigint, number, number];
          permit2Nonce = Number(allowance[2]);
          // Keep the hook's view in sync so the UI Permit2 tab does not
          // lag behind reality.
          if (permit2Nonce !== makerStatus.permit2DexNonce) {
            void makerStatus.refetchPermit2Nonce();
          }
        } catch (e) {
          setLastResult({
            ok: false,
            error: `Could not read Permit2 nonce: ${
              e instanceof Error ? e.message.slice(0, 120) : String(e).slice(0, 120)
            }`,
          });
          return;
        }
      }

      // Pre-build the Permit2 PermitSingle so we can fire its sign
      // request the moment the Order signature returns — no hash work
      // happens between the two popups.
      const permitSingle: PermitSingle = buildOrderPermit({
        ownerNonce: permit2Nonce,
        makerToken: pendingOrder.makerToken,
        makerAmount: pendingOrder.makerAmount,
        expiry: pendingOrder.expiry,
        dex: dexAddress,
      });

      // Wallet popup #1: the Order itself.
      const signature = await signTypedDataAsync({
        domain: buildDomain(chainId, dexAddress),
        types: ORDER_TYPES,
        primaryType: "Order",
        message: pendingOrder as unknown as Record<string, unknown>,
      } as Parameters<typeof signTypedDataAsync>[0]);

      // Wallet popup #2: the per-order Permit2 PermitSingle. amount /
      // expiration are bound 1:1 to the order, so this signature only
      // authorises what the order itself can spend — no idle blanket
      // allowance is created.
      let permitSignature: Hex;
      try {
        permitSignature = (await signTypedDataAsync({
          domain: buildPermit2Domain(chainId),
          types: PERMIT_SINGLE_TYPES,
          primaryType: "PermitSingle",
          message: permitSingle as unknown as Record<string, unknown>,
        } as Parameters<typeof signTypedDataAsync>[0])) as Hex;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setLastResult({
          ok: false,
          error: `Permit2 sign cancelled: ${msg.slice(0, 140)}`,
        });
        return;
      }

      // Post to /api/orders so it lands on the order book.
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          order: serialiseOrder(pendingOrder),
          signature,
          pair: `${pair.base}/${pair.quote}`,
          chainId,
          permitSingle: serialisePermitSingle(permitSingle),
          permitSignature,
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
      setSize("");
      setUnitPrice("");
      setTermsAgreed(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLastResult({ ok: false, error: msg.slice(0, 160) });
      setTermsAgreed(false);
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
          {t("trade.placeOrder.title")}
        </h2>
        <div className="flex items-center gap-1 text-[11px] font-mono text-fg-faint">
          <kbd className="px-1.5 py-0.5 border border-line rounded">B</kbd>
          <span className="text-fg-faint">/</span>
          <kbd className="px-1.5 py-0.5 border border-line rounded">S</kbd>
        </div>
      </header>

      <div className="p-4 flex flex-col gap-4 flex-1">
        {/* Wallet balances for the current pair */}
        <BalanceStrip baseToken={baseToken} quoteToken={quoteToken} />

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
            {t("trade.placeOrder.buy").replace("{base}", symbolLabel(pair.base))}
          </button>
          <button
            onClick={() => setSide("sell")}
            className={`py-2.5 rounded-md text-[14px] font-medium transition-colors ${
              side === "sell"
                ? "bg-sell text-bg"
                : "bg-white/[0.03] text-fg-dim hover:text-fg"
            }`}
          >
            {t("trade.placeOrder.sell").replace("{base}", symbolLabel(pair.base))}
          </button>
        </div>

        {/*
         * Order of inputs follows how a person actually thinks:
         *   SELL → "How much do I want to sell?"  →  "At what price?"
         *   BUY  → "How much do I want to spend?" →  "At what price?"
         * Size is always denominated on the maker side (the side the user
         * gives up), so the % buttons against the maker-side balance are
         * a natural fit and require no decimal arithmetic from the user.
         */}
        <SizeField
          side={side}
          baseSymbol={symbolLabel(pair.base)}
          quoteSymbol={symbolLabel(pair.quote)}
          value={size}
          onChange={(v) => { setSize(v); if (lastResult) setLastResult(null); }}
        />

        <PercentButtons
          // WETH maker side: the % base is WETH + wrappable ETH (minus a gas
          // buffer) since auto-wrap tops the difference up at sign time.
          balance={isWethMaker ? weth.spendable : makerStatus.balance}
          decimals={makerToken.decimals}
          onPick={(v) => { setSize(v); if (lastResult) setLastResult(null); }}
        />

        <PriceField
          side={side}
          baseSymbol={symbolLabel(pair.base)}
          quoteSymbol={symbolLabel(pair.quote)}
          value={unitPrice}
          onChange={(v) => { setUnitPrice(v); if (lastResult) setLastResult(null); }}
          marketPriceHint={stats.latestPrice}
        />

        {priceFarFromMarket ? (
          <div className="mt-1 px-3 py-2 rounded-md border border-amber-500/40 bg-amber-500/[0.06] text-[11px] text-amber-300 leading-relaxed">
            {t("trade.placeOrder.priceFarFromMarket")}
          </div>
        ) : null}

        {crossesBook ? (
          <div className="mt-1 px-3 py-2 rounded-md border border-amber-500/40 bg-amber-500/[0.06] text-[11px] text-amber-300 leading-relaxed">
            {t(crossesBook.key).replace("{price}", formatPrice(crossesBook.at))}
          </div>
        ) : null}

        {/*
         * Receipt preview: derived from size + unit price. Sells produce
         * quote; buys produce base. We also surface the gross + protocol
         * fee so the user knows exactly what's coming off.
         */}
        <div className="mt-2 px-3 py-3 rounded-md bg-white/[0.015] border border-line space-y-2 text-[13px]">
          <Row
            k={
              side === "sell"
                ? t("trade.placeOrder.grossSell").replace("{symbol}", symbolLabel(pair.quote))
                : t("trade.placeOrder.grossBuy").replace("{symbol}", symbolLabel(pair.base))
            }
            v={`${fmtNum(totals.derivedReceive)} ${totals.derivedReceiveSymbol}`}
          />
          <Row
            k={t("trade.placeOrder.makerFee").replace(
              "{bps}",
              // Same fix as StatsBar — sub-1% rates (e.g. 30 bps = 0.3%)
              // were collapsing to "0%" under toFixed(0).
              (cfg.feeBps / 100).toLocaleString("en-US", {
                maximumFractionDigits: 2,
              }),
            )}
            v={`${fmtNum(totals.fee)} ${totals.derivedReceiveSymbol}`}
          />
          <Row
            k={t("trade.placeOrder.youReceive")}
            v={`${fmtNum(totals.net)} ${totals.derivedReceiveSymbol}`}
            dim
          />
        </div>
        {/* V6 Case B disclosure for the maker side. When the maker isn't the
             feeSide-seller (e.g. maker buys SCENT with feeSide=SCENT), the
             contract still charges 10% — but on the *taker's* receive of the
             quote currency, not the maker's. The maker's totals shown above
             remain correct (no fee on their side); this note tells the maker
             how the symmetric fee will manifest when a taker fills the order
             by selling the feeSide token. Without this, a maker posting a
             SCENT-buy order would assume "no fee" applies anywhere. */}
        {(side === "sell" ? cfg.feeSide === pair.quote : cfg.feeSide === pair.base) ? (
          <div className="mt-2 px-3 py-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] text-[11px] text-amber-300 leading-relaxed">
            {t("trade.placeOrder.caseBTakerNote")
              .replace("{feeSide}", symbolLabel(cfg.feeSide === pair.base ? pair.base : pair.quote))
              // {quote} = the currency the taker actually receives (i.e. the
              // maker's makerToken in this fill). For a sell-side maker order
              // this is pair.base; for a buy-side maker order this is pair.quote.
              .replace("{quote}", symbolLabel(side === "sell" ? pair.base : pair.quote))
              // {makerToken} = the token the maker pays out (= maker's makerToken).
              .replace("{makerToken}", symbolLabel(side === "sell" ? pair.base : pair.quote))
              .replace(
                "{bps}",
                (cfg.feeBps / 100).toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                }),
              )}
          </div>
        ) : null}

        <ExpiryRow
          choice={expiry}
          onChange={setExpiry}
          expanded={showExpiryDetail}
          onToggle={() => setShowExpiryDetail((v) => !v)}
        />

        {lastResult ? (
          lastResult.ok ? (
            <div
              role="status"
              aria-live="polite"
              className="px-4 py-3 rounded-md border-2 border-buy/50 bg-buy/[0.08]"
            >
              <div className="flex items-center gap-2 text-buy text-[15px] font-semibold">
                <span aria-hidden="true">✓</span>
                <span>{t("trade.placeOrder.orderPlacedHeader")}</span>
              </div>
              <div className="text-[12px] text-fg-dim mt-2 leading-relaxed">
                {t("trade.placeOrder.orderPosted")}
              </div>
              <div className="text-[11px] text-fg-faint mt-1">
                {t("trade.placeOrder.orderSigned")}{" "}
                <span className="font-mono">
                  {lastResult.signature.slice(0, 10)}…
                  {lastResult.signature.slice(-8)}
                </span>
              </div>
            </div>
          ) : (
            <div
              role="alert"
              aria-live="assertive"
              className="px-4 py-3 rounded-md border-2 border-sell/50 bg-sell/[0.08]"
            >
              <div className="flex items-center gap-2 text-sell text-[15px] font-semibold">
                <span aria-hidden="true">✗</span>
                <span>{t("trade.placeOrder.orderFailedHeader")}</span>
              </div>
              <div className="text-[12px] text-fg-dim mt-2 leading-relaxed break-words">
                {lastResult.error}
              </div>
            </div>
          )
        ) : null}

        {signing || makerStatus.isApproving || weth.isWrapping ? (
          <div
            role="status"
            aria-live="polite"
            className="px-3 py-2 rounded-md border border-amber-500/30 bg-amber-500/[0.05] text-[12px] text-amber-300"
          >
            {t("trade.fillModal.walletPopupHint")}
          </div>
        ) : null}

        <TermsConsentCheckbox
          checked={termsAgreed}
          onChange={setTermsAgreed}
        />

        <button
          onClick={startSign}
          disabled={
            !canSign ||
            !termsAgreed ||
            signing ||
            makerStatus.isApproving ||
            weth.isWrapping
          }
          className="mt-2 w-full py-3 rounded-md bg-accent text-bg font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          title={
            !termsAgreed && canSign
              ? t("terms.consent.required")
              : reasons.join(" · ")
          }
        >
          {!canSign
            ? reasons[0]
            : weth.isWrapping
            ? t("trade.placeOrder.wrappingEth")
            : makerStatus.approveStep === "approving"
            ? t("trade.placeOrder.approvingErc20").replace(
                "{symbol}",
                symbolLabel(makerToken.symbol),
              )
            : signing
            ? t("trade.placeOrder.waitingForWallet")
            : !makerStatus.isErc20Approved
            ? t("trade.placeOrder.approveAndSign").replace(
                "{symbol}",
                symbolLabel(makerToken.symbol),
              )
            : t("trade.placeOrder.signOrder")}
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
  hint,
  children,
}: {
  label: React.ReactNode;
  suffix: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-end justify-between mb-1.5 gap-2">
        <span className="text-[12px] text-fg-dim">{label}</span>
        <span className="text-[11px] text-fg-faint font-mono">{suffix}</span>
      </div>
      <div className="px-3 py-2.5 bg-white/[0.02] border border-line rounded-md focus-within:border-line-strong">
        {children}
      </div>
      {hint ? (
        <div className="mt-1 text-[11px] text-fg-faint">{hint}</div>
      ) : null}
    </div>
  );
}

/**
 * Size input — denominated on the maker side. Sell asks the user how
 * much of the base they want to sell; Buy asks how much of the quote
 * they want to spend (their budget). The label is a question, not a
 * data-shaped noun, because that's how the user is actually thinking.
 */
function SizeField({
  side,
  baseSymbol,
  quoteSymbol,
  value,
  onChange,
}: {
  side: "buy" | "sell";
  baseSymbol: string;
  quoteSymbol: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const t = useTranslator();
  const label =
    side === "sell"
      ? t("trade.placeOrder.sizeSellQuestion").replace("{base}", baseSymbol)
      : t("trade.placeOrder.sizeBuyQuestion").replace("{quote}", quoteSymbol);
  const suffix = side === "sell" ? baseSymbol : quoteSymbol;
  return (
    <Field label={label} suffix={suffix}>
      <input
        inputMode="decimal"
        placeholder="0.00"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[16px] font-mono tnum placeholder:text-fg-faint"
      />
    </Field>
  );
}

/**
 * Unit price input. Always quote per 1 base mathematically; the prompt
 * verb flips with side so the question reads as a complete Japanese
 * sentence ("…で売りたい？" vs "…で買いたい？") instead of just trailing
 * off after the price unit.
 */
function PriceField({
  side,
  baseSymbol,
  quoteSymbol,
  value,
  onChange,
  marketPriceHint,
}: {
  side: "buy" | "sell";
  baseSymbol: string;
  quoteSymbol: string;
  value: string;
  onChange: (v: string) => void;
  marketPriceHint?: number;
}) {
  const t = useTranslator();
  const labelKey =
    side === "sell"
      ? "trade.placeOrder.priceQuestionSell"
      : "trade.placeOrder.priceQuestionBuy";
  const label = t(labelKey).replace("{base}", baseSymbol);
  const suffix = `${quoteSymbol} / ${baseSymbol}`;
  const hint =
    marketPriceHint !== undefined && marketPriceHint > 0 ? (
      <span>
        {t("trade.placeOrder.marketPriceHint").replace(
          "{price}",
          marketPriceHint.toLocaleString("en-US", {
            maximumFractionDigits: marketPriceHint >= 1 ? 4 : 8,
          }),
        )}
      </span>
    ) : undefined;
  const placeholder =
    marketPriceHint !== undefined && marketPriceHint > 0
      ? marketPriceHint.toLocaleString("en-US", {
          maximumFractionDigits: marketPriceHint >= 1 ? 4 : 8,
        })
      : "0.00";
  return (
    <Field label={label} suffix={suffix} hint={hint}>
      <input
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent outline-none text-[16px] font-mono tnum placeholder:text-fg-faint"
      />
    </Field>
  );
}

/**
 * 25/50/75/100 % buttons against the maker-side balance. "100%" sets the
 * size input to the entire balance; "50%" to half; etc. Wires through
 * `onPick` rather than mutating size directly so we keep the input the
 * single source of truth.
 */
function PercentButtons({
  balance,
  decimals,
  onPick,
}: {
  balance: bigint;
  decimals: number;
  onPick: (decimalString: string) => void;
}) {
  const pick = (pct: number) => {
    if (balance === 0n) {
      onPick("0");
      return;
    }
    // bigint-safe percentage: scale by 10000 to keep one decimal of pct
    // resolution (25/50/75/100 are integers so this is exact).
    const scaled = (balance * BigInt(pct)) / 100n;
    onPick(formatUnits(scaled, decimals));
  };
  return (
    <div className="grid grid-cols-4 gap-2">
      {[25, 50, 75, 100].map((pct) => (
        <button
          key={pct}
          onClick={() => pick(pct)}
          className="py-1.5 rounded-md border border-line bg-white/[0.02] text-[12px] text-fg-dim hover:text-fg hover:border-line-strong transition-colors"
        >
          {pct} %
        </button>
      ))}
    </div>
  );
}

/**
 * Order expiry selector. Default is 1 month — V5 requires a non-zero
 * expiry, but past 30 days the price drift risk vs market grows enough
 * that the maker probably wants to re-sign anyway. The four-button row
 * is hidden behind a disclosure so the form stays clean for the common
 * case where the user doesn't care.
 */
function ExpiryRow({
  choice,
  onChange,
  expanded,
  onToggle,
}: {
  choice: "1d" | "1w" | "1mo" | "1y";
  onChange: (c: "1d" | "1w" | "1mo" | "1y") => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const t = useTranslator();
  const labelFor = (c: typeof choice) =>
    t(`trade.placeOrder.expiryOption.${c}` as never) as string;
  return (
    <div className="border-t border-line pt-3">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-[12px] text-fg-faint hover:text-fg-dim"
      >
        <span>
          {t("trade.placeOrder.expires")}{" "}
          <span className="text-fg-dim">{labelFor(choice)}</span>
        </span>
        <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded ? (
        <div className="mt-2 grid grid-cols-4 gap-2">
          {(["1d", "1w", "1mo", "1y"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`py-1.5 rounded-md border text-[12px] transition-colors ${
                choice === opt
                  ? "border-accent text-fg bg-accent-soft"
                  : "border-line bg-white/[0.02] text-fg-dim hover:text-fg hover:border-line-strong"
              }`}
            >
              {labelFor(opt)}
            </button>
          ))}
        </div>
      ) : null}
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
  // Dust-priced pairs (1 SDT = 0.000005 WETH) produce sub-1 receive/fee
  // values that six fraction digits round away (tester D-05: 0.00061728 ->
  // 0.000617). Give small magnitudes more precision; large values keep it
  // tight (toLocaleString drops trailing zeros so "4.5"/"5" are unaffected).
  const maxFrac = Math.abs(n) < 1 ? 12 : 6;
  return n.toLocaleString("en-US", { maximumFractionDigits: maxFrac });
}

function BalanceStrip({
  baseToken,
  quoteToken,
}: {
  baseToken: Token;
  quoteToken: Token;
}) {
  const t = useTranslator();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  const onSupportedChain = Boolean(dexAddress);

  return (
    <div className="px-3 py-2.5 rounded-md border border-line-strong bg-white/[0.04]">
      <div className="text-[10px] uppercase tracking-[0.14em] text-fg-dim mb-2 flex items-center justify-between">
        <span>{t("trade.placeOrder.balances")}</span>
        {isConnected && !onSupportedChain ? (
          <span className="text-amber-400 normal-case tracking-normal text-[11px] font-medium">
            {t("trade.placeOrder.wrongNetworkBalance")}
          </span>
        ) : null}
      </div>
      {!isConnected ? (
        <div className="text-[12px] text-fg-dim">
          {t("trade.placeOrder.balanceConnect")}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <BalanceCell token={baseToken} />
          <BalanceCell token={quoteToken} />
        </div>
      )}
    </div>
  );
}

function BalanceCell({ token }: { token: Token }) {
  const t = useTranslator();
  const status = useTokenStatus(token);
  const hasAddress = Boolean(status.tokenAddress);
  const display = !hasAddress
    ? t("trade.placeOrder.notDeployedHere")
    : status.balanceLoading
    ? "…"
    : formatBalance(status.balance, token.decimals);
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        {symbolLabel(token.symbol)}
      </span>
      <span className="font-mono tnum text-[14px] text-fg truncate">
        {display}
      </span>
    </div>
  );
}

/** Comma-grouped balance with up to 4 decimals trimmed of trailing zeros. */
function formatBalance(raw: bigint, decimals: number): string {
  const whole = raw / 10n ** BigInt(decimals);
  const fracRaw = raw % 10n ** BigInt(decimals);
  const wholeStr = whole.toLocaleString("en-US");
  if (fracRaw === 0n) return wholeStr;
  // Pad fractional part to full decimals, then truncate to 4 + trim zeros.
  const fracPadded = fracRaw.toString().padStart(decimals, "0").slice(0, 4);
  const fracTrimmed = fracPadded.replace(/0+$/, "");
  return fracTrimmed.length === 0 ? wholeStr : `${wholeStr}.${fracTrimmed}`;
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
