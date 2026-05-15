"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Address, type Hex, formatUnits } from "viem";
import {
  useAccount,
  useChainId,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { SCENTDEX_V5_ABI } from "@/lib/abi";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { useTranslator } from "@/lib/locale-context";
import { useTokenStatus } from "@/lib/hooks/useTokenStatus";
import { parseFillError } from "@/lib/parse-fill-error";
import {
  buildPermit2Domain,
  EMPTY_PERMIT_SIGNATURE,
  EMPTY_PERMIT_SINGLE,
  PERMIT_SINGLE_TYPES,
  reifyPermitSingle,
  serialisePermitSingle,
  type PermitSingle,
  type SerialisedPermitSingle,
} from "@/lib/permit2";
import { TOKENS, type Token } from "@/lib/tokens";

/** ms before "Confirming on chain…" gets a "tx is taking too long" warning. */
const CONFIRM_TIMEOUT_MS = 90_000;

/**
 * Fill modal — opens when a taker clicks a row in the order book.
 *
 * Two wallet popups in the happy path:
 *   1) PermitSingle for takerToken (per-fill, scoped to this fill)
 *   2) fillOrder() on-chain transaction
 *
 * Plus a one-time ERC-20 → Permit2 approval if the taker hasn't done it
 * yet for the takerToken (same gate the maker side hits, just on the
 * opposite leg).
 *
 * Maker's PermitSingle + signature come from the off-chain order book —
 * they were signed at sign-order time and persisted alongside the order.
 */

export type FillOrder = {
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
  permitSingle?: SerialisedPermitSingle;
  permitSignature?: Hex;
};

type Phase =
  | "idle"
  | "approving-erc20"
  | "awaiting-permit-sig"
  | "submitting-tx"
  | "confirming-tx"
  | "done"
  | "error";

export function FillModal({
  open,
  order,
  onClose,
  onFilled,
}: {
  open: boolean;
  order: FillOrder | null;
  onClose: () => void;
  onFilled: () => void;
}) {
  const { address: account } = useAccount();
  const chainId = useChainId();
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];

  // The token the taker GIVES UP is the order's takerToken (and the
  // taker RECEIVES the order's makerToken). Approval gate + permit2
  // PermitSingle are on the takerToken side.
  const takerTokenAddr = order?.order.takerToken;
  const takerTokenMeta = useMemo<Token | undefined>(() => {
    if (!takerTokenAddr) return undefined;
    return TOKENS.find(
      (tok) =>
        tok.addresses[chainId]?.toLowerCase() === takerTokenAddr.toLowerCase(),
    );
  }, [takerTokenAddr, chainId]);
  const makerTokenMeta = useMemo<Token | undefined>(() => {
    if (!order) return undefined;
    return TOKENS.find(
      (tok) =>
        tok.addresses[chainId]?.toLowerCase() ===
        order.order.makerToken.toLowerCase(),
    );
  }, [order, chainId]);

  // useTokenStatus needs a Token — fall back to a stub when we don't have
  // a Token entry for this chain (shouldn't happen in UAT).
  const takerStatus = useTokenStatus(
    takerTokenMeta ?? {
      symbol: "—",
      name: "—",
      decimals: 18,
      addresses: {},
      accentClass: "",
    } as unknown as Token,
  );

  const t = useTranslator();
  const { signTypedDataAsync, isPending: signing } = useSignTypedData();
  const writeTx = useWriteContract();
  const writeReceipt = useWaitForTransactionReceipt({
    hash: writeTx.data,
    query: { enabled: Boolean(writeTx.data) },
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset transient state every time we (re)open with a different order.
  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setError(null);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [open, order?.orderHash]);

  // Catch wallet-side submit errors. wagmi's useWriteContract surfaces
  // them on `writeTx.error` rather than on `writeReceipt.isError` —
  // anything thrown before the tx makes it to a block (user reject, RPC
  // unavailable, gas estimation revert, …) lives here.
  useEffect(() => {
    if (!writeTx.error) return;
    setPhase("error");
    setError(parseFillError(writeTx.error, t));
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeTx.error]);

  // Arm a watchdog the moment a tx hash exists. If the receipt never
  // resolves (mempool starvation, frontrun in a race fill, taker mining
  // pool issues, …) the user gets an explicit "check your wallet" hint
  // instead of an infinite "Confirming on-chain…" spinner.
  useEffect(() => {
    if (!writeTx.data) return;
    if (writeReceipt.isSuccess || writeReceipt.isError) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // Only act if the receipt is still pending.
      if (!writeReceipt.isSuccess && !writeReceipt.isError) {
        setError(t("trade.fillError.timeout"));
        // Don't transition out of confirming-tx — the receipt may still
        // land. Surfacing the warning as `error` is enough to break the
        // visual silence.
      }
    }, CONFIRM_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeTx.data, writeReceipt.isSuccess, writeReceipt.isError]);

  // Watch the on-chain receipt and transition state.
  useEffect(() => {
    if (!writeTx.data) return;
    setPhase(writeReceipt.isLoading ? "confirming-tx" : phase);
    if (writeReceipt.isSuccess) {
      // Mirror the OrderFilled into the off-chain book BEFORE telling the
      // parent to refresh. The /api/orders/[hash]/filled endpoint pulls the
      // receipt server-side, decodes the OrderFilled log, and flips the
      // order's status. Until that call lands, the board polling can still
      // return status='open' and the row would linger.
      //
      // Fire-and-forget on errors: the taker already got their tokens at
      // this point and the worst case is that the row sits stale until the
      // next manual sync — far better than blocking the modal's "done" UI.
      // Errors are swallowed silently to keep API paths / RPC URLs out of
      // the browser console (sec policy: nothing identifiable in devtools).
      if (order) {
        void fetch(`/api/orders/${order.orderHash}/filled`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            txHash: writeTx.data,
            chainId,
          }),
        })
          .catch(() => {
            // intentional no-op — see comment above
          })
          .finally(() => onFilled());
      } else {
        onFilled();
      }
      setPhase("done");
    }
    if (writeReceipt.isError) {
      setPhase("error");
      setError(parseFillError(writeReceipt.error, t));
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeReceipt.isSuccess, writeReceipt.isError, writeReceipt.isLoading]);

  if (!open || !order) return null;

  const baseDecimals = makerTokenMeta?.decimals ?? 18;
  const quoteDecimals = takerTokenMeta?.decimals ?? 18;
  const makerAmount = BigInt(order.order.makerAmount);
  const takerAmount = BigInt(order.order.takerAmount);
  const filledMaker = BigInt(order.filledMakerAmount);
  const remainingMaker = makerAmount - filledMaker;
  // Proportional remaining taker.
  const remainingTaker =
    makerAmount > 0n ? (takerAmount * remainingMaker) / makerAmount : 0n;

  const youReceive = formatBalance(remainingMaker, baseDecimals);
  const youPay = formatBalance(remainingTaker, quoteDecimals);

  const youReceiveSym = makerTokenMeta?.symbol ?? "?";
  const youPaySym = takerTokenMeta?.symbol ?? "?";
  const priceNumber =
    Number(formatUnits(remainingTaker, quoteDecimals)) /
    Math.max(Number(formatUnits(remainingMaker, baseDecimals)), 1e-18);

  const notSelf =
    account && order.order.maker.toLowerCase() !== account.toLowerCase();
  const onSupportedChain = Boolean(dexAddress);
  const hasMakerPermit = Boolean(order.permitSingle && order.permitSignature);
  const isAlreadyDone =
    phase === "done" ||
    order.status === "filled" ||
    order.status === "cancelled" ||
    order.status === "expired";

  // -- Action: ERC-20 → Permit2 approve (one-time, taker side) -----------------
  const needsErc20Approval = !takerStatus.isErc20Approved && Boolean(takerTokenAddr);

  // -- Action: sign per-fill PermitSingle then fillOrder() ---------------------
  async function onFillClick() {
    if (!account || !dexAddress || !order) return;
    if (!hasMakerPermit) {
      setError(
        "this order was signed before per-order Permit2 was wired up — ask the maker to re-post",
      );
      setPhase("error");
      return;
    }

    setError(null);

    // 1) Sign taker PermitSingle (Permit2 → DEX, scoped to this fill).
    const orderExpiry = BigInt(order.order.expiry);
    const takerPermit: PermitSingle = {
      details: {
        token: order.order.takerToken,
        amount: remainingTaker,
        expiration: Number(orderExpiry),
        nonce: takerStatus.permit2DexNonce,
      },
      spender: dexAddress,
      sigDeadline: orderExpiry,
    };

    let takerPermitSig: Hex;
    try {
      setPhase("awaiting-permit-sig");
      takerPermitSig = (await signTypedDataAsync({
        domain: buildPermit2Domain(chainId),
        types: PERMIT_SINGLE_TYPES,
        primaryType: "PermitSingle",
        message: takerPermit as unknown as Record<string, unknown>,
      } as Parameters<typeof signTypedDataAsync>[0])) as Hex;
    } catch (e) {
      setPhase("error");
      setError(parseFillError(e, t));
      return;
    }

    // 2) fillOrder() on-chain.
    const makerPermitReified = reifyPermitSingle(order.permitSingle!);

    try {
      setPhase("submitting-tx");
      writeTx.writeContract({
        address: dexAddress,
        abi: SCENTDEX_V5_ABI,
        functionName: "fillOrder",
        args: [
          {
            maker: order.order.maker,
            makerToken: order.order.makerToken,
            takerToken: order.order.takerToken,
            makerAmount: BigInt(order.order.makerAmount),
            takerAmount: BigInt(order.order.takerAmount),
            expiry: BigInt(order.order.expiry),
            nonce: BigInt(order.order.nonce),
            salt: order.order.salt,
            feeSide: order.order.feeSide,
            feeBps: order.order.feeBps,
          },
          order.signature,
          remainingMaker,
          {
            details: {
              token: takerPermit.details.token,
              amount: takerPermit.details.amount,
              expiration: takerPermit.details.expiration,
              nonce: takerPermit.details.nonce,
            },
            spender: takerPermit.spender,
            sigDeadline: takerPermit.sigDeadline,
          },
          takerPermitSig,
          {
            details: {
              token: makerPermitReified.details.token,
              amount: makerPermitReified.details.amount,
              expiration: makerPermitReified.details.expiration,
              nonce: makerPermitReified.details.nonce,
            },
            spender: makerPermitReified.spender,
            sigDeadline: makerPermitReified.sigDeadline,
          },
          order.permitSignature as Hex,
        ],
      });
    } catch (e) {
      setPhase("error");
      setError(parseFillError(e, t));
    }
  }

  const buttonLabel = (() => {
    if (isAlreadyDone) return t("trade.fillModal.button.filled");
    // Once we've shown an error banner, the same click would just re-fail.
    // Steer the user to close + reopen (which will refetch the order's
    // current status and rebuild a fresh permit) instead of letting them
    // re-press into the same wall.
    if (phase === "error") return t("trade.fillError.closeAndRetry");
    if (phase === "approving-erc20" || takerStatus.isApproving)
      return t("trade.fillModal.button.approving").replace("{symbol}", youPaySym);
    if (phase === "awaiting-permit-sig" || signing)
      return t("trade.fillModal.button.signPermit");
    if (phase === "submitting-tx" || writeTx.isPending)
      return t("trade.fillModal.button.waitingWallet");
    if (phase === "confirming-tx" || writeReceipt.isLoading)
      return t("trade.fillModal.button.confirmingTx");
    if (needsErc20Approval)
      return t("trade.fillModal.button.approve").replace("{symbol}", youPaySym);
    return t("trade.fillModal.button.fill")
      .replace("{amount}", youPay)
      .replace("{symbol}", youPaySym);
  })();

  // In `error` we repurpose the primary CTA into a "close & retry" action.
  // Retrying on the same stale modal state would just hit the same revert,
  // so the recovery path is: close → board refetches order status → user
  // reopens FillModal if the order is still open. Combining "block re-fill"
  // and "close in one click" beats either alone.
  const buttonAction =
    phase === "error"
      ? onClose
      : needsErc20Approval
      ? () => {
          setPhase("approving-erc20");
          takerStatus.approve();
        }
      : onFillClick;

  const buttonDisabled =
    isAlreadyDone ||
    !account ||
    !onSupportedChain ||
    !notSelf ||
    !hasMakerPermit ||
    phase === "awaiting-permit-sig" ||
    phase === "submitting-tx" ||
    phase === "confirming-tx" ||
    signing ||
    writeTx.isPending ||
    writeReceipt.isLoading ||
    takerStatus.isApproving;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full md:max-w-[480px] bg-bg-soft border border-line rounded-t-2xl md:rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-[14px] font-medium uppercase tracking-[0.14em]">
            {t("trade.fillModal.title")}
          </h2>
          <button
            onClick={onClose}
            className="text-fg-faint hover:text-fg text-[20px] leading-none"
            aria-label="close"
          >
            ×
          </button>
        </header>

        <div className="p-5 space-y-4 text-[13px]">
          <Row label={t("trade.fillModal.pair")} value={order.pair} />
          <Row
            label={t("trade.fillModal.maker")}
            value={
              <span className="font-mono">
                {order.order.maker.slice(0, 6)}…{order.order.maker.slice(-4)}
              </span>
            }
          />
          <Row
            label={t("trade.fillModal.price")}
            value={
              <span className="font-mono tnum">
                {priceNumber.toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
                {youPaySym} / {youReceiveSym}
              </span>
            }
          />
          <Row
            label={t("trade.fillModal.youReceive")}
            value={
              <span className="font-mono tnum text-buy">
                {youReceive} {youReceiveSym}
              </span>
            }
            emphasis
          />
          <Row
            label={t("trade.fillModal.youPay")}
            value={
              <span className="font-mono tnum text-sell">
                {youPay} {youPaySym}
              </span>
            }
            emphasis
          />
          <Row
            label={t("trade.fillModal.orderStatus")}
            value={
              <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-white/[0.05]">
                {translateOrderStatus(t, order.status)}
              </span>
            }
          />

          {!notSelf ? (
            <Note kind="warn">{t("trade.fillModal.cantFillOwn")}</Note>
          ) : null}
          {!hasMakerPermit ? (
            <Note kind="warn">{t("trade.fillModal.missingPermit")}</Note>
          ) : null}
          {!onSupportedChain ? (
            <Note kind="warn">{t("trade.fillModal.switchNetwork")}</Note>
          ) : null}

          {error ? <Note kind="error">{error}</Note> : null}
          {phase === "done" ? (
            <Note kind="success">{t("trade.fillModal.settled")}</Note>
          ) : null}

          <button
            onClick={buttonAction}
            disabled={buttonDisabled}
            className="w-full mt-2 py-3 rounded-md bg-accent text-bg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {buttonLabel}
          </button>

          <p className="text-[11px] text-fg-faint leading-relaxed">
            {t("trade.fillModal.footnote")}
          </p>
        </div>
      </div>
    </div>
  );
}

function translateOrderStatus(
  t: ReturnType<typeof useTranslator>,
  status: FillOrder["status"],
): string {
  switch (status) {
    case "open":
      return t("trade.fillModal.statusOpen");
    case "partially-filled":
      return t("trade.fillModal.statusPartiallyFilled");
    case "filled":
      return t("trade.fillModal.statusFilled");
    case "cancelled":
      return t("trade.fillModal.statusCancelled");
    case "expired":
      return t("trade.fillModal.statusExpired");
    default:
      return status;
  }
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: React.ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={emphasis ? "text-fg-dim" : "text-fg-faint"}>{label}</span>
      <span className={emphasis ? "text-fg" : "text-fg-dim"}>{value}</span>
    </div>
  );
}

function Note({
  kind,
  children,
}: {
  kind: "warn" | "error" | "success";
  children: React.ReactNode;
}) {
  const cls =
    kind === "error"
      ? "border-sell/30 bg-sell/[0.05] text-sell"
      : kind === "success"
      ? "border-buy/30 bg-buy/[0.05] text-buy"
      : "border-amber-500/30 bg-amber-500/[0.05] text-amber-300";
  return (
    <div className={`px-3 py-2 rounded-md border text-[12px] ${cls}`}>
      {children}
    </div>
  );
}

function formatBalance(raw: bigint, decimals: number): string {
  const whole = raw / 10n ** BigInt(decimals);
  const fracRaw = raw % 10n ** BigInt(decimals);
  const wholeStr = whole.toLocaleString("en-US");
  if (fracRaw === 0n) return wholeStr;
  const fracPadded = fracRaw.toString().padStart(decimals, "0").slice(0, 6);
  const fracTrimmed = fracPadded.replace(/0+$/, "");
  return fracTrimmed.length === 0 ? wholeStr : `${wholeStr}.${fracTrimmed}`;
}

// Silence "unused" lint for the empty-permit constants — kept exported in
// permit2.ts for future legacy-order paths but referenced here for the
// pattern they document.
void EMPTY_PERMIT_SINGLE;
void EMPTY_PERMIT_SIGNATURE;
void serialisePermitSingle;
