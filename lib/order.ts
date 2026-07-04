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
  chainId,
}: {
  side: "buy" | "sell";
  base: Token;
  quote: Token;
  /** Maker-side size, decimal string. Base on sell, quote on buy. */
  size: string;
  /** Unit price = quote per 1 base, decimal string. */
  unitPrice: string;
  /** Active chain. Determines which per-chain token address to embed. */
  chainId: number;
}): {
  makerToken: Address;
  takerToken: Address;
  makerAmount: bigint;
  takerAmount: bigint;
} | null {
  if (!base.addresses[chainId] || !quote.addresses[chainId]) return null;

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

  // The maker's own amount is parsed straight from their input string
  // (exact). The counter-amount is derived from size × price entirely in
  // bigint so no float rounding leaks into the on-chain values — critical
  // for dust-priced pairs like 1 SDT = 0.000005 WETH where the old
  // `(sizeN * priceN).toFixed(18)` path lost precision in the low wei.
  const sizeFrac = toFraction(size);
  const priceFrac = toFraction(unitPrice);
  if (sizeFrac === null || priceFrac === null || priceFrac.num === 0n) {
    return null;
  }

  if (side === "sell") {
    // Sell base → user gives base, receives quote.
    // takerQuoteWei = round( size × price × 10^quoteDecimals )
    //   size × price = (sizeNum/10^sizeScale) × (priceNum/10^priceScale)
    const makerAmount = safeParse(size, base.decimals);
    const numer =
      sizeFrac.num * priceFrac.num * pow10(quote.decimals);
    const denom = pow10(sizeFrac.scale + priceFrac.scale);
    const takerAmount = roundDiv(numer, denom);
    if (makerAmount === null || makerAmount === 0n || takerAmount === 0n) {
      return null;
    }
    return {
      makerToken: chainAddr(base, chainId),
      takerToken: chainAddr(quote, chainId),
      makerAmount,
      takerAmount,
    };
  }

  // Buy base → user gives quote (budget), receives base.
  // takerBaseWei = round( budget ÷ price × 10^baseDecimals )
  //   budget ÷ price = (sizeNum/10^sizeScale) ÷ (priceNum/10^priceScale)
  //                  = sizeNum × 10^priceScale / (10^sizeScale × priceNum)
  const makerAmount = safeParse(size, quote.decimals);
  const numer = sizeFrac.num * pow10(priceFrac.scale + base.decimals);
  const denom = pow10(sizeFrac.scale) * priceFrac.num;
  const takerAmount = roundDiv(numer, denom);
  if (makerAmount === null || makerAmount === 0n || takerAmount === 0n) {
    return null;
  }
  return {
    makerToken: chainAddr(quote, chainId),
    takerToken: chainAddr(base, chainId),
    makerAmount,
    takerAmount,
  };
}

/** 10^n as a bigint (n >= 0). */
function pow10(n: number): bigint {
  return 10n ** BigInt(n);
}

/** Round-half-up integer division for positive numerator/denominator. */
function roundDiv(numer: bigint, denom: bigint): bigint {
  if (denom === 0n) return 0n;
  return (numer + denom / 2n) / denom;
}

/**
 * Parse a non-negative decimal string into an exact fraction
 * `value = num / 10^scale`. Returns null for empty / malformed / signed /
 * exponent inputs. "0.000005" → { num: 5n, scale: 6 }.
 */
function toFraction(s: string): { num: bigint; scale: number } | null {
  const trimmed = s.trim();
  if (!trimmed || trimmed === "." || !/^\d*\.?\d*$/.test(trimmed)) return null;
  const [intPart = "", fracPart = ""] = trimmed.split(".");
  const digits = intPart + fracPart;
  if (digits === "") return null;
  return { num: BigInt(digits), scale: fracPart.length };
}

function safeParse(value: string, decimals: number): bigint | null {
  if (!value || value === "." || Number.isNaN(Number(value))) return null;
  try {
    return parseUnits(value, decimals);
  } catch {
    return null;
  }
}

function chainAddr(token: Token, chainId: number): Address {
  const addr = token.addresses[chainId];
  if (!addr) {
    throw new Error(
      `Token ${token.symbol} has no address on chainId ${chainId}; caller must gate via pairsForChain / addresses[chainId] before calling buildAmounts.`,
    );
  }
  return addr;
}
