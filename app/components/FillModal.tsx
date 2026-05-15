"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useTokenStatus } from "@/lib/hooks/useTokenStatus";
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

  const { signTypedDataAsync, isPending: signing } = useSignTypedData();
  const writeTx = useWriteContract();
  const writeReceipt = useWaitForTransactionReceipt({
    hash: writeTx.data,
    query: { enabled: Boolean(writeTx.data) },
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);

  // Reset transient state every time we (re)open with a different order.
  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setError(null);
  }, [open, order?.orderHash]);

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
      if (order) {
        void fetch(`/api/orders/${order.orderHash}/filled`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            txHash: writeTx.data,
            chainId,
          }),
        })
          .then((r) =>
            r.ok
              ? null
              : r.json().catch(() => null).then((j) =>
                  console.warn(
                    "[fill-sync] /api/orders/.../filled returned",
                    r.status,
                    j,
                  ),
                ),
          )
          .catch((e) =>
            console.warn("[fill-sync] off-chain mirror POST failed", e),
          )
          .finally(() => onFilled());
      } else {
        onFilled();
      }
      setPhase("done");
    }
    if (writeReceipt.isError) {
      setPhase("error");
      setError(
        writeReceipt.error?.message?.slice(0, 200) ?? "transaction reverted",
      );
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
      setError(
        `taker permit2 sign cancelled: ${
          e instanceof Error ? e.message.slice(0, 140) : String(e)
        }`,
      );
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
      setError(
        `fillOrder send failed: ${
          e instanceof Error ? e.message.slice(0, 200) : String(e)
        }`,
      );
    }
  }

  const buttonLabel = (() => {
    if (isAlreadyDone) return "Filled";
    if (phase === "approving-erc20" || takerStatus.isApproving)
      return `Approving ${youPaySym}…`;
    if (phase === "awaiting-permit-sig" || signing)
      return "Sign Permit2…";
    if (phase === "submitting-tx" || writeTx.isPending)
      return "Waiting for wallet…";
    if (phase === "confirming-tx" || writeReceipt.isLoading)
      return "Confirming on-chain…";
    if (needsErc20Approval) return `Approve ${youPaySym}`;
    return `Fill — pay ${youPay} ${youPaySym}`;
  })();

  const buttonAction = needsErc20Approval
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
            Fill order
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
          <Row label="Pair" value={order.pair} />
          <Row
            label="Maker"
            value={
              <span className="font-mono">
                {order.order.maker.slice(0, 6)}…{order.order.maker.slice(-4)}
              </span>
            }
          />
          <Row
            label="Price"
            value={
              <span className="font-mono tnum">
                {priceNumber.toLocaleString("en-US", { maximumFractionDigits: 6 })}{" "}
                {youPaySym} / {youReceiveSym}
              </span>
            }
          />
          <Row
            label="You receive"
            value={
              <span className="font-mono tnum text-buy">
                {youReceive} {youReceiveSym}
              </span>
            }
            emphasis
          />
          <Row
            label="You pay"
            value={
              <span className="font-mono tnum text-sell">
                {youPay} {youPaySym}
              </span>
            }
            emphasis
          />
          <Row
            label="Order status"
            value={
              <span className="font-mono text-[12px] px-2 py-0.5 rounded bg-white/[0.05]">
                {order.status}
              </span>
            }
          />

          {!notSelf ? (
            <Note kind="warn">You can't fill your own order. Use Cancel instead.</Note>
          ) : null}
          {!hasMakerPermit ? (
            <Note kind="warn">
              This order is missing the per-order Permit2 signature (legacy).
              The maker needs to re-post it.
            </Note>
          ) : null}
          {!onSupportedChain ? (
            <Note kind="warn">Switch to Sepolia to fill.</Note>
          ) : null}

          {error ? <Note kind="error">{error}</Note> : null}
          {phase === "done" ? (
            <Note kind="success">Filled — settlement confirmed on-chain.</Note>
          ) : null}

          <button
            onClick={buttonAction}
            disabled={buttonDisabled}
            className="w-full mt-2 py-3 rounded-md bg-accent text-bg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {buttonLabel}
          </button>

          <p className="text-[11px] text-fg-faint leading-relaxed">
            Two wallet popups: one Permit2 signature (off-chain, no gas) + one
            on-chain fillOrder transaction. Plus a one-time ERC-20 → Permit2
            approval if you haven't done it before.
          </p>
        </div>
      </div>
    </div>
  );
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
