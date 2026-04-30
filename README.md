# SCENTDEX V5 — Public DEX UI

Frontend for [dex.scenttoken.com](https://dex.scenttoken.com/), the peer-to-peer limit-order exchange for Scent Token.

Operated by **Universal Scent Technology** (Singapore).

## Tech stack

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **TypeScript 5**
- **Tailwind CSS 4** (CSS-first theme via `@theme`)
- **wagmi 2** + **viem 2** (EVM client)
- **RainbowKit 2** (wallet connection UI)
- **@tanstack/react-query 5** (state for on-chain reads)

## Local development

```bash
cp .env.example .env.local        # add your WalletConnect projectId
npm install
npm run dev                        # http://localhost:3000
```

A WalletConnect projectId is optional in development — without one, injected wallets (MetaMask, Rabby, Coinbase) still work; WalletConnect-based wallets are degraded.

## Project layout

```
app/
├── components/
│   ├── BottomTabs.tsx     My Orders / History / Permit2 — bottom panel
│   ├── Header.tsx         Logo + nav + wallet connect (RainbowKit)
│   ├── OrderBook.tsx      Aggregated bids/asks with depth bars
│   ├── PairTabs.tsx       SCENT/JPYC, SCENT/USDT switcher
│   ├── PlaceOrder.tsx     Buy/Sell + price/amount/expiry + Sign Order
│   ├── RecentTrades.tsx   Live trade ticker
│   └── StatsBar.tsx       Price + 24h volume/high/low + maker fee
├── globals.css            Tailwind v4 theme (dark + buy/sell/accent colours)
├── layout.tsx             Providers wrapper, fonts, metadata
├── page.tsx               Trade page (default)
└── providers.tsx          Wagmi + QueryClient + RainbowKit

lib/
├── contracts.ts           SCENTDEX V5 contract addresses (per chain)
├── tokens.ts              SCENT / JPYC / USDT definitions, pair list
└── wagmi.ts               Wagmi config (Mainnet + Sepolia)
```

## Implementation phase

This repo is in **Phase 1-2 (scaffolding + structural placeholder)**. Components render with **dummy data** so the layout and design system are reviewable end-to-end.

| Phase | Scope | Status |
|---|---|---|
| 1 | Next.js scaffolding, dark theme, fonts | ✅ Done |
| 2 | Wallet connection (RainbowKit), Header, Pair tabs | ✅ Done |
| 3 | Order book read from indexer + Recent Trades subscription | ⏳ Next |
| 4 | Permit2 approve flow (read allowance, approve tx) | ⏳ |
| 5 | Place Order — EIP-712 signing + phishing-detection modal | ⏳ |
| 6 | Fill order — Permit2 forward + fillOrder tx | ⏳ |
| 7 | My Orders / Cancel / Bulk cancel | ⏳ |
| 8 | Indexer backend (Vercel Postgres + cron) | ⏳ |
| 9 | Polish: error/loading/empty states, edge-case handling | ⏳ |

The functional requirements driving each phase are documented internally at `data/ust/incidents/2026-04-16_scentdex_vulnerability/specs/V5_dex_ui_functional_requirements.md`.

## Audit posture

The contract this UI talks to is at [`ust-scent/scentdex-v5`](https://github.com/ust-scent/scentdex-v5). Current revision **r6**:

- Internal red team + 4 rounds `/ultrareview` (round 4 returned 0 findings)
- 5-tools static analysis (Slither, Mythril, Aderyn, Wake, 4naly3er) all clean on r1 baseline
- External formal audit: **pending** — to be scheduled when budget allows

## Deployment

- **Host**: Vercel (Hobby plan)
- **Production URL**: `dex.scenttoken.com` (DNS at お名前.com, CNAME → Vercel)
- **Pipeline**: every push to `main` auto-deploys

## Reporting issues

Security disclosures and general inquiries: **cs@scenttoken.com**

## License

[MIT](./LICENSE)
