import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  coinbaseWallet,
  injectedWallet,
  metaMaskWallet,
  phantomWallet,
  rabbyWallet,
  rainbowWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { fallback, http } from "viem";
import { mainnet, sepolia, type Chain } from "wagmi/chains";

/**
 * Wagmi config for SCENTDEX V5.
 *
 * Production = mainnet only. Sepolia stays in the codebase for local
 * dev and UAT regression but is hidden from end users in production
 * RainbowKit chain switcher (no point offering a testnet to traders
 * holding real SCENT / JPYC / USDT).
 *
 * To re-enable Sepolia in the chain picker for local development, set
 *   NEXT_PUBLIC_ENABLE_SEPOLIA=1
 * in `.env.local` before `npm run dev`.
 *
 * WalletConnect projectId is taken from env. Get one for free at
 * https://cloud.walletconnect.com/. Without it, WalletConnect-based
 * wallets are degraded but Injected (MetaMask / Rabby / Coinbase) still work.
 *
 * TARGET_CHAIN_ID controls which chain the app forces users onto.
 */
export const TARGET_CHAIN_ID: number =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID) || mainnet.id;

const ENABLE_SEPOLIA = process.env.NEXT_PUBLIC_ENABLE_SEPOLIA === "1";

/**
 * Explicit RPC fallback chain per network. RainbowKit's default transports
 * pick a single public RPC and have no automatic failover, which left
 * `useReadContract` calls (token balance, pair config) stuck in pending
 * forever the first time the upstream provider stalled or rate-limited.
 * Listing multiple free RPCs lets viem's `fallback` transport rotate
 * through them on timeout / 5xx — the first responsive one wins, so a
 * single slow node never breaks the trade page.
 *
 * `NEXT_PUBLIC_ALCHEMY_MAINNET_URL` is preferred (Alex's project key)
 * when set, and is rotatable from the Vercel dashboard without a redeploy.
 * The public fallbacks below stay in place so the page degrades gracefully
 * if the Alchemy key is ever revoked or rate-limited.
 */
const ALCHEMY_MAINNET = process.env.NEXT_PUBLIC_ALCHEMY_MAINNET_URL;
const ALCHEMY_SEPOLIA = process.env.NEXT_PUBLIC_ALCHEMY_SEPOLIA_URL;

export const wagmiConfig = getDefaultConfig({
  appName: "SCENTDEX",
  appDescription: "Peer-to-peer limit-order DEX for Scent Token",
  appUrl: "https://dex.scenttoken.com",
  appIcon: "https://dex.scenttoken.com/logo.png",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "scentdex-dev",
  // Wallet list — MetaMask discoverability with multiple extensions installed.
  //
  // getDefaultConfig's default list carries MetaMask ONLY as the hardcoded
  // `metaMaskWallet`, whose "Installed" state is `isMetaMask(window.ethereum)`.
  // When another extension (Coinbase, Rabby, Phantom…) wins the window.ethereum
  // injection race, that check is false, so MetaMask drops out of the modal's
  // "Installed" group and its remaining entry routes to a WalletConnect QR
  // instead of the installed extension — users report "MetaMask is missing".
  //
  // Fix: keep wagmi's EIP-6963 discovery ON (see multiInjectedProviderDiscovery
  // below) so every announcing extension is listed under "Installed" regardless
  // of who owns window.ethereum, and add `injectedWallet` as a catch-all so a
  // MetaMask that owns window.ethereum but skipped its EIP-6963 announcement
  // still surfaces and connects to the extension (never the QR path).
  //
  // Phantom / Rabby: both are EIP-6963 announcers, so with the discovery above
  // they already connect when installed. Listing them explicitly adds two things
  // the discovery alone can't: a dedicated branded button that is present even
  // when the extension isn't (RainbowKit's built-in get-the-wallet flow then
  // points at phantom.app / rabby.io), and a stable entry that doesn't depend on
  // winning the window.ethereum race. Each is deduped against its discovered
  // instance by rdns (app.phantom / io.rabby), so no wallet is listed twice.
  //
  // Phantom is Solana-native but ships an EVM provider (window.phantom.ethereum),
  // so on this EVM DEX it behaves like any other injected wallet.
  wallets: [
    {
      groupName: "Recommended",
      wallets: [
        injectedWallet,
        metaMaskWallet,
        phantomWallet,
        rabbyWallet,
        coinbaseWallet,
        rainbowWallet,
        walletConnectWallet,
      ],
    },
  ],
  // EIP-6963 multi-injected provider discovery. This is wagmi's default (true),
  // set explicitly so the multi-wallet behavior above can't silently regress if
  // the upstream default ever changes.
  multiInjectedProviderDiscovery: true,
  // Mainnet only in production. Sepolia is added back when
  // NEXT_PUBLIC_ENABLE_SEPOLIA=1 (local dev / regression).
  chains: (ENABLE_SEPOLIA ? [mainnet, sepolia] : [mainnet]) as readonly [
    Chain,
    ...Chain[],
  ],
  transports: {
    // Ordering matters for eth_getLogs (the 24h fill index behind Recent
    // Trades + StatsBar). Most free public mainnet RPCs reject getLogs as an
    // "archive" request (publicnode, ankr) or 500 (cloudflare); thirdweb is
    // the one confirmed to serve it anonymously from the browser, so it goes
    // FIRST. Alchemy would be ideal but the configured key is currently dead
    // (returns non-JSON) — keeping it ahead of thirdweb left getLogs failing
    // because viem's fallback didn't cleanly rotate past it, so it's demoted
    // below the known-good endpoint. Refresh NEXT_PUBLIC_ALCHEMY_MAINNET_URL
    // and it can move back to the front.
    [mainnet.id]: fallback([
      http("https://1.rpc.thirdweb.com"),
      ...(ALCHEMY_MAINNET ? [http(ALCHEMY_MAINNET)] : []),
      http("https://eth.llamarpc.com"),
      http("https://cloudflare-eth.com"),
      http("https://ethereum-rpc.publicnode.com"),
    ]),
    // Sepolia transport stays defined even when the chain isn't in the
    // RainbowKit picker — useful for any local code path that explicitly
    // targets chainId 11155111.
    // Ordered by browser reliability. The previous first two (thirdweb,
    // rpc.sepolia.org) failed from the browser — thirdweb 403s anonymous
    // browser traffic and rpc.sepolia.org is dead (404) — which stalled
    // reads and the pre-flight simulateContract, so on-chain writes
    // (wrap/unwrap/fill) never reached the wallet. All endpoints below
    // return 200 + `access-control-allow-origin: *` for the prod Origin.
    [sepolia.id]: fallback([
      ...(ALCHEMY_SEPOLIA ? [http(ALCHEMY_SEPOLIA)] : []),
      http("https://ethereum-sepolia-rpc.publicnode.com"),
      http("https://sepolia.drpc.org"),
      http("https://1rpc.io/sepolia"),
      http("https://sepolia.gateway.tenderly.co"),
      http("https://11155111.rpc.thirdweb.com"),
    ]),
  },
  ssr: true,
});
