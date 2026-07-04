"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Address, type Hex, formatUnits, parseUnits } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useReadContract,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { SCENTDEX_V5_ABI } from "@/lib/abi";
import { TermsConsentCheckbox } from "@/app/components/TermsConsentCheckbox";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { useTranslator } from "@/lib/locale-context";
import { useTokenStatus } from "@/lib/hooks/useTokenStatus";
import { useWeth } from "@/lib/hooks/useWeth";
import { fetchRevertError, parseFillError } from "@/lib/parse-fill-error";
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
import { TOKENS, symbolLabel, type Token } from "@/lib/tokens";

/** ms before "Confirming on chain…" gets a "tx is taking too long" warning. */
const CONFIRM_TIMEOUT_MS = 90_000;

/**
 * ms a final error screen stays up before the modal auto-closes itself.
 * Sized to give a reader enough time to absorb a one-line error
 * (~5 s at conversational reading speed) plus a buffer, while staying
 * inside the 5–7 s autodismiss window used by mainstream UI guidelines
 * (Apple HIG, Material). Only applies to the `error` phase; the `done`
 * phase is left to the parent's success acknowledgment UX.
 */
const ERROR_AUTO_CLOSE_MS = 6_000;

/**
 * Fire-and-forget post-fill mirror with retry. Hits
 * POST /api/orders/[hash]/filled and retries on 202 (tx not yet mined) and
 * 5xx (transient backend) with exponential backoff. Stops on 2xx or 4xx
 * (other than 202). All errors are swallowed silently — by design the
 * browser console must not leak API paths or RPC details (sec policy).
 *
 * If every attempt fails the order row sits stale until the next manual
 * sync surface lands, which is materially better than the previous
 * single-shot fire-and-forget that gave up on the first transient error
 * (the bug behind "filled orders linger on the board, no Filled in
 * History").
 */
async function syncFilledWithRetry(
  orderHash: Hex,
  txHash: Hex,
  chainId: number,
): Promise<void> {
  const maxAttempts = 4;
  const baseDelayMs = 2_000;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(`/api/orders/${orderHash}/filled`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ txHash, chainId }),
      });
      if (res.ok) return;
      // 202 = receipt not yet mined; 5xx = transient backend. Both retryable.
      // Any other 4xx is permanent (bad payload, order not found, etc.) —
      // give up rather than spam the API.
      if (res.status !== 202 && res.status < 500) return;
    } catch {
      // Network-level error — retry.
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** attempt));
    }
  }
}

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
  | "wrapping-eth"
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
  // Used to re-simulate a reverted fill tx so we can extract its concrete
  // revert reason (the tx receipt alone does not carry it).
  const publicClient = usePublicClient({ chainId });

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

  // Auto-wrap (SDT/WETH test market): when the taker pays in WETH but their
  // WETH balance can't cover the fill, a WETH9.deposit() leg is inserted
  // before the approve/permit/fill pipeline. Inert on non-WETH pairs.
  const weth = useWeth();

  const t = useTranslator();
  const { signTypedDataAsync, isPending: signing } = useSignTypedData();
  const writeTx = useWriteContract();

  // V6 ADR-0007: previewFee is the authoritative fee-disclosure source.
  // For Case B fills the taker absorbs a 10% carve-out on the maker→taker
  // leg; without surfacing that here the taker would expect more makerToken
  // than they actually receive. The contract returns (0, address(0)) for
  // any non-fillable state (paused / cancelled / expired / sized wrong),
  // so a non-zero feeAmount IS the live, on-chain truth about this fill.
  // H-05 partial fill: taker-chosen fill size, denominated in the order's
  // makerToken (what the taker RECEIVES — same unit as the contract's
  // fillMakerAmount parameter). Prefilled with the exact remaining amount
  // on open, so the default click is still a full fill.
  const [fillInput, setFillInput] = useState("");

  // H-05: parse the taker's chosen fill size and mirror the contract's
  // partial-fill payment maths so preview, permit amount and the on-chain
  // call all agree to the wei.
  const fillCalc = useMemo(
    () => computeFill(order, fillInput, makerTokenMeta?.decimals ?? 18),
    [order, fillInput, makerTokenMeta?.decimals],
  );

  const previewArgs = useMemo(() => {
    if (!order || fillCalc.fillMaker === null) return undefined;
    return [
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
      fillCalc.fillMaker,
    ] as const;
  }, [order, fillCalc.fillMaker]);
  const previewQuery = useReadContract({
    abi: SCENTDEX_V5_ABI,
    address: dexAddress,
    functionName: "previewFee",
    args: previewArgs,
    query: { enabled: Boolean(dexAddress && previewArgs) },
  });

  const writeReceipt = useWaitForTransactionReceipt({
    hash: writeTx.data,
    query: { enabled: Boolean(writeTx.data) },
  });

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  // Per-order click-wrap consent. Reset to `false` when the modal closes
  // and after every submit attempt (success or failure) so the taker must
  // re-tick the box for each fill — i.e. the user re-affirms the Terms on
  // every transaction.
  const [termsAgreed, setTermsAgreed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset transient state every time we (re)open with a different order.
  useEffect(() => {
    if (!open) return;
    setPhase("idle");
    setError(null);
    // Prefill the fill-amount input with the exact remaining makerToken
    // amount (formatUnits round-trips losslessly through parseUnits), so
    // the default action stays "fill everything".
    if (order) {
      const remaining =
        BigInt(order.order.makerAmount) - BigInt(order.filledMakerAmount);
      setFillInput(
        remaining > 0n
          ? formatUnits(remaining, makerTokenMeta?.decimals ?? 18)
          : "",
      );
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  // pool issues, …) the user gets an explicit failure state instead of
  // an infinite "Confirming on-chain…" spinner. The tx may still land
  // later — wallet history is the source of truth for that — but the
  // modal does not stay stuck.
  useEffect(() => {
    if (!writeTx.data) return;
    if (writeReceipt.isSuccess || writeReceipt.isError) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      // Only act if the receipt is still pending.
      if (!writeReceipt.isSuccess && !writeReceipt.isError) {
        setPhase("error");
        setError(t("trade.fillError.timeout"));
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
      const receipt = writeReceipt.data;
      // viem resolves `isSuccess === true` even for reverted txs (the
      // receipt itself was fetched successfully). Distinguish success
      // vs revert via `receipt.status` before treating it as a fill.
      if (receipt?.status === "reverted") {
        setPhase("error");
        // Best-effort: re-simulate the tx to recover the concrete custom-
        // error name (e.g. FillExceedsMaker → "already filled by another
        // taker"). Show a generic "reverted" copy immediately so the user
        // is never left looking at a spinner while the simulation runs.
        setError(t("trade.fillError.reverted"));
        if (publicClient && writeTx.data) {
          const txHash = writeTx.data;
          void (async () => {
            const revertError = await fetchRevertError(
              publicClient,
              txHash,
              receipt,
              SCENTDEX_V5_ABI,
            );
            if (revertError) {
              setError(parseFillError(revertError, t));
            }
          })();
        }
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        return;
      }
      // Successful fill — mirror the OrderFilled into the off-chain book.
      // The /api/orders/[hash]/filled endpoint pulls the receipt server-
      // side, decodes the OrderFilled log, and flips the order's status.
      // Until that call lands the board polling can still return
      // status='open' and the row would linger; same for the History tab
      // not showing the Filled event.
      //
      // Run the sync in the background with retry (handles 202 receipt-
      // not-yet-mined and 5xx transients). `onFilled()` fires immediately
      // so the modal's "done" UI is not blocked on backend latency — the
      // parent's orderbook polling will pick up the status flip as soon
      // as the mirror lands.
      if (order && writeTx.data) {
        void syncFilledWithRetry(order.orderHash, writeTx.data, chainId);
      }
      onFilled();
      setPhase("done");
      setTermsAgreed(false);
    }
    if (writeReceipt.isError) {
      setPhase("error");
      setError(parseFillError(writeReceipt.error, t));
      setTermsAgreed(false);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [writeReceipt.isSuccess, writeReceipt.isError, writeReceipt.isLoading]);

  // Auto-advance once the auto-wrap deposit confirms: continue to the
  // ERC-20 approve leg if it's missing, otherwise straight into the
  // permit-sign + fillOrder pipeline — the same chain a direct Fill click
  // takes when the WETH balance is already sufficient.
  useEffect(() => {
    if (phase !== "wrapping-eth") return;
    if (!weth.isWrapConfirmed) return;
    if (!takerStatus.isErc20Approved && Boolean(takerTokenAddr)) {
      setPhase("approving-erc20");
      takerStatus.approve();
      return;
    }
    setPhase("idle");
    void onFillClick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, weth.isWrapConfirmed]);

  // Surface a wrap failure (user reject / RPC error) via the normal error
  // phase instead of leaving the modal stuck on "wrapping".
  useEffect(() => {
    if (phase !== "wrapping-eth" || !weth.wrapError) return;
    setPhase("error");
    setError(parseFillError(weth.wrapError, t));
    setTermsAgreed(false);
    weth.resetWrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, weth.wrapError]);

  // Auto-close the modal a few seconds after entering the error phase so
  // a stale failure screen doesn't linger after the user has had time to
  // read the message. Done phase is intentionally excluded — the parent
  // owns the success acknowledgment UX (it can keep the modal up, replace
  // it with a confirmation, or close on its own cadence).
  useEffect(() => {
    if (phase !== "error") return;
    const id = setTimeout(() => {
      onClose();
    }, ERROR_AUTO_CLOSE_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (!open || !order) return null;

  const baseDecimals = makerTokenMeta?.decimals ?? 18;
  const quoteDecimals = takerTokenMeta?.decimals ?? 18;
  const makerAmount = BigInt(order.order.makerAmount);
  const takerAmount = BigInt(order.order.takerAmount);
  const filledMaker = BigInt(order.filledMakerAmount);
  const remainingMaker = makerAmount - filledMaker;
  // Taker-chosen fill size (H-05). Invalid input keeps the modal open but
  // disables Fill; the 0n fallbacks keep the display rows rendering.
  const fillMaker = fillCalc.fillMaker ?? 0n;
  const fillTaker = fillCalc.fillTaker ?? 0n;

  const youReceive = formatBalance(fillMaker, baseDecimals);
  const youPay = formatBalance(fillTaker, quoteDecimals);

  // Display-only labels. symbolLabel surfaces WETH-TEST as "WETH-TEST（ETH）".
  const youReceiveSym = makerTokenMeta ? symbolLabel(makerTokenMeta.symbol) : "?";
  const youPaySym = takerTokenMeta ? symbolLabel(takerTokenMeta.symbol) : "?";

  // V6 Case B disclosure: feeAmount / feeToken come from on-chain previewFee.
  // Case A: feeToken == takerToken — the taker's makerToken receive is full,
  //         and the fee is carved from the taker's takerToken payment leg
  //         (the maker absorbs it; existing PlaceOrder UI shows this).
  // Case B: feeToken == makerToken — the taker's makerToken receive is
  //         reduced by feeAmount. Surface gross / fee / net to keep the
  //         taker's expectations aligned with what actually lands in their
  //         wallet.
  //
  // While previewQuery is loading or errored we deliberately do NOT render
  // the legacy "You receive: <gross>" row — it would understate the fee in
  // a Case B fill. Fill is also disabled in those states (see buttonDisabled
  // below) so the taker can't act on a stale disclosure.
  const previewReady = previewQuery.isSuccess && previewQuery.data !== undefined;
  const previewFee = previewQuery.data;
  const feeAmount = previewFee?.[0] ?? 0n;
  const feeToken =
    previewFee?.[1] ?? ("0x0000000000000000000000000000000000000000" as Address);
  const feeAppliesToTakerReceive =
    previewReady &&
    feeAmount > 0n &&
    feeToken.toLowerCase() === order.order.makerToken.toLowerCase();
  const netReceive = feeAppliesToTakerReceive
    ? fillMaker - feeAmount
    : fillMaker;
  const youReceiveNet = formatBalance(netReceive, baseDecimals);
  const youReceiveFee = formatBalance(feeAmount, baseDecimals);
  const feeBpsForLabel = order.order.feeBps;
  const feeBpsDisplay = (feeBpsForLabel / 100).toLocaleString("en-US", {
    maximumFractionDigits: 2,
  });
  // Unit price from the ORDER's full amounts — stable regardless of the
  // chosen fill size (a partial fill settles at the same unit price).
  const priceNumber =
    Number(formatUnits(takerAmount, quoteDecimals)) /
    Math.max(Number(formatUnits(makerAmount, baseDecimals)), 1e-18);

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

  // -- Action: auto-wrap (taker pays WETH, balance short) -----------------------
  const takerIsWeth = Boolean(takerTokenMeta?.wrapsNative);
  const wethShortfall = takerIsWeth ? weth.shortfallFor(fillTaker) : 0n;
  const needsWrap = wethShortfall > 0n;

  // -- Action: sign per-fill PermitSingle then fillOrder() ---------------------
  async function onFillClick() {
    if (!account || !dexAddress || !order) return;
    // H-05: never submit with an invalid / zero fill size — the button is
    // disabled in that state, but the wrap auto-advance path also lands here.
    if (fillCalc.fillMaker === null || fillCalc.fillTaker === null || fillCalc.fillTaker === 0n)
      return;
    if (!hasMakerPermit) {
      setError(
        "this order was signed before per-order Permit2 was wired up — ask the maker to re-post",
      );
      setPhase("error");
      return;
    }

    setError(null);

    // Audit C-L1: the fillTaker shown in the modal was computed from the
    // off-chain book's filled amounts, which can lag if another taker fills
    // part of this order while the modal is open. Stale values are proven to
    // never UNDER-permit (ceil-rounded prior fills only shrink the remaining
    // quota), but they can leave a dust of idle allowance behind. Re-read the
    // on-chain fill state right before signing so the Permit2 amount matches
    // the contract's actual pull to the wei; fall back to the (sufficient)
    // stale value if the read fails.
    let permitTakerAmount = fillTaker;
    if (publicClient) {
      try {
        const [freshFilledMaker, freshFilledTaker] = (await Promise.all([
          publicClient.readContract({
            address: dexAddress,
            abi: SCENTDEX_V5_ABI,
            functionName: "filledMakerAmount",
            args: [order.orderHash],
          }),
          publicClient.readContract({
            address: dexAddress,
            abi: SCENTDEX_V5_ABI,
            functionName: "filledTakerAmount",
            args: [order.orderHash],
          }),
        ])) as [bigint, bigint];
        const fresh = proportionalTakerAmount(
          fillMaker,
          makerAmount,
          takerAmount,
          freshFilledMaker,
          freshFilledTaker,
        );
        // fresh === 0n means the fill can no longer settle (zero residual /
        // overfilled) — keep the stale amount and let the pre-flight
        // simulation surface the concrete revert to the user.
        if (fresh > 0n) permitTakerAmount = fresh;
      } catch {
        // RPC hiccup — stale value is sufficient by construction.
      }
    }

    // 1) Sign taker PermitSingle (Permit2 → DEX, scoped to this fill).
    const orderExpiry = BigInt(order.order.expiry);
    const takerPermit: PermitSingle = {
      details: {
        token: order.order.takerToken,
        // Exactly the contract-side payment for this fill size (ceil-rounded
        // partials included) — no idle allowance beyond this fill.
        amount: permitTakerAmount,
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
      setTermsAgreed(false);
      return;
    }

    // 2) fillOrder() on-chain.
    const makerPermitReified = reifyPermitSingle(order.permitSingle!);

    const fillArgs = [
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
      fillMaker,
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
    ] as const;

    try {
      setPhase("submitting-tx");

      // Preflight on-chain simulation + gas estimation. wagmi's writeContract
      // action does not auto-simulate, so without this gate the failing
      // eth_estimateGas happens *inside* MetaMask, which then falls back to
      // the block gas limit (~21M) and quotes the taker an absurd fee for a
      // tx that would just revert.
      //
      // We also explicitly pass `gas` to writeContract below using the
      // viem estimate, which short-circuits MetaMask's own eth_estimateGas
      // entirely. That closes the residual case where our simulate passes
      // but the wallet's RPC sees a slightly different mempool/block state
      // and still falls back to the block gas limit.
      if (publicClient && account) {
        const [, gasEstimate] = await Promise.all([
          publicClient.simulateContract({
            account,
            address: dexAddress,
            abi: SCENTDEX_V5_ABI,
            functionName: "fillOrder",
            args: fillArgs,
          }),
          publicClient.estimateContractGas({
            account,
            address: dexAddress,
            abi: SCENTDEX_V5_ABI,
            functionName: "fillOrder",
            args: fillArgs,
          }),
        ]);
        // 20% headroom over the live estimate. fillOrder is ~200-500K in
        // practice; the hard cap is a defence-in-depth backstop so even a
        // runaway estimate can never quote a block-gas-limit fee again.
        const GAS_CAP = 1_500_000n;
        const gasWithBuffer = (gasEstimate * 120n) / 100n;
        const gas = gasWithBuffer > GAS_CAP ? GAS_CAP : gasWithBuffer;

        writeTx.writeContract({
          address: dexAddress,
          abi: SCENTDEX_V5_ABI,
          functionName: "fillOrder",
          args: fillArgs,
          gas,
        });
      } else {
        writeTx.writeContract({
          address: dexAddress,
          abi: SCENTDEX_V5_ABI,
          functionName: "fillOrder",
          args: fillArgs,
        });
      }
    } catch (e) {
      setPhase("error");
      setError(parseFillError(e, t));
      setTermsAgreed(false);
    }
  }

  const buttonLabel = (() => {
    if (isAlreadyDone) return t("trade.fillModal.button.filled");
    // Once we've shown an error banner, the same click would just re-fail.
    // Steer the user to close + reopen (which will refetch the order's
    // current status and rebuild a fresh permit) instead of letting them
    // re-press into the same wall.
    if (phase === "error") return t("trade.fillError.closeAndRetry");
    if (phase === "wrapping-eth" || weth.isWrapping)
      return t("trade.fillModal.button.wrappingEth");
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
      ? handleClose
      : needsWrap
      ? () => {
          // Reset any previous wrap result BEFORE firing the new deposit so
          // the auto-advance effect can't see a stale isWrapConfirmed=true.
          weth.resetWrap();
          weth.wrap(wethShortfall);
          setPhase("wrapping-eth");
        }
      : needsErc20Approval
      ? () => {
          setPhase("approving-erc20");
          takerStatus.approve();
        }
      : onFillClick;

  // Hold Fill until previewFee resolves: ADR-0007 makes previewFee the
  // authoritative on-chain fee-disclosure source, and the modal's
  // gross / fee / net rows depend on it. Letting the taker fill while the
  // call is in flight (or errored) would silently revert them to the legacy
  // single-row disclosure and they'd receive `gross − fee` without warning.
  // In the error phase the primary button is repurposed into "close &
  // retry" — a preview refetch (e.g. the taker edits the amount, which is
  // still enabled there) must not dead-lock that escape hatch.
  const previewBlocking =
    onSupportedChain &&
    phase !== "error" &&
    (previewQuery.isLoading || previewQuery.isError);
  const buttonDisabled =
    isAlreadyDone ||
    !account ||
    !onSupportedChain ||
    !notSelf ||
    !hasMakerPermit ||
    previewBlocking ||
    // H-05: invalid / out-of-range / dust fill size blocks Fill (but never
    // the "close & retry" repurposed button in the error phase).
    (fillCalc.fillMaker === null && phase !== "error") ||
    // Consent gating: the box must be ticked for every fill. In the
    // "error" phase the button repurposes itself into "close & retry",
    // so we don't block that recovery path on the checkbox.
    (!termsAgreed && phase !== "error") ||
    phase === "wrapping-eth" ||
    phase === "awaiting-permit-sig" ||
    phase === "submitting-tx" ||
    phase === "confirming-tx" ||
    signing ||
    writeTx.isPending ||
    writeReceipt.isLoading ||
    weth.isWrapping ||
    takerStatus.isApproving;

  // Wrap parent close so dismissing the modal always clears consent. The
  // next time the same (or a different) order opens, the checkbox starts
  // unticked again.
  function handleClose() {
    setTermsAgreed(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full md:max-w-[480px] bg-bg-soft border border-line rounded-t-2xl md:rounded-2xl overflow-hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-line">
          <h2 className="text-[14px] font-medium uppercase tracking-[0.14em]">
            {t("trade.fillModal.title")}
          </h2>
          <button
            onClick={handleClose}
            className="text-fg-faint hover:text-fg text-[20px] leading-none"
            aria-label="close"
          >
            ×
          </button>
        </header>

        <div className="p-5 space-y-4 text-[13px]">
          <Row
            label={t("trade.fillModal.pair")}
            value={order.pair.split("/").map(symbolLabel).join(" / ")}
          />
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

          {/* H-05: taker-side fill amount, in the token the taker receives.
              Prefilled with the full remaining amount; editable down for a
              partial fill (the contract has supported this all along). */}
          <div>
            <div className="flex items-end justify-between mb-1.5 gap-2">
              <span className="text-[12px] text-fg-dim">
                {t("trade.fillModal.fillAmount")}
              </span>
              <span className="text-[11px] text-fg-faint font-mono">
                {youReceiveSym}
              </span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.02] border border-line rounded-md focus-within:border-line-strong">
              <input
                inputMode="decimal"
                value={fillInput}
                onChange={(e) => setFillInput(e.target.value)}
                disabled={isAlreadyDone || (phase !== "idle" && phase !== "error")}
                className="w-full bg-transparent outline-none text-[15px] font-mono tnum placeholder:text-fg-faint disabled:opacity-50"
                aria-label={t("trade.fillModal.fillAmount")}
              />
              <button
                type="button"
                onClick={() =>
                  setFillInput(formatUnits(remainingMaker, baseDecimals))
                }
                disabled={isAlreadyDone || (phase !== "idle" && phase !== "error")}
                className="shrink-0 px-2 py-1 rounded border border-line text-[11px] text-fg-dim hover:text-fg hover:border-line-strong transition-colors disabled:opacity-50"
              >
                {t("trade.fillModal.fillAmountMax")}
              </button>
            </div>
            <div className="mt-1 text-[11px] text-fg-faint">
              {t("trade.fillModal.partialHint")}
            </div>
          </div>

          {fillCalc.error === "range" ? (
            <Note kind="warn">
              {t("trade.fillModal.fillAmountRange")
                .replace("{max}", formatBalance(remainingMaker, baseDecimals))
                .replace("{symbol}", youReceiveSym)}
            </Note>
          ) : null}
          {fillCalc.error === "tooSmall" ? (
            <Note kind="warn">{t("trade.fillModal.fillAmountTooSmall")}</Note>
          ) : null}

          {feeAppliesToTakerReceive ? (
            <>
              <Row
                label={t("trade.fillModal.youReceiveGross")}
                value={
                  <span className="font-mono tnum text-fg-dim">
                    {youReceive} {youReceiveSym}
                  </span>
                }
              />
              <Row
                label={t("trade.fillModal.protocolFee").replace(
                  "{bps}",
                  feeBpsDisplay,
                )}
                value={
                  <span className="font-mono tnum text-fg-dim">
                    −{youReceiveFee} {youReceiveSym}
                  </span>
                }
              />
              <Row
                label={t("trade.fillModal.youReceiveNet")}
                value={
                  <span className="font-mono tnum text-buy">
                    {youReceiveNet} {youReceiveSym}
                  </span>
                }
                emphasis
              />
            </>
          ) : (
            <Row
              label={t("trade.fillModal.youReceive")}
              value={
                <span className="font-mono tnum text-buy">
                  {youReceive} {youReceiveSym}
                </span>
              }
              emphasis
            />
          )}
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
          {onSupportedChain && previewQuery.isError ? (
            <Note kind="error">{t("trade.fillModal.previewFeeError")}</Note>
          ) : null}

          {error ? <Note kind="error">{error}</Note> : null}
          {phase === "done" ? (
            <Note kind="success">{t("trade.fillModal.settled")}</Note>
          ) : null}

          {phase === "approving-erc20" ||
          phase === "awaiting-permit-sig" ||
          phase === "submitting-tx" ||
          takerStatus.isApproving ||
          signing ||
          writeTx.isPending ? (
            <Note kind="warn">{t("trade.fillModal.walletPopupHint")}</Note>
          ) : null}

          {!isAlreadyDone && phase !== "error" ? (
            <TermsConsentCheckbox
              checked={termsAgreed}
              onChange={setTermsAgreed}
            />
          ) : null}

          <button
            onClick={buttonAction}
            disabled={buttonDisabled}
            title={
              !termsAgreed && phase !== "error" && !isAlreadyDone
                ? t("terms.consent.required")
                : undefined
            }
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
  // Sub-1 values get 12 fraction digits (same D-05 rule as PlaceOrder's
  // fmtNum) so dust-priced WETH legs don't round away to "0".
  const maxFrac = whole === 0n ? 12 : 6;
  const fracPadded = fracRaw.toString().padStart(decimals, "0").slice(0, maxFrac);
  const fracTrimmed = fracPadded.replace(/0+$/, "");
  return fracTrimmed.length === 0 ? wholeStr : `${wholeStr}.${fracTrimmed}`;
}

/**
 * H-05 partial fill: parse the taker's fill-size input (makerToken units,
 * comma / space tolerant per D-02) and compute the exact takerToken payment
 * by mirroring ScentDexV6._proportionalTakerAmount:
 *   - final fill (fillMaker == remaining): pays the exact remaining taker
 *     quota (takerAmount − filledTakerAmount)
 *   - partial fill: ceil(fillMaker × takerAmount / makerAmount), capped at
 *     the remaining quota (rounds in the maker's favour — matches on-chain)
 * The permit amount and the preview both use this value, so what the taker
 * signs is exactly what the contract pulls.
 */
function computeFill(
  order: FillOrder | null,
  fillInput: string,
  makerDecimals: number,
): {
  fillMaker: bigint | null;
  fillTaker: bigint | null;
  error: "range" | "tooSmall" | null;
} {
  if (!order) return { fillMaker: null, fillTaker: null, error: null };
  const makerAmount = BigInt(order.order.makerAmount);
  const takerAmount = BigInt(order.order.takerAmount);
  const filledMaker = BigInt(order.filledMakerAmount);
  const filledTaker = BigInt(order.filledTakerAmount);
  const remainingMaker =
    makerAmount > filledMaker ? makerAmount - filledMaker : 0n;
  if (remainingMaker === 0n || makerAmount === 0n)
    return { fillMaker: null, fillTaker: null, error: null };

  const cleaned = fillInput.replace(/[,\s]/g, "");
  // Audit C-L3: viem's parseUnits ROUNDS excess fraction digits (e.g.
  // "1.0000005" at 6 decimals → 1000001), so the user would sign for an
  // amount that differs from what they typed. Reject instead of rounding.
  const frac = cleaned.split(".")[1];
  if (frac !== undefined && frac.length > makerDecimals)
    return { fillMaker: null, fillTaker: null, error: "range" };
  let parsed: bigint;
  try {
    parsed = parseUnits(cleaned, makerDecimals);
  } catch {
    return { fillMaker: null, fillTaker: null, error: "range" };
  }
  if (parsed <= 0n || parsed > remainingMaker)
    return { fillMaker: null, fillTaker: null, error: "range" };

  const fillTaker = proportionalTakerAmount(
    parsed,
    makerAmount,
    takerAmount,
    filledMaker,
    filledTaker,
  );
  // The contract reverts ZeroResidualTaker on a zero payment leg — surface
  // it as "amount too small" before the taker burns gas discovering it.
  if (fillTaker === 0n)
    return { fillMaker: null, fillTaker: null, error: "tooSmall" };

  return { fillMaker: parsed, fillTaker, error: null };
}

/** Wei-exact mirror of ScentDexV6._proportionalTakerAmount (r6). */
function proportionalTakerAmount(
  fillMaker: bigint,
  makerAmount: bigint,
  takerAmount: bigint,
  filledMaker: bigint,
  filledTaker: bigint,
): bigint {
  const remainingTakerQuota =
    takerAmount > filledTaker ? takerAmount - filledTaker : 0n;
  if (filledMaker + fillMaker === makerAmount) return remainingTakerQuota;
  const rawCeil = (fillMaker * takerAmount + makerAmount - 1n) / makerAmount;
  return rawCeil > remainingTakerQuota ? remainingTakerQuota : rawCeil;
}

// Silence "unused" lint for the empty-permit constants — kept exported in
// permit2.ts for future legacy-order paths but referenced here for the
// pattern they document.
void EMPTY_PERMIT_SINGLE;
void EMPTY_PERMIT_SIGNATURE;
void serialisePermitSingle;
