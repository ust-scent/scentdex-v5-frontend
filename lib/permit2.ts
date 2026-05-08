import {
  type Address,
  type Hex,
  type TypedDataDomain,
} from "viem";

import { PERMIT2_ADDRESS } from "@/lib/contracts";

/**
 * Per-order Permit2 signature utilities.
 *
 * The threat we close with this module:
 *
 * V5 settles via `permit2.transferFrom(maker, taker, amount, token)` —
 * it pulls `amount` of `token` from `maker` against the per-spender
 * allowance Permit2 has on file for the DEX. Earlier rounds approved
 * that allowance to `(MaxUint160, MaxUint48)` once and reused it for
 * every order. Cheap UX, but it means a wallet holding 100M tokens
 * has 100M of risk on the DEX even when the user only signed a 1M
 * order — any contract bug or compromised owner could drain the lot.
 *
 * V5's `_fillOrder` already supports a per-fill alternative:
 * `makerPermit + makerPermitSignature` arguments which, when present,
 * cause the contract to call `permit2.permit(maker, makerPermit, sig)`
 * just before the transfer (see ScentDexV5.sol:1004-1008). The contract
 * verifies that:
 *
 *   makerPermit.details.token   == order.makerToken
 *   makerPermit.spender         == address(this)
 *   makerPermit.details.amount  >= fillMakerAmount
 *
 * so a maker who signs a PermitSingle for amount=order.makerAmount,
 * expiration=order.expiry, spender=DEX commits exactly the value the
 * order can ever consume — nothing more. Once that order expires or
 * fills, the permit is dead. There is no idle "blanket allowance" sitting
 * on Permit2 between trades.
 *
 * That's the security delta: blast radius collapses from "wallet's
 * entire balance" to "the open orders the maker actually signed".
 */

/**
 * Permit2 EIP-712 domain. Note: unlike SCENTDEX's own domain, Permit2's
 * does NOT carry a `version` field — the canonical Permit2 contract is
 * versionless by design (Uniswap's choice; PermitSingle struct hashes
 * are stable across all chains).
 */
export function buildPermit2Domain(chainId: number): TypedDataDomain {
  return {
    name: "Permit2",
    chainId,
    verifyingContract: PERMIT2_ADDRESS,
  };
}

/**
 * EIP-712 types for `PermitSingle`, mirroring the canonical Uniswap
 * Permit2 contract source. Field order matters — the wallet must
 * compute the same struct hash the contract does.
 */
export const PERMIT_SINGLE_TYPES = {
  PermitSingle: [
    { name: "details", type: "PermitDetails" },
    { name: "spender", type: "address" },
    { name: "sigDeadline", type: "uint256" },
  ],
  PermitDetails: [
    { name: "token", type: "address" },
    { name: "amount", type: "uint160" },
    { name: "expiration", type: "uint48" },
    { name: "nonce", type: "uint48" },
  ],
} as const;

/** Plain-object representation of an EIP-712 PermitSingle message. */
export type PermitSingle = {
  details: {
    token: Address;
    amount: bigint; // uint160
    expiration: number; // uint48 — Unix seconds
    nonce: number; // uint48 — current Permit2 nonce for (owner, token, spender)
  };
  spender: Address;
  sigDeadline: bigint;
};

/**
 * Build a PermitSingle scoped to one order:
 *  - amount       = order.makerAmount        — never approve more than the order can spend
 *  - expiration   = order.expiry             — Permit2 reverts AllowanceExpired past this
 *  - nonce        = caller passes the current nonce from Permit2.allowance(...)
 *  - spender      = the SCENTDEX V5 contract address
 *  - sigDeadline  = order.expiry             — keep the signature itself unforgeable past expiry
 */
export function buildOrderPermit({
  ownerNonce,
  makerToken,
  makerAmount,
  expiry,
  dex,
}: {
  ownerNonce: number;
  makerToken: Address;
  makerAmount: bigint;
  /** Order expiry as Unix seconds (matches Order.expiry). */
  expiry: bigint;
  dex: Address;
}): PermitSingle {
  return {
    details: {
      token: makerToken,
      amount: makerAmount,
      expiration: Number(expiry),
      nonce: ownerNonce,
    },
    spender: dex,
    sigDeadline: expiry,
  };
}

/** JSON-safe serialisation for /api/orders POST + persistence. */
export type SerialisedPermitSingle = {
  details: {
    token: Address;
    amount: string; // bigint as decimal string
    expiration: number;
    nonce: number;
  };
  spender: Address;
  sigDeadline: string; // bigint as decimal string
};

export function serialisePermitSingle(p: PermitSingle): SerialisedPermitSingle {
  return {
    details: {
      token: p.details.token,
      amount: p.details.amount.toString(),
      expiration: p.details.expiration,
      nonce: p.details.nonce,
    },
    spender: p.spender,
    sigDeadline: p.sigDeadline.toString(),
  };
}

export function reifyPermitSingle(p: SerialisedPermitSingle): PermitSingle {
  return {
    details: {
      token: p.details.token,
      amount: BigInt(p.details.amount),
      expiration: p.details.expiration,
      nonce: p.details.nonce,
    },
    spender: p.spender,
    sigDeadline: BigInt(p.sigDeadline),
  };
}

/** Empty PermitSingle used by the legacy infinite-allowance path. */
export const EMPTY_PERMIT_SINGLE: PermitSingle = {
  details: {
    token: ("0x" + "0".repeat(40)) as Address,
    amount: 0n,
    expiration: 0,
    nonce: 0,
  },
  spender: ("0x" + "0".repeat(40)) as Address,
  sigDeadline: 0n,
};

export const EMPTY_PERMIT_SIGNATURE: Hex = "0x";
