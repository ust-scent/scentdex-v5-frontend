import type { Address } from "viem";

export type Token = {
  symbol: "testSCENT" | "testJPYC" | "testUSDT" | "testSDO";
  name: string;
  decimals: number;
  /** Per-chain ERC-20 address. Mainnet: production; Sepolia: MockERC20 deploy. */
  addresses: Record<number, Address | undefined>;
  /** Tailwind class for the avatar circle in Permit2 cards / lists. */
  accentClass: string;
};

/**
 * testSCENT, testJPYC, testUSDT — the three tokens supported at SCENTDEX V5 launch.
 *
 * Sepolia addresses are MockERC20 deployments with public `mint(to, amount)`
 * for faucet use. Run `scripts/deploy-sepolia.ts` in the scentdex-v5 repo
 * (sepolia-deploy branch) to deploy them, then paste the addresses below.
 */
export const TOKENS: Token[] = [
  {
    symbol: "testSCENT",
    name: "Test Scent Token",
    decimals: 18,
    addresses: {
      1: undefined,
      11155111: "0x9366C55CAEb6843E1CF596EbB515e2f94A9e8043",
    },
    accentClass: "bg-amber-500",
  },
  {
    symbol: "testJPYC",
    name: "Test JPY Coin",
    decimals: 18,
    addresses: {
      1: undefined,
      11155111: "0x0174899c27d8315294f230aC7f72913718065CC2",
    },
    accentClass: "bg-blue-500",
  },
  {
    symbol: "testUSDT",
    name: "Test Tether USD",
    decimals: 6,
    addresses: {
      1: undefined,
      11155111: "0xd2fe6DD909503829E3638F68155Fed3D7a01988d",
    },
    accentClass: "bg-emerald-500",
  },
  {
    symbol: "testSDO",
    name: "Test Scent Demo Token",
    decimals: 18,
    addresses: {
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

export const PAIRS: Pair[] = [
  { base: "testSCENT", quote: "testJPYC" },
  { base: "testSCENT", quote: "testUSDT" },
  { base: "testSDO", quote: "testUSDT" },
  { base: "testSDO", quote: "testSCENT" },
];

/**
 * Per-pair fee configuration for UI calculations.
 *
 * Mirrors what the contract has set via setPair / executeSetPair.
 * Phase 3.4 will fetch this directly from the contract via pairConfig(a,b);
 * until then we mirror the deploy script values here.
 */
export type PairFeeConfig = {
  /** Basis points charged on the fee side. 1000 = 10%, 2000 = 20%. */
  feeBps: number;
  /** Which token of the pair pays the fee (Case A only). */
  feeSide: Token["symbol"];
};

export const PAIR_CONFIG: Record<string, PairFeeConfig> = {
  "testSCENT/testJPYC": { feeBps: 1000, feeSide: "testSCENT" },
  "testSCENT/testUSDT": { feeBps: 1000, feeSide: "testSCENT" },
  "testSDO/testUSDT": { feeBps: 2000, feeSide: "testSDO" },
  "testSDO/testSCENT": { feeBps: 2000, feeSide: "testSDO" },
};

export function pairKey(pair: Pair): string {
  return `${pair.base}/${pair.quote}`;
}

export function feeConfig(pair: Pair): PairFeeConfig {
  return PAIR_CONFIG[pairKey(pair)] ?? { feeBps: 1000, feeSide: pair.base };
}
