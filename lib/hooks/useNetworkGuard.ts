"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

import { SEPOLIA_CHAIN_ID } from "@/lib/contracts";
import { TARGET_CHAIN_ID } from "@/lib/wagmi";

/**
 * Automatically prompts the connected wallet to switch to the route's
 * target chain whenever the user is on a different chain.
 *
 * Target resolution:
 *   - /sdttest…  → Sepolia (the SDT/WETH listing rehearsal market lives
 *     there and nowhere else). Without this carve-out the global guard
 *     would fight the test page by bouncing the wallet straight back to
 *     mainnet.
 *   - everywhere else → TARGET_CHAIN_ID (mainnet in production).
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
  const pathname = usePathname();

  const target = pathname?.startsWith("/sdttest")
    ? SEPOLIA_CHAIN_ID
    : TARGET_CHAIN_ID;

  // Track the last chainId we attempted a switch for to avoid re-firing
  // on every render while the wallet processes the request.
  const lastAttempted = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "connected") return;
    if (chainId === target) {
      lastAttempted.current = null; // reset so a future wrong-chain triggers again
      return;
    }
    if (lastAttempted.current === chainId) return; // already asked, don't spam
    lastAttempted.current = chainId;
    switchChain({ chainId: target });
  }, [status, chainId, switchChain, target]);
}
