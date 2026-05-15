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

import { BaseError, ContractFunctionRevertedError } from "viem";

import type { Dictionary, TranslationKey } from "@/lib/i18n-dictionary";

type Translator = <K extends TranslationKey>(key: K) => Dictionary[K];

/** Coerce a translator result to a string, dropping the readonly-array
 *  variants the dictionary holds for list-shaped keys (which never appear
 *  in this module's i18n map). */
function tStr(t: Translator, key: TranslationKey): string {
  const v = t(key);
  return typeof v === "string" ? v : v.join(" ");
}

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

/** True when the error originated in the wallet UI, not in a contract revert. */
function isWalletRejection(message: string): boolean {
  return /user rejected|user denied|rejected the request|UserRejectedRequest/i.test(
    message,
  );
}

export function parseFillError(err: unknown, t: Translator): string {
  if (!err) return tStr(t, "trade.fillError.unknown");

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
      if (errorName) {
        return `${tStr(t, "trade.fillError.revertedWith")}: ${errorName}`;
      }
      return tStr(t, "trade.fillError.reverted");
    }

    // Not a contract revert, but still a viem error — surface its short
    // form rather than the multi-paragraph debug dump.
    return err.shortMessage || err.message.slice(0, 200);
  }

  // Plain-ish Error (or anything else thrown).
  const message = err instanceof Error ? err.message : String(err);
  if (isWalletRejection(message)) {
    return tStr(t, "trade.fillError.walletRejected");
  }
  return message.slice(0, 200);
}
