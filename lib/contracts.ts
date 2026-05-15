import type { Address } from "viem";

/**
 * SCENTDEX V5 contract addresses per chain.
 *
 * Mainnet (1):       intentionally undefined until the 72h-timelock rebuild
 *                    is deployed. The 1-min-timelock prod-test build at
 *                    0x3293462B4Ef0dbC20817562d295a368556689249 exists but
 *                    we don't expose it to wallets — a 60s admin guard is
 *                    effectively no guard, and dex.scenttoken.com is
 *                    public. Re-enable here once the long-timelock contract
 *                    is verified and pair configs are seeded.
 * Sepolia (11155111): UAT environment for tester walkthroughs.
 */
export const SCENTDEX_V5_ADDRESS: Record<number, Address | undefined> = {
  1: undefined,
  11155111: "0x42349e93B90c69536Ab8a2cc5C55b3cd14872395",
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
