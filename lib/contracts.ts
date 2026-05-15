import type { Address } from "viem";

/**
 * SCENTDEX DEX contract addresses per chain.
 *
 * The variable is named `SCENTDEX_V5_ADDRESS` for historical reasons (existing
 * imports across the repo) — it now points at the V6 contract on mainnet as
 * of 2026-05-16. A repo-wide rename to a version-neutral `SCENTDEX_ADDRESS`
 * is tracked as a follow-up cleanup; functionally this table is the active
 * DEX deployment for each chain regardless of version label.
 *
 * Mainnet (1):       SCENTDEX V6 r3, ADR-0007 symmetric fee collection.
 *                    Deployed 2026-05-16 by /ust-contract-ops (tx
 *                    0x67d232cb...). Still a prod-test build with a 60s
 *                    admin timelock; owner is the .env hot wallet (controlled
 *                    testing phase). 72h timelock + Safe multisig migration
 *                    tracked in project_ust_owner_key_handoff.md.
 *                    Legacy V5 (`0x3293462B4Ef0dbC20817562d295a368556689249`)
 *                    is still alive on mainnet but no longer routed to by
 *                    this frontend.
 * Sepolia (11155111): V5 r6 UAT environment. No V6 Sepolia deploy — Alex
 *                    elected mainnet-direct cutover. Sepolia is effectively
 *                    out-of-rotation; left wired for one-off regression
 *                    checks if a tester switches networks manually.
 */
export const SCENTDEX_V5_ADDRESS: Record<number, Address | undefined> = {
  1: "0x9962584c755f943f2c29dF190dA97008db216D16",
  11155111: "0x42349e93B90c69536Ab8a2cc5C55b3cd14872395",
};

/**
 * Historical V5 mainnet address — preserved here for traceability only.
 * Not used by any active code path after the 2026-05-16 V6 cutover.
 */
export const SCENTDEX_V5_LEGACY_MAINNET_ADDRESS: Address =
  "0x3293462B4Ef0dbC20817562d295a368556689249";

/** Permit2 canonical address (same on every supported chain). */
export const PERMIT2_ADDRESS: Address =
  "0x000000000022D473030F116dDEE9F6B43aC78BA3";

/**
 * EIP-712 domain version. V5 r6 used "6"; V6 r1+ bumped to "7"
 * (ADR-0007 sym_fee_004). Sepolia is still on V5 r6 / "6" but the frontend's
 * primary path targets mainnet, so we pin to V6's "7" globally. Sepolia
 * orders signed with this domain will not verify against the V5 Sepolia
 * contract — that's acceptable because Sepolia is out-of-rotation.
 */
export const DOMAIN_VERSION = "7";

/** EIP-712 domain name. */
export const DOMAIN_NAME = "SCENTDEX";

/** Sepolia chain ID, exported for convenience. */
export const SEPOLIA_CHAIN_ID = 11155111;
export const MAINNET_CHAIN_ID = 1;
