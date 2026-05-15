import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, sepolia } from "wagmi/chains";

/**
 * Wagmi config for SCENTDEX V5.
 * - Mainnet: production
 * - Sepolia: testnet burn-in phase
 *
 * WalletConnect projectId is taken from env. Get one for free at
 * https://cloud.walletconnect.com/. Without it, WalletConnect-based
 * wallets are degraded but Injected (MetaMask / Rabby / Coinbase) still work.
 *
 * TARGET_CHAIN_ID controls which chain the app forces users onto.
 * Switch to mainnet.id (1) for production.
 */
export const TARGET_CHAIN_ID: number =
  Number(process.env.NEXT_PUBLIC_CHAIN_ID) || mainnet.id;

export const wagmiConfig = getDefaultConfig({
  appName: "SCENTDEX",
  appDescription: "Peer-to-peer limit-order DEX for Scent Token",
  appUrl: "https://dex.scenttoken.com",
  appIcon: "https://dex.scenttoken.com/logo.png",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "scentdex-dev",
  // Mainnet first so RainbowKit offers it as the default after the
  // 2026-05-15 mainnet contract deploy. Sepolia stays in the list for the
  // existing UAT workflow.
  chains: [mainnet, sepolia],
  ssr: true,
});
