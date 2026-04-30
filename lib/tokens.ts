import type { Address } from "viem";

export type Token = {
  symbol: "SCENT" | "JPYC" | "USDT";
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
      11155111: undefined, // ← paste Sepolia MockERC20(SCENT) address here
    },
    accentClass: "bg-amber-500",
  },
  {
    symbol: "JPYC",
    name: "JPY Coin",
    decimals: 18,
    addresses: {
      1: undefined,
      11155111: undefined, // ← paste Sepolia MockERC20(JPYC) address here
    },
    accentClass: "bg-blue-500",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    addresses: {
      1: undefined,
      11155111: undefined, // ← paste Sepolia MockERC20(USDT) address here
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
