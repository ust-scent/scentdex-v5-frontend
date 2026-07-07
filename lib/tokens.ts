import type { Address } from "viem";

export type Token = {
  symbol: "SCENT" | "JPYC" | "USDT" | "SDO" | "SDT" | "WETH" | "SDT-TEST" | "WETH-TEST";
  name: string;
  decimals: number;
  /** Per-chain ERC-20 address. Mainnet = production; Sepolia = MockERC20. */
  addresses: Record<number, Address | undefined>;
  /** Tailwind class for the avatar circle in Permit2 cards / lists. */
  accentClass: string;
  /**
   * True for WETH9-style wrapped-native tokens (deposit/withdraw). Drives
   * the auto-wrap UX: PlaceOrder / FillModal insert an ETH→token deposit
   * leg when the user's balance is short.
   */
  wrapsNative?: boolean;
  /**
   * User-facing label shown in the UI INSTEAD of `symbol`. `symbol` stays the
   * internal identifier (PAIR_CONFIG keys, pairKey, feeSide matching, the
   * `/api/orders?pair=` param) and must never change. Only rendering goes
   * through `symbolLabel()`. Used to surface WETH-TEST as "WETH-TEST（ETH）"
   * so first-time users see it is the same asset as ETH. Undefined for
   * production tokens → `symbolLabel` returns `symbol` unchanged (no /trade
   * regression).
   */
  displaySymbol?: string;
};

/**
 * SCENT, JPYC, USDT — the three tokens listed at SCENTDEX V5 mainnet launch.
 * SDO stays in the array for Sepolia continuity but has no mainnet listing.
 *
 * Mainnet token addresses (chainId 1) point at production ERC-20s. Sepolia
 * addresses (chainId 11155111) point at the MockERC20 deployments built for
 * UAT with a public `mint(to, amount)` faucet.
 *
 * Decimal-pinning notes:
 *  - SCENT (mainnet 18, Sepolia mock 18)
 *  - JPYC (18 on mainnet, mock 18 on Sepolia) — mainnet address verified
 *    against the JPYC variant Alex picked for SCENTDEX V5 launch; not the
 *    public v1/v2 contracts, so don't substitute either of those if you
 *    "fix" this thinking it's a typo
 *  - USDT canonical Tether is **6 decimals**, the Sepolia mock matches at 6
 *    so the same Token entry works on both chains
 */
export const TOKENS: Token[] = [
  {
    symbol: "SCENT",
    name: "Scent Token",
    decimals: 18,
    addresses: {
      1: "0x3034Bc30AfD4EF8FDF13e3a5A3e095169239a425",
      11155111: "0x9366C55CAEb6843E1CF596EbB515e2f94A9e8043",
    },
    accentClass: "bg-amber-500",
  },
  {
    symbol: "JPYC",
    name: "JPY Coin",
    decimals: 18,
    addresses: {
      1: "0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29",
      11155111: "0x0174899c27d8315294f230aC7f72913718065CC2",
    },
    accentClass: "bg-blue-500",
  },
  {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    addresses: {
      1: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
      11155111: "0xd2fe6DD909503829E3638F68155Fed3D7a01988d",
    },
    accentClass: "bg-emerald-500",
  },
  {
    symbol: "SDO",
    name: "Scent Demo Token",
    decimals: 18,
    addresses: {
      // mainnet: not listed (Alex 2026-05-15 decision)
      1: undefined,
      11155111: "0xB402dFBb233b231076609aB766B829336492D99C",
    },
    accentClass: "bg-fuchsia-500",
  },
  // ---- SDT/WETH production tokens (mainnet, /sdt pinned route) ----------
  // Listed on mainnet V6 2026-07-05 (setToken + executeSetPair, feeSide=SDT
  // 10%). NOT in PAIRS yet — the pair is reachable only via the pinned /sdt
  // route until Alex opens the /trade tab at official release.
  {
    symbol: "SDT",
    name: "Seven DAO Token",
    decimals: 18,
    addresses: {
      1: "0x46031C24f0021efeBaC763A2E342b3ec4Ca3a7F9",
      11155111: undefined,
    },
    accentClass: "bg-sky-500",
  },
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    decimals: 18,
    addresses: {
      // Canonical WETH9. wrapsNative drives the auto-wrap UX: buyers hold
      // plain ETH; the order flow deposits the shortfall automatically.
      1: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      11155111: undefined,
    },
    accentClass: "bg-indigo-400",
    wrapsNative: true,
  },
  // ---- SDT/WETH test market (Sepolia only, /sdttest route) -------------
  // Both tokens deliberately have NO mainnet address: pairsForChain(1) can
  // never surface them, so the production pair list is untouched. Mainnet
  // listing is frozen until external audit + legal docs complete.
  {
    symbol: "SDT-TEST",
    name: "Seven DAO Token (TEST)",
    decimals: 18,
    addresses: {
      1: undefined,
      // MockSDT from the sdttest Sepolia bring-up. Env-gated like the DEX
      // address so the token simply "doesn't exist" until the deploy lands.
      11155111: process.env.NEXT_PUBLIC_SDTTEST_SDT_ADDRESS as
        | Address
        | undefined,
    },
    accentClass: "bg-sky-500",
    // Shown in the UI as the production label "SDT" (internal symbol stays
    // "SDT-TEST"). Keeps the test build's UI identical to mainnet so no
    // source edit is needed at cutover.
    displaySymbol: "SDT",
  },
  {
    symbol: "WETH-TEST",
    name: "Wrapped Ether (TEST)",
    decimals: 18,
    addresses: {
      1: undefined,
      // MockWETH from the sdttest Sepolia bring-up: WETH9-compatible
      // deposit/withdraw (auto-wrap UX unchanged) plus an open faucet mint
      // so test balances aren't capped by scarce Sepolia ETH. Env-gated
      // like the DEX + SDT addresses.
      11155111: process.env.NEXT_PUBLIC_SDTTEST_WETH_ADDRESS as
        | Address
        | undefined,
    },
    accentClass: "bg-indigo-400",
    wrapsNative: true,
    // Surfaced in the UI as the production label "WETH（ETH）" so first-time
    // users understand it is the same asset as ETH (auto-wrapped) and the
    // test build matches mainnet with no post-test source edit. Internal
    // `symbol` stays "WETH-TEST".
    displaySymbol: "WETH（ETH）",
  },
];

/**
 * User-facing label for a token symbol. Returns the token's `displaySymbol`
 * when set, otherwise the symbol itself. Render sites must call this; internal
 * logic (pair keys, feeSide, API params) keeps using the raw `symbol`.
 */
export function symbolLabel(symbol: Token["symbol"] | string): string {
  return TOKENS.find((t) => t.symbol === symbol)?.displaySymbol ?? symbol;
}

export type Pair = {
  base: Token["symbol"];
  quote: Token["symbol"];
};

/**
 * Flat canonical pair list. UI components must call `pairsForChain(chainId)`
 * before rendering — a pair whose `base` or `quote` token has no address on
 * the current chain is filtered out (e.g. SDO pairs disappear on mainnet).
 */
export const PAIRS: Pair[] = [
  // SDT/WETH — mainnet flagship listing (V6 bring-up 2026-07-05). Mainnet-only:
  // both tokens have no Sepolia address, so `pairsForChain` drops it on testnet.
  // First entry so it is the default /trade tab (see `SDT_MAINNET_PAIR` below —
  // this IS the official-release cutover: one PAIRS line, /sdt now redirects).
  { base: "SDT", quote: "WETH" },
  { base: "SCENT", quote: "JPYC" },
  { base: "SCENT", quote: "USDT" },
  { base: "SDO", quote: "USDT" },
  { base: "SDO", quote: "SCENT" },
];

/** Pairs whose every token side has an address on the given chain. */
export function pairsForChain(chainId: number): Pair[] {
  return PAIRS.filter((p) => {
    const base = TOKENS.find((t) => t.symbol === p.base);
    const quote = TOKENS.find((t) => t.symbol === p.quote);
    return (
      Boolean(base?.addresses[chainId]) && Boolean(quote?.addresses[chainId])
    );
  });
}

/**
 * Per-pair fee configuration for UI calculations.
 *
 * Source of truth at fill time is on-chain `pairConfig(a, b)` (read via
 * `usePairConfig` hook). These values are the UI placeholder shown before
 * the on-chain read returns. They MUST match what `executeSetPair` was
 * called with, otherwise the maker form previews the wrong fee.
 *
 * Both mainnet and Sepolia run SCENT pairs at the 10% maker rate
 * (1000 bps on the SCENT side). SDO pairs on Sepolia are 20% as a
 * test/UAT rate.
 */
export type PairFeeConfig = {
  /** Basis points charged on the fee side. 30 = 0.3%, 1000 = 10%. */
  feeBps: number;
  /** Which token of the pair pays the fee (Case A only). */
  feeSide: Token["symbol"];
};

export const PAIR_CONFIG: Record<number, Record<string, PairFeeConfig>> = {
  1: {
    "SCENT/JPYC": { feeBps: 1000, feeSide: "SCENT" },
    "SCENT/USDT": { feeBps: 1000, feeSide: "SCENT" },
    // Mainnet V6 bring-up 2026-07-05: announceSetPair(SDT, WETH, true, SDT,
    // 1000) — the SDT seller pays 10%, carved in WETH from their proceeds.
    "SDT/WETH": { feeBps: 1000, feeSide: "SDT" },
  },
  11155111: {
    "SCENT/JPYC": { feeBps: 1000, feeSide: "SCENT" },
    "SCENT/USDT": { feeBps: 1000, feeSide: "SCENT" },
    "SDO/USDT": { feeBps: 2000, feeSide: "SDO" },
    "SDO/SCENT": { feeBps: 2000, feeSide: "SDO" },
    // SDT listing rehearsal (ADR-0008): the SDT SELLER pays 10%, carved in
    // WETH from their proceeds. Buyers of SDT pay no fee. Must match the
    // announceSetPair(SDT, WETH, true, SDT, 1000) call in the bring-up script.
    "SDT-TEST/WETH-TEST": { feeBps: 1000, feeSide: "SDT-TEST" },
  },
};

/**
 * The pinned pair for the /sdttest route. Kept OUT of `PAIRS` on purpose —
 * the default pair list (and therefore PairTabs on /trade) must not change;
 * the test market is only reachable via its own page.
 */
export const SDTTEST_PAIR: Pair = { base: "SDT-TEST", quote: "WETH-TEST" };

/**
 * The pinned pair for the /sdt route (mainnet, real SDT + WETH9). Kept OUT
 * of `PAIRS` until official release — cutover is: add this pair to PAIRS
 * (one line, the /trade tab appears) and delete the /sdt route.
 */
export const SDT_MAINNET_PAIR: Pair = { base: "SDT", quote: "WETH" };

export function pairKey(pair: Pair): string {
  return `${pair.base}/${pair.quote}`;
}

export function feeConfig(pair: Pair, chainId: number): PairFeeConfig {
  const key = pairKey(pair);
  // Exact (chain, pair) hit — the normal path.
  const onChain = PAIR_CONFIG[chainId]?.[key];
  if (onChain) return onChain;
  // Fall back to the same pair on ANY configured chain before the 30bps
  // default. This keeps the fee preview correct for a pair that is only
  // configured on one chain (e.g. the Sepolia-only SDT-TEST/WETH-TEST test
  // market) even when useChainId() reports the wagmi default chain because
  // no wallet is connected yet. Production pairs are configured identically
  // across chains, so this never changes their displayed fee.
  for (const chainCfg of Object.values(PAIR_CONFIG)) {
    if (chainCfg[key]) return chainCfg[key];
  }
  return { feeBps: 30, feeSide: pair.base };
}
