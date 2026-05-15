import type { Address } from "viem";

export type Token = {
  symbol: "SCENT" | "JPYC" | "USDT" | "SDO";
  name: string;
  decimals: number;
  /** Per-chain ERC-20 address. Mainnet = production; Sepolia = MockERC20. */
  addresses: Record<number, Address | undefined>;
  /** Tailwind class for the avatar circle in Permit2 cards / lists. */
  accentClass: string;
};

/**
 * SCENT, JPYC, USDT — the three tokens listed at SCENTDEX V5 mainnet launch.
 * SDO stays in the array for Sepolia continuity but has no mainnet listing.
 *
 * Mainnet token addresses (chainId 1) point at production ERC-20s. Sepolia
 * addresses (chainId 11155111) point at the MockERC20 deployments built for
 * UAT with a public `mint(to, amount)` faucet.
 *
 * Decimal-pinning notes:
 *  - SCENT (mainnet 18, Sepolia mock 18)
 *  - JPYC v2 (18 on mainnet, mock 18 on Sepolia)
 *  - USDT canonical Tether is **6 decimals**, the Sepolia mock matches at 6
 *    so the same Token entry works on both chains
 */
export const TOKENS: Token[] = [
  {
    symbol: "SCENT",
    name: "Scent Token",
    decimals: 18,
    addresses: {
      1: "0x3034Bc30AfD4EF8FDF13e3a5A3e095169239a425",
      11155111: "0x9366C55CAEb6843E1CF596EbB515e2f94A9e8043",
    },
    accentClass: "bg-amber-500",
  },
  {
    symbol: "JPYC",
    name: "JPY Coin",
    decimals: 18,
    addresses: {
      1: "0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29",
      11155111: "0x0174899c27d8315294f230aC7f72913718065CC2",
    },
    accentClass: "bg-blue-500",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    addresses: {
      1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      11155111: "0xd2fe6DD909503829E3638F68155Fed3D7a01988d",
    },
    accentClass: "bg-emerald-500",
  },
  {
    symbol: "SDO",
    name: "Scent Demo Token",
    decimals: 18,
    addresses: {
      // mainnet: not listed (Alex 2026-05-15 decision)
      1: undefined,
      11155111: "0xB402dFBb233b231076609aB766B829336492D99C",
    },
    accentClass: "bg-fuchsia-500",
  },
];

export type Pair = {
  base: Token["symbol"];
  quote: Token["symbol"];
};

/**
 * Flat canonical pair list. UI components must call `pairsForChain(chainId)`
 * before rendering — a pair whose `base` or `quote` token has no address on
 * the current chain is filtered out (e.g. SDO pairs disappear on mainnet).
 */
export const PAIRS: Pair[] = [
  { base: "SCENT", quote: "JPYC" },
  { base: "SCENT", quote: "USDT" },
  { base: "SDO", quote: "USDT" },
  { base: "SDO", quote: "SCENT" },
];

/** Pairs whose every token side has an address on the given chain. */
export function pairsForChain(chainId: number): Pair[] {
  return PAIRS.filter((p) => {
    const base = TOKENS.find((t) => t.symbol === p.base);
    const quote = TOKENS.find((t) => t.symbol === p.quote);
    return (
      Boolean(base?.addresses[chainId]) && Boolean(quote?.addresses[chainId])
    );
  });
}

/**
 * Per-pair fee configuration for UI calculations.
 *
 * Source of truth at fill time is on-chain `pairConfig(a, b)` (read via
 * `usePairConfig` hook). These values are the UI placeholder shown before
 * the on-chain read returns. They MUST match what `executeSetPair` was
 * called with, otherwise the maker form previews the wrong fee.
 *
 * Note the spread: Sepolia keeps the 10% / 20% test rates that the mock
 * deploy script applied; mainnet runs at the 0.3% launch rate.
 */
export type PairFeeConfig = {
  /** Basis points charged on the fee side. 30 = 0.3%, 1000 = 10%. */
  feeBps: number;
  /** Which token of the pair pays the fee (Case A only). */
  feeSide: Token["symbol"];
};

export const PAIR_CONFIG: Record<number, Record<string, PairFeeConfig>> = {
  1: {
    "SCENT/JPYC": { feeBps: 30, feeSide: "SCENT" },
    "SCENT/USDT": { feeBps: 30, feeSide: "SCENT" },
  },
  11155111: {
    "SCENT/JPYC": { feeBps: 1000, feeSide: "SCENT" },
    "SCENT/USDT": { feeBps: 1000, feeSide: "SCENT" },
    "SDO/USDT": { feeBps: 2000, feeSide: "SDO" },
    "SDO/SCENT": { feeBps: 2000, feeSide: "SDO" },
  },
};

export function pairKey(pair: Pair): string {
  return `${pair.base}/${pair.quote}`;
}

export function feeConfig(pair: Pair, chainId: number): PairFeeConfig {
  return (
    PAIR_CONFIG[chainId]?.[pairKey(pair)] ?? {
      feeBps: 30,
      feeSide: pair.base,
    }
  );
}
