/**
 * Turn whatever viem / wagmi throws at us during a fillOrder into a short,
 * user-readable string.
 *
 * Two paths into this:
 *
 *   1) Wallet-side rejection — user closed the popup, network unavailable,
 *      etc. The thrown error usually has "User rejected" / "user denied" in
 *      its message. Reduces to a single "you cancelled" line.
 *
 *   2) On-chain revert — the tx made it to a block but the contract threw.
 *      viem wraps the revert in a `ContractFunctionRevertedError` deeper
 *      in the error chain. `BaseError.walk` traverses the chain to find
 *      it; the `errorName` on that node is the Solidity custom-error name
 *      (e.g. "FillExceedsMaker"). We map known names to i18n keys; unknown
 *      names fall back to "Reverted with: <name>".
 *
 * The map covers the V5 r6 custom errors that can fire during fillOrder
 * specifically (ScentDexV5.sol lines 140–211 minus the owner-only ones
 * that takers will never hit). Anything outside that set hits the
 * generic fallback rather than silently swallowing.
 *
 * Why a util instead of inline in FillModal: the same parser can be
 * reused for any future fill flows (batch fillOrders, mobile bottom-sheet
 * variants), and pulling it out keeps the JSX manageable.
 */

import {
  BaseError,
  ContractFunctionRevertedError,
  decodeErrorResult,
  type Abi,
  type Hash,
  type Hex,
  type PublicClient,
  type TransactionReceipt,
} from "viem";

import type { Dictionary, TranslationKey } from "@/lib/i18n-dictionary";

/**
 * Marker shape returned by `fetchRevertError` when it successfully
 * decodes a custom-error name from a reverted simulation's raw data.
 * `parseFillError` recognises this shape and maps the name through the
 * same `ERROR_KEY_MAP` it uses for `ContractFunctionRevertedError`.
 */
export type RecoveredRevert = { __recoveredErrorName: string };

function isRecoveredRevert(v: unknown): v is RecoveredRevert {
  return (
    typeof v === "object" &&
    v !== null &&
    "__recoveredErrorName" in v &&
    typeof (v as { __recoveredErrorName: unknown }).__recoveredErrorName ===
      "string"
  );
}

/**
 * Walk a viem error chain looking for a node carrying raw EVM revert
 * data (hex bytes starting with `0x` and longer than the empty-revert
 * marker). Found on `RawContractError` and a few other viem nodes when
 * `client.call()` reverts without ABI context.
 */
function findRawRevertData(err: unknown): Hex | null {
  // A 4-byte custom-error selector with no args is exactly 10 chars
  // ("0x" + 8 hex). Selectors with args are longer. Anything shorter is
  // not real revert data (e.g. bare "0x" empty revert). Use `>= 10`, not
  // `> 10` — strict-greater would drop no-arg customs.
  //
  // Walk the `cause` chain manually rather than relying on viem's
  // `BaseError.walk` / an `instanceof BaseError` check, so that this
  // works even when the test harness or some bundling chain ends up
  // loading two copies of viem (the `instanceof` identity breaks across
  // module duplicates, while duck-typing on `.cause` does not).
  let current: unknown = err;
  for (let depth = 0; depth < 16 && current && typeof current === "object"; depth++) {
    const d = (current as { data?: unknown }).data;
    if (typeof d === "string" && d.startsWith("0x") && d.length >= 10) {
      return d as Hex;
    }
    const next = (current as { cause?: unknown }).cause;
    if (next === current) break; // self-referential cause guard
    current = next;
  }
  return null;
}

type Translator = <K extends TranslationKey>(key: K) => Dictionary[K];

/** Coerce a translator result to a string, dropping the readonly-array
 *  variants the dictionary holds for list-shaped keys (which never appear
 *  in this module's i18n map). */
function tStr(t: Translator, key: TranslationKey): string {
  const v = t(key);
  return typeof v === "string" ? v : v.join(" ");
}

/** ABI-derived V5 custom-error names → friendly i18n keys. */
const ERROR_KEY_MAP: Record<string, TranslationKey> = {
  FillExceedsMaker: "trade.fillError.alreadyFilled",
  OrderAlreadyCancelled: "trade.fillError.cancelled",
  AllOrdersCancelled: "trade.fillError.allCancelled",
  ExpiredOrInvalidExpiry: "trade.fillError.expired",
  InvalidNonce: "trade.fillError.invalidNonce",
  InvalidSignature: "trade.fillError.invalidSignature",
  TakerAmountBelowFloor: "trade.fillError.takerBelowFloor",
  PriceRatioAboveCap: "trade.fillError.priceRatio",
  Permit2TokenMismatch: "trade.fillError.permit2TokenMismatch",
  Permit2SpenderMismatch: "trade.fillError.permit2SpenderMismatch",
  Permit2AmountInsufficient: "trade.fillError.permit2AmountInsufficient",
  AddressBlacklisted: "trade.fillError.blacklisted",
  TokenNotAllowed: "trade.fillError.tokenNotAllowed",
  PairNotEnabled: "trade.fillError.pairNotEnabled",
  ZeroFillAmount: "trade.fillError.zeroFill",
  ZeroResidualTaker: "trade.fillError.zeroResidual",
  FeeSideMismatch: "trade.fillError.feeSideMismatch",
  FeeBpsMismatch: "trade.fillError.feeBpsMismatch",
};

/** Non-ABI signal strings that viem / RPC providers surface as `errorName`
 *  or that show up free-form in `shortMessage`. Tested by lowercase
 *  substring match (everything in the keys must already be lowercase). */
const GENERIC_SIGNAL_MAP: Array<[string, TranslationKey]> = [
  ["gas limit too high", "trade.fillError.gasLimitTooHigh"],
  ["insufficient funds", "trade.fillError.insufficientFunds"],
  ["fetch failed", "trade.fillError.networkError"],
  ["network request failed", "trade.fillError.networkError"],
  ["http request failed", "trade.fillError.networkError"],
];

function matchGenericSignal(s: string): TranslationKey | undefined {
  const lower = s.toLowerCase();
  for (const [needle, key] of GENERIC_SIGNAL_MAP) {
    if (lower.includes(needle)) return key;
  }
  return undefined;
}

/** True when the error originated in the wallet UI, not in a contract revert. */
function isWalletRejection(message: string): boolean {
  return /user rejected|user denied|rejected the request|UserRejectedRequest/i.test(
    message,
  );
}

/**
 * Best-effort retrieval of a reverted transaction's underlying error.
 *
 * viem's `useWaitForTransactionReceipt` resolves successfully even when
 * the transaction itself reverted on-chain (`receipt.status === 'reverted'`).
 * The receipt does NOT carry the revert reason. To recover the reason we
 * re-simulate the same tx via `client.call()` at the block it was mined
 * in; that call throws with the EVM revert payload, which we then decode
 * against the provided ABI so `parseFillError` can map it to a custom
 * i18n key (e.g. `FillExceedsMaker` → "already filled by another taker").
 *
 * `client.call()` is used (not `simulateContract`) because we only have
 * the raw `tx.input` blob — no decomposed `functionName` / `args` — so we
 * must decode the revert data manually rather than relying on viem's
 * built-in error-decoding for `simulateContract`.
 *
 * Returns:
 *  - a `RecoveredRevert` marker when a custom error was decoded against
 *    `abi` (`parseFillError` then routes it through the same key map),
 *  - the raw error otherwise (`parseFillError`'s generic fallbacks kick
 *    in: wallet-rejection, network signals, or `unknown`),
 *  - `null` if the simulation unexpectedly succeeded or the original tx
 *    could not be fetched (caller should show a generic "reverted" copy).
 */
export async function fetchRevertError(
  client: PublicClient,
  txHash: Hash,
  receipt: TransactionReceipt,
  abi: Abi,
): Promise<unknown | null> {
  try {
    const tx = await client.getTransaction({ hash: txHash });
    if (!tx.to) return null;
    await client.call({
      to: tx.to,
      data: tx.input,
      account: tx.from,
      value: tx.value,
      blockNumber: receipt.blockNumber,
    });
    // call unexpectedly succeeded — receipt says reverted but simulation
    // says OK. Rare (reorg / fork-aware races) but recoverable — tell the
    // caller to fall back to a generic copy.
    return null;
  } catch (e) {
    // Note: we deliberately do not gate on `instanceof BaseError` — the
    // identity check fails when two copies of viem are loaded (test
    // harnesses, dual-bundle setups). `findRawRevertData` is duck-typed
    // on `.cause`/`.data` so it works on either.
    const data = findRawRevertData(e);
    if (data) {
      try {
        const decoded = decodeErrorResult({ abi, data });
        return { __recoveredErrorName: decoded.errorName } satisfies RecoveredRevert;
      } catch {
        // ABI didn't match the data — fall through to raw-error return so
        // parseFillError's generic fallbacks can still try to translate it.
      }
    }
    return e;
  }
}

export function parseFillError(err: unknown, t: Translator): string {
  if (!err) return tStr(t, "trade.fillError.unknown");

  // Synthetic marker from `fetchRevertError`: a custom-error name that
  // was decoded off the raw revert data of a re-simulated reverted tx.
  if (isRecoveredRevert(err)) {
    const name = err.__recoveredErrorName;
    if (name in ERROR_KEY_MAP) return tStr(t, ERROR_KEY_MAP[name]);
    return tStr(t, "trade.fillError.reverted");
  }

  // viem-flavoured error: walk the chain looking for a revert node.
  if (err instanceof BaseError) {
    if (isWalletRejection(err.message)) {
      return tStr(t, "trade.fillError.walletRejected");
    }

    const reverted = err.walk(
      (node) => node instanceof ContractFunctionRevertedError,
    );
    if (reverted instanceof ContractFunctionRevertedError) {
      // viem types `data.errorName` as `string | readonly string[]`
      // (the union covers function overloads). For custom errors it's
      // always a single string; normalise to that.
      const rawName: string | readonly string[] | undefined =
        reverted.data?.errorName ??
        // Older viem builds expose `.reason` instead of `.data.errorName`
        // for custom errors that couldn't be matched against the ABI.
        (reverted as unknown as { reason?: string }).reason;
      let errorName: string | undefined;
      if (typeof rawName === "string") {
        errorName = rawName;
      } else if (Array.isArray(rawName) && typeof rawName[0] === "string") {
        errorName = rawName[0];
      }

      if (errorName && errorName in ERROR_KEY_MAP) {
        return tStr(t, ERROR_KEY_MAP[errorName]);
      }
      // Some non-V5 conditions (eth_estimateGas hints, RPC gas caps) show
      // up where `errorName` would be — translate the well-known ones and
      // drop the raw English the rest of the way.
      const generic = errorName ? matchGenericSignal(errorName) : undefined;
      if (generic) return tStr(t, generic);
      // Custom error fired but its name isn't in our map AND isn't a known
      // generic signal — show a clean "reverted" line instead of leaking
      // the bare ABI string into the UI.
      return tStr(t, "trade.fillError.reverted");
    }

    // Not a contract revert — viem still gave us a BaseError. Check the
    // shortMessage for known network / RPC signals before falling back to
    // a generic line. We DO NOT surface the raw English shortMessage to
    // end users (i18n leak + scary debug text).
    const shortMatch = matchGenericSignal(err.shortMessage || err.message);
    if (shortMatch) return tStr(t, shortMatch);
    return tStr(t, "trade.fillError.unknown");
  }

  // Plain-ish Error (or anything else thrown).
  const message = err instanceof Error ? err.message : String(err);
  if (isWalletRejection(message)) {
    return tStr(t, "trade.fillError.walletRejected");
  }
  const genericFromMsg = matchGenericSignal(message);
  if (genericFromMsg) return tStr(t, genericFromMsg);
  return tStr(t, "trade.fillError.unknown");
}
