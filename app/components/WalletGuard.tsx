"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";

import { useNetworkGuard } from "@/lib/hooks/useNetworkGuard";

// wagmi v2 persists these keys in localStorage.
// Clearing them on explicit disconnect prevents the previous wallet from
// silently re-authorising when the user picks a different wallet next time.
const WAGMI_STORAGE_KEYS = ["wagmi.store", "wagmi.recentConnectorId"];

/**
 * Revoke eth_accounts permission from every injected provider available.
 * Works on MetaMask >= 11.3, Coinbase Wallet, Rabby and others.
 * WalletConnect sessions are terminated by wagmi's disconnect() automatically.
 * Errors are silently ignored — not all wallets support wallet_revokePermissions.
 */
async function revokeAllInjectedPermissions() {
  if (typeof window === "undefined") return;

  const providers: unknown[] = [];

  // EIP-6963: multiple injected providers each have their own object
  if (
    Array.isArray(
      (window as { ethereum?: { providers?: unknown[] } }).ethereum?.providers
    )
  ) {
    providers.push(
      ...(
        window as { ethereum: { providers: unknown[] } }
      ).ethereum.providers
    );
  } else if ((window as { ethereum?: unknown }).ethereum) {
    providers.push((window as { ethereum: unknown }).ethereum);
  }

  await Promise.allSettled(
    providers.map((p) =>
      (
        p as {
          request: (args: {
            method: string;
            params: unknown[];
          }) => Promise<unknown>;
        }
      ).request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      })
    )
  );
}

function clearWagmiStorage() {
  try {
    WAGMI_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  } catch {
    // localStorage can be unavailable in some privacy modes
  }
}

/**
 * Invisible component that must be rendered inside WagmiProvider.
 * Handles two cross-cutting concerns:
 *
 * 1. Network guard — auto-prompts the wallet to switch to the target chain
 *    whenever the connected chain is wrong.
 *
 * 2. Clean disconnect — when the user explicitly disconnects, revoke injected
 *    wallet permissions and clear wagmi's persisted connector from localStorage.
 *    Without this, selecting a new wallet after disconnect can silently reuse
 *    the old one (e.g. MetaMask hijacking a Coinbase Wallet session) because
 *    the browser-extension still considers itself authorised for the site.
 */
export function WalletGuard() {
  useNetworkGuard();

  const { status } = useAccount();
  const prevStatus = useRef<string>("");

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    // Only act on a transition from connected → disconnected.
    // Ignores the initial disconnected state on page load.
    if (prev === "connected" && status === "disconnected") {
      revokeAllInjectedPermissions();
      clearWagmiStorage();
    }
  }, [status]);

  return null;
}
