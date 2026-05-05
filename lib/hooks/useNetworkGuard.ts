"use client";

import { useEffect, useRef } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import { TARGET_CHAIN_ID } from "@/lib/wagmi";

/**
 * Automatically prompts the connected wallet to switch to TARGET_CHAIN_ID
 * whenever the user is on a different chain.
 *
 * - Fires once on connect, and again if the user manually switches away.
 * - If the wallet rejects the switch, RainbowKit's ConnectButton already
 *   shows a "Wrong network" badge — no extra UI needed here.
 * - Only switches if the wallet is fully connected (not reconnecting/pending).
 */
export function useNetworkGuard() {
  const { status } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

  // Track the last chainId we attempted a switch for to avoid re-firing
  // on every render while the wallet processes the request.
  const lastAttempted = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "connected") return;
    if (chainId === TARGET_CHAIN_ID) {
      lastAttempted.current = null; // reset so a future wrong-chain triggers again
      return;
    }
    if (lastAttempted.current === chainId) return; // already asked, don't spam
    lastAttempted.current = chainId;
    switchChain({ chainId: TARGET_CHAIN_ID });
  }, [status, chainId, switchChain]);
}
