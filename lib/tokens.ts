import type { Address } from "viem";

export type Token = {
  symbol: "SCENT" | "JPYC" | "USDT" | "SDO";
  name: string;
  decimals: number;
  /** Per-chain ERC-20 address. Mainnet: production; Sepolia: MockERC20 deploy. */
  addresses: Record<number, Address | undefined>;
  /** Tailwind class for the avatar circle in Permit2 cards / lists. */
  accentClass: string;
};

/**
 * SCENT, JPYC, USDT — the three tokens supported at SCENTDEX V5 launch.
 *
 * Sepolia addresses are MockERC20 deployments with public `mint(to, amount)`
 * for faucet use. Run `scripts/deploy-sepolia.ts` in the scentdex-v5 repo
 * (sepolia-deploy branch) to deploy them, then paste the addresses below.
 */
export const TOKENS: Token[] = [
  {
    symbol: "SCENT",
    name: "Scent Token",
    decimals: 18,
    addresses: {
      1: undefined,
      11155111: "0xE1D85C9b49e55b03734d5D82c8E8a56ed657b965",
    },
    accentClass: "bg-amber-500",
  },
  {
    symbol: "JPYC",
    name: "JPY Coin",
    decimals: 18,
    addresses: {
      1: undefined,
      11155111: "0x23823D31CBF92D9d360cf553F9E20E97b7846E33",
    },
    accentClass: "bg-blue-500",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    addresses: {
      1: undefined,
      11155111: "0xaD9D818043B1bc946A088793B2c8e3694847cF7d",
    },
    accentClass: "bg-emerald-500",
  },
  {
    symbol: "SDO",
    name: "Scent Demo Token",
    decimals: 18,
    addresses: {
      1: undefined,
      11155111: "0x0E9b767f23d7dD1b318027d3413C9b032ffe0761",
    },
    accentClass: "bg-fuchsia-500",
  },
];

export type Pair = {
  base: Token["symbol"];
  quote: Token["symbol"];
};

export const PAIRS: Pair[] = [
  { base: "SCENT", quote: "JPYC" },
  { base: "SCENT", quote: "USDT" },
  { base: "SDO", quote: "USDT" },
  { base: "SDO", quote: "SCENT" },
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
  "SCENT/JPYC": { feeBps: 1000, feeSide: "SCENT" },
  "SCENT/USDT": { feeBps: 1000, feeSide: "SCENT" },
  "SDO/USDT": { feeBps: 2000, feeSide: "SDO" },
  "SDO/SCENT": { feeBps: 2000, feeSide: "SDO" },
};

export function pairKey(pair: Pair): string {
  return `${pair.base}/${pair.quote}`;
}

export function feeConfig(pair: Pair): PairFeeConfig {
  return PAIR_CONFIG[pairKey(pair)] ?? { feeBps: 1000, feeSide: pair.base };
}
