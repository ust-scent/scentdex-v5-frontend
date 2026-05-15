import { getDefaultConfig } from "@rainbow-me/rainbowkit";
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
  // Mainnet only in production. Sepolia is added back when
  // NEXT_PUBLIC_ENABLE_SEPOLIA=1 (local dev / regression).
  chains: (ENABLE_SEPOLIA ? [mainnet, sepolia] : [mainnet]) as readonly [
    Chain,
    ...Chain[],
  ],
  transports: {
    [mainnet.id]: fallback([
      ...(ALCHEMY_MAINNET ? [http(ALCHEMY_MAINNET)] : []),
      http("https://1.rpc.thirdweb.com"),
      http("https://eth.llamarpc.com"),
      http("https://cloudflare-eth.com"),
      http("https://ethereum-rpc.publicnode.com"),
    ]),
    // Sepolia transport stays defined even when the chain isn't in the
    // RainbowKit picker — useful for any local code path that explicitly
    // targets chainId 11155111.
    [sepolia.id]: fallback([
      ...(ALCHEMY_SEPOLIA ? [http(ALCHEMY_SEPOLIA)] : []),
      http("https://11155111.rpc.thirdweb.com"),
      http("https://ethereum-sepolia-rpc.publicnode.com"),
      http("https://rpc.sepolia.org"),
    ]),
  },
  ssr: true,
});
