# Production dependency remediation — 2026-10-16

Norton blocks `https://dex.scenttoken.com/trade` according to the user-provided screenshot. Dependency findings do **not** establish the cause of that rating, demonstrate compromise, or establish that Norton will unblock the domain after deployment. Norton review is handled separately.

## Changes

- Next.js and its ESLint config: 16.2.4 → 16.4.1. Official patch guidance: https://nextjs.org/blog/nextjs-security-update-october-14-2026 . This addresses the framework and bundled sharp/upstream security fixes.
- Refresh dependencies within existing declared semver ranges; wagmi remains 2.19.5 and React/React DOM remain 19.2.4. No wallet major migration or application/contract/DB change.
- Override only ws v8 to ^8.21.0, patching pinned nested viem WebSocket dependencies while keeping WalletConnect ws v7 on its compatible 7.5.13 release.
- Keep Coinbase CDP SDK on 1.49.2 and override its Axios to ^1.20.0. Latest CDP 1.58.0 introduced optional x402 peer imports that broke this frontend build; the bounded pin avoids introducing an unrelated payment integration. Revisit the pin when upstream optional-import behavior is fixed.
- CI blocks production high/critical findings via `npm audit --omit=dev --audit-level=high`; full dev audit stays report-only.
- Next dev updates its generated AGENTS.md block automatically.

## Audit scope and remaining risk

At implementation time `npm audit --omit=dev --json` reports **22 moderate, 0 high, 0 critical**, down from **25 moderate, 10 high, 1 critical** (36 total). Checked report: `2026-10-16-production-audit.json` beside this document. Counts describe dependency advisories, not demonstrated application exploits; registry advisories can change.

The remaining production advisory roots are `uuid <11.1.1` (buffer bounds in UUID v3/v5/v6) and `decode-uri-component <=0.4.2` (malformed decoding DoS), propagated through legacy MetaMask, Gemini and WalletConnect/Reown dependencies. Upstream audit proposes wagmi 3 / connector upgrades. Those require a separate wallet compatibility migration and were deliberately not forced into this patch. Real wallet connection/signature paths remain to be checked before release; hermetic tests do not cover extension/mobile-wallet integrations.

Full audit includes **5 high** findings through the development-only eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces chain (deeply nested glob pattern DoS). No build tooling major upgrade or blind transitive major override was applied. Existing React peer warnings from valtio/use-sync-external-store also remain.

This patch has not been pushed or deployed. Release requires UST deploy review and wallet smoke verification. No production DB or on-chain transaction is needed.

## Validation

Using Node 20.20.2 / npm 10.8.2 (matching `.nvmrc` major):

- `npm ci --no-audit --no-fund`: PASS; 927 packages installed. Regenerated lock with npm10 after npm11 produced missing zod entries.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS. Existing middleware-to-proxy deprecation remains.
- `npm run test:e2e`: **14/14 PASS** (21.5 seconds). Hermetic localhost, empty DB URLs, browser external network blocked.
- `npm audit --omit=dev --audit-level=high`: PASS.
- `git diff --check`: PASS.

Real wallet extension/mobile-wallet connection, funded signing/transactions, hosted CI and production deployment are not exercised by these checks.
