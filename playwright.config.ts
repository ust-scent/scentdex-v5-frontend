import { defineConfig } from "@playwright/test";

/**
 * Hermetic E2E suite for the ScentDEX frontend.
 *
 * Isolation guarantees (do not weaken these):
 *  - DATABASE_URL / POSTGRES_URL are forced empty → lib/orders-store falls
 *    back to the per-process in-memory book. Tests NEVER touch the
 *    production Neon database.
 *  - Every test context blocks all non-localhost network (see
 *    tests/e2e/support/hermetic.ts) → no real RPC, no WalletConnect, no
 *    external calls. Chain-dependent UI (previewFee, fillability) degrades
 *    exactly the way it does on a dead RPC, which the app must survive
 *    anyway.
 *  - Orders are signed with throwaway test keys (tests/e2e/support/
 *    orders.ts) — real EIP-712 signatures, zero real funds.
 *
 * The webServer runs `next dev` on a dedicated port so a developer's own
 * dev server (3000/3003) is never reused with unknown env.
 */
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false, // specs share the in-memory order book by design
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    // MUST be localhost (not 127.0.0.1): Next 16 dev treats 127.0.0.1 as a
    // cross-origin access to its dev resources and blocks chunk loading,
    // which kills hydration and leaves a dead SSR shell.
    baseURL: "http://localhost:3010",
    locale: "ja-JP", // assertions target the JA copy (Alex-first UI)
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next dev -p 3010",
    url: "http://localhost:3010",
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL: "",
      POSTGRES_URL: "",
      NEXT_PUBLIC_ENABLE_SEPOLIA: "1",
      NEXT_PUBLIC_SDTTEST_DEX_ADDRESS:
        "0x5c70fFc6A08A418F10fbb0E7935eA5DbbF58aBC9",
      NEXT_PUBLIC_SDTTEST_SDT_ADDRESS:
        "0x3293462B4Ef0dbC20817562d295a368556689249",
      NEXT_PUBLIC_SDTTEST_WETH_ADDRESS:
        "0x1074D6FFb18130D7F3CC1E6471240FFc24abD047",
    },
  },
});
