import type { Address } from "viem";

/**
 * SCENTDEX V5 contract addresses per chain.
 *
 * Mainnet (1):       TBD — pending external audit + deployment
 * Sepolia (11155111): TBD — populate after running scripts/deploy-sepolia.ts
 *                     in the scentdex-v5 repo (sepolia-deploy branch)
 */
export const SCENTDEX_V5_ADDRESS: Record<number, Address | undefined> = {
  1: undefined,
  11155111: "0x15c3c5b6e1d4ce4606606966B358E2fe3b2e2d7a",
};

/** Permit2 canonical address (same on every supported chain). */
export const PERMIT2_ADDRESS: Address =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/** EIP-712 domain version pinned by V5 r3+ (see V5_specification_r6.md §9). */
export const DOMAIN_VERSION = "6";

/** EIP-712 domain name. */
export const DOMAIN_NAME = "SCENTDEX";

/** Sepolia chain ID, exported for convenience. */
export const SEPOLIA_CHAIN_ID = 11155111;
export const MAINNET_CHAIN_ID = 1;
