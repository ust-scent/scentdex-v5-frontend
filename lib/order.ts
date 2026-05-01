import {
  encodeAbiParameters,
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
 * Convert a 1h / 1d / 1w / custom-seconds expiry choice into a Unix-second
 * timestamp.
 */
export function expiryFromChoice(choice: "1h" | "1d" | "1w" | "custom", customSeconds?: number): bigint {
  const now = Math.floor(Date.now() / 1000);
  const map = { "1h": 3600, "1d": 86400, "1w": 7 * 86400, custom: customSeconds ?? 0 };
  const dur = map[choice];
  return BigInt(now + dur);
}

/**
 * Side helper: convert (Buy/Sell {base}, base, quote, price, amount) into
 * the canonical (makerToken, takerToken, makerAmount, takerAmount).
 *
 * For SCENT/JPYC pair, "Sell SCENT" means maker sells SCENT for JPYC →
 * makerToken=SCENT, takerToken=JPYC, makerAmount=amount, takerAmount=amount*price.
 * "Buy SCENT" means maker offers JPYC, wants SCENT →
 * makerToken=JPYC, takerToken=SCENT, makerAmount=amount*price, takerAmount=amount.
 */
export function buildAmounts({
  side,
  base,
  quote,
  amount,
  price,
}: {
  side: "buy" | "sell";
  base: Token;
  quote: Token;
  /** Amount denominated in base, as a human-readable decimal string. */
  amount: string;
  /** Price = quote per 1 base, as a human-readable decimal string. */
  price: string;
}): {
  makerToken: Address;
  takerToken: Address;
  makerAmount: bigint;
  takerAmount: bigint;
} | null {
  const baseAddr = base.addresses[0]; // chain-agnostic check
  if (!baseAddr && !base.addresses[11155111] && !base.addresses[1]) {
    return null;
  }
  const baseAmount = safeParse(amount, base.decimals);
  const quoteAmount = safeParse(multiplyDecimal(amount, price), quote.decimals);
  if (baseAmount === null || quoteAmount === null) return null;

  if (side === "sell") {
    return {
      makerToken: chainAddr(base),
      takerToken: chainAddr(quote),
      makerAmount: baseAmount,
      takerAmount: quoteAmount,
    };
  }
  return {
    makerToken: chainAddr(quote),
    takerToken: chainAddr(base),
    makerAmount: quoteAmount,
    takerAmount: baseAmount,
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

function multiplyDecimal(a: string, b: string): string {
  // Naive decimal multiplication via parseUnits/format; OK for typical UI inputs.
  // For amounts > ~10^15 SF this loses precision; fine for an order form.
  const aN = Number(a);
  const bN = Number(b);
  if (Number.isNaN(aN) || Number.isNaN(bN)) return "0";
  return (aN * bN).toFixed(18);
}

function chainAddr(token: Token): Address {
  // Caller is expected to gate via useChainId; this picks whichever address is set.
  return (token.addresses[11155111] ?? token.addresses[1] ?? ("0x" + "0".repeat(40))) as Address;
}
