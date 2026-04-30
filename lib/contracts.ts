import type { Address } from "viem";

/**
 * SCENTDEX V5 contract addresses per chain.
 *
 * Mainnet: TBD — pending deployment after testnet burn-in completes.
 * Sepolia: TBD — pending Sepolia deployment.
 *
 * Once deployed, populate these and the UI will pick the right
 * address based on the connected chain via `useChainId`.
 */
export const SCENTDEX_V5_ADDRESS: Record<number, Address> = {
  // 1: "0x...",      // Mainnet
  // 11155111: "0x...", // Sepolia
};

/** Permit2 canonical address (same on every supported chain). */
export const PERMIT2_ADDRESS: Address = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/** EIP-712 domain version pinned by V5 r3+ (see V5_specification_r6.md §9). */
export const DOMAIN_VERSION = "6";

/** EIP-712 domain name. */
export const DOMAIN_NAME = "SCENTDEX";
