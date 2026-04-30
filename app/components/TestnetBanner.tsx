"use client";

import { useAccount, useChainId } from "wagmi";

const SEPOLIA_CHAIN_ID = 11155111;
const MAINNET_CHAIN_ID = 1;

/**
 * Sticky orange banner above the header.
 *
 * Always visible during the testnet preview phase. When mainnet ships and
 * external audit completes, we can flip the `TESTNET_PREVIEW` flag to
 * suppress this banner for users explicitly on mainnet.
 *
 * The body text adapts to the user's current wallet state:
 *   - Disconnected → "connect + switch to Sepolia"
 *   - Connected, Sepolia → "you're on testnet, here's the faucet"
 *   - Connected, Mainnet → "mainnet is read-only, switch to Sepolia"
 *   - Connected, other chain → generic "switch to Sepolia"
 */
const TESTNET_PREVIEW = true;

export function TestnetBanner() {
  const { isConnected } = useAccount();
  const chainId = useChainId();

  if (!TESTNET_PREVIEW && isConnected && chainId === MAINNET_CHAIN_ID) {
    return null;
  }

  const onSepolia = isConnected && chainId === SEPOLIA_CHAIN_ID;
  const onMainnet = isConnected && chainId === MAINNET_CHAIN_ID;

  return (
    <div
      role="status"
      className="bg-accent-soft border-b border-accent/40 text-fg-dim"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-2 text-[12px] sm:text-[13px] flex items-start sm:items-center gap-3 flex-wrap">
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-accent text-bg font-mono font-medium tracking-wider text-[10px] uppercase shrink-0">
          ● Testnet Preview
        </span>
        <span className="leading-snug">
          {onSepolia ? (
            <>
              You're on <strong className="text-fg">Sepolia</strong>. Tokens
              have <strong className="text-fg">no real value</strong>. Use the
              Permit2 tab's faucet to mint test SCENT / JPYC / USDT.
            </>
          ) : onMainnet ? (
            <>
              SCENTDEX is in <strong className="text-fg">testnet preview</strong>.
              You're connected to <strong className="text-fg">mainnet</strong>;
              please switch to <strong className="text-fg">Sepolia</strong> to
              test. Mainnet trading enables after external audit.
            </>
          ) : isConnected ? (
            <>
              Unsupported network. Switch to{" "}
              <strong className="text-fg">Sepolia</strong> to test, or stay on
              mainnet to wait for the audited launch.
            </>
          ) : (
            <>
              SCENTDEX is in <strong className="text-fg">testnet preview</strong>.
              Connect a wallet and switch to{" "}
              <strong className="text-fg">Sepolia</strong> to start testing.
              Mainnet launches after external audit.
            </>
          )}
        </span>
      </div>
    </div>
  );
}
