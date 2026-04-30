import type { Address } from "viem";

export type Token = {
  symbol: "SCENT" | "JPYC" | "USDT";
  name: string;
  decimals: number;
  /** Per-chain ERC-20 address. */
  addresses: Record<number, Address>;
  /** Tailwind ring colour used by the Permit2 card avatar. */
  accentClass: string;
};

/**
 * SCENT, JPYC, USDT — the three tokens supported at SCENTDEX V5 launch.
 * Mainnet and Sepolia addresses to be populated once the testnet contract
 * is deployed and the partner tokens are confirmed for the test environment.
 */
export const TOKENS: Token[] = [
  {
    symbol: "SCENT",
    name: "Scent Token",
    decimals: 18,
    addresses: {
      // 1: "0x3034Bc30AfD4EF8FDF13e3a5A3e095169239a425", // Mainnet (V1/V2 era; verify for V5)
    },
    accentClass: "bg-amber-500",
  },
  {
    symbol: "JPYC",
    name: "JPY Coin",
    decimals: 18,
    addresses: {
      // 1: "0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29",
    },
    accentClass: "bg-blue-500",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    addresses: {
      // 1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    },
    accentClass: "bg-emerald-500",
  },
];

export type Pair = {
  base: Token["symbol"];
  quote: Token["symbol"];
};

export const PAIRS: Pair[] = [
  { base: "SCENT", quote: "JPYC" },
  { base: "SCENT", quote: "USDT" },
];
