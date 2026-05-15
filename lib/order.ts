import {
  encodeAbiParameters,
  hashTypedData,
  keccak256,
  parseUnits,
  toHex,
  type Address,
  type Hex,
  type TypedDataDomain,
} from "viem";

import { DOMAIN_NAME, DOMAIN_VERSION } from "@/lib/contracts";
import type { Token } from "@/lib/tokens";

/**
 * Canonical V5 Order struct per V5_specification_r6.md §8.
 * Field order matches ORDER_TYPEHASH.
 */
export type Order = {
  maker: Address;
  makerToken: Address;
  takerToken: Address;
  makerAmount: bigint;
  takerAmount: bigint;
  expiry: bigint; // uint64
  nonce: bigint;
  salt: Hex; // bytes32
  feeSide: Address;
  feeBps: number; // uint16
};

/**
 * EIP-712 type definition for the Order struct.
 * Used by `signTypedData` and by `_hashOrder` on the contract.
 */
export const ORDER_TYPES = {
  Order: [
    { name: "maker", type: "address" },
    { name: "makerToken", type: "address" },
    { name: "takerToken", type: "address" },
    { name: "makerAmount", type: "uint256" },
    { name: "takerAmount", type: "uint256" },
    { name: "expiry", type: "uint64" },
    { name: "nonce", type: "uint256" },
    { name: "salt", type: "bytes32" },
    { name: "feeSide", type: "address" },
    { name: "feeBps", type: "uint16" },
  ],
} as const;

/** EIP-712 domain for the SCENTDEX V5 contract on the given chain. */
export function buildDomain(
  chainId: number,
  verifyingContract: Address,
): TypedDataDomain {
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    chainId,
    verifyingContract,
  };
}

/**
 * Compute the EIP-712 message hash for an Order. Mirrors the contract's
 * `_hashOrder` (V5 r6 §7.7) by abi-encoding the typehash + fields and
 * keccak256'ing.
 *
 * NOTE: this is the inner struct hash, not the full digest. The full
 * EIP-712 digest (`keccak256(0x1901 ‖ domainSeparator ‖ structHash)`) is
 * computed by the wallet during `signTypedData`, so the UI doesn't need it.
 */
export const ORDER_TYPEHASH: Hex = keccak256(
  toHex(
    "Order(address maker,address makerToken,address takerToken,uint256 makerAmount,uint256 takerAmount,uint64 expiry,uint256 nonce,bytes32 salt,address feeSide,uint16 feeBps)",
  ),
);

/**
 * Compute the full EIP-712 digest for an Order (the one wallets sign and
 * the V5 contract emits as `orderHash`). This is the canonical identifier
 * the off-chain order book uses as primary key, and the value the cancel
 * endpoint expects in the typed-data message under `orderHash: bytes32`.
 *
 * Replaces the placeholder "use signature as orderHash" hack that landed
 * in Phase 3.5 — that worked as a unique key but produced a 65-byte value
 * which viem (correctly) rejected when the cancel UI re-encoded it as a
 * bytes32 field.
 */
export function hashOrder(
  order: Order,
  chainId: number,
  verifyingContract: Address,
): Hex {
  return hashTypedData({
    domain: buildDomain(chainId, verifyingContract),
    types: ORDER_TYPES,
    primaryType: "Order",
    message: order as unknown as Record<string, unknown>,
  } as Parameters<typeof hashTypedData>[0]);
}

export function structHash(order: Order): Hex {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "bytes32" },
        { type: "address" },
        { type: "address" },
        { type: "address" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint64" },
        { type: "uint256" },
        { type: "bytes32" },
        { type: "address" },
        { type: "uint16" },
      ],
      [
        ORDER_TYPEHASH,
        order.maker,
        order.makerToken,
        order.takerToken,
        order.makerAmount,
        order.takerAmount,
        order.expiry,
        order.nonce,
        order.salt,
        order.feeSide,
        order.feeBps,
      ],
    ),
  );
}

/**
 * Random 256-bit salt for an order. Each order should use a fresh salt so
 * orders that share other fields produce distinct hashes.
 */
export function randomSalt(): Hex {
  const buf = new Uint8Array(32);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(buf);
  } else {
    for (let i = 0; i < 32; i++) buf[i] = Math.floor(Math.random() * 256);
  }
  return ("0x" + Array.from(buf).map((b) => b.toString(16).padStart(2, "0")).join("")) as Hex;
}

/**
 * Convert an expiry choice into a Unix-second timestamp.
 *
 * V5 requires `expiry > 0 && expiry > block.timestamp` so the contract
 * doesn't accept a literal "no expiry" — the round-5 UI defaults to one
 * month, which is long enough that a typical maker never thinks about it,
 * and short enough that drift between signed price and market price stays
 * bounded. Power users can still pick 1d / 1w / 1mo / 1y from the
 * disclosure.
 */
export function expiryFromChoice(
  choice: "1d" | "1w" | "1mo" | "1y",
): bigint {
  const now = Math.floor(Date.now() / 1000);
  const map: Record<typeof choice, number> = {
    "1d": 86_400,
    "1w": 7 * 86_400,
    "1mo": 30 * 86_400,
    "1y": 365 * 86_400,
  };
  return BigInt(now + map[choice]);
}

/**
 * Side helper: maps the user's "size + unit price" intent onto the
 * canonical (makerToken, takerToken, makerAmount, takerAmount) the
 * contract expects.
 *
 * `size` is denominated on the *maker side* — the side the user gives up:
 *
 *   - SELL SCENT: size is in SCENT (how many to sell)
 *                     makerToken=SCENT,  takerToken=JPYC
 *                     makerAmount=size,      takerAmount=size * unitPrice
 *   - BUY  SCENT: size is in JPYC (budget to spend)
 *                     makerToken=JPYC,   takerToken=SCENT
 *                     makerAmount=size,      takerAmount=size / unitPrice
 *
 * `unitPrice` is always quote per 1 base, no matter which side. Matches
 * how a human thinks about an order: "I have N to spend / sell, and the
 * unit price I want is X."
 */
export function buildAmounts({
  side,
  base,
  quote,
  size,
  unitPrice,
}: {
  side: "buy" | "sell";
  base: Token;
  quote: Token;
  /** Maker-side size, decimal string. Base on sell, quote on buy. */
  size: string;
  /** Unit price = quote per 1 base, decimal string. */
  unitPrice: string;
}): {
  makerToken: Address;
  takerToken: Address;
  makerAmount: bigint;
  takerAmount: bigint;
} | null {
  if (!base.addresses[11155111] && !base.addresses[1]) return null;
  if (!quote.addresses[11155111] && !quote.addresses[1]) return null;

  const sizeN = Number(size);
  const priceN = Number(unitPrice);
  if (
    !Number.isFinite(sizeN) ||
    !Number.isFinite(priceN) ||
    sizeN <= 0 ||
    priceN <= 0
  ) {
    return null;
  }

  if (side === "sell") {
    // Sell base → user gives base, receives quote.
    const makerAmount = safeParse(size, base.decimals);
    const quoteFloat = sizeN * priceN;
    const takerAmount = safeParse(quoteFloat.toFixed(18), quote.decimals);
    if (makerAmount === null || takerAmount === null) return null;
    return {
      makerToken: chainAddr(base),
      takerToken: chainAddr(quote),
      makerAmount,
      takerAmount,
    };
  }

  // Buy base → user gives quote (budget), receives base.
  const makerAmount = safeParse(size, quote.decimals);
  const baseFloat = sizeN / priceN;
  const takerAmount = safeParse(baseFloat.toFixed(18), base.decimals);
  if (makerAmount === null || takerAmount === null) return null;
  return {
    makerToken: chainAddr(quote),
    takerToken: chainAddr(base),
    makerAmount,
    takerAmount,
  };
}

function safeParse(value: string, decimals: number): bigint | null {
  if (!value || value === "." || Number.isNaN(Number(value))) return null;
  try {
    return parseUnits(value, decimals);
  } catch {
    return null;
  }
}

function chainAddr(token: Token): Address {
  // Caller is expected to gate via useChainId; this picks whichever address is set.
  return (token.addresses[11155111] ?? token.addresses[1] ?? ("0x" + "0".repeat(40))) as Address;
}
