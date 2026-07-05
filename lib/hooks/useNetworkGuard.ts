"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useAccount, useSwitchChain } from "wagmi";

import { SEPOLIA_CHAIN_ID } from "@/lib/contracts";
import { TARGET_CHAIN_ID } from "@/lib/wagmi";

/**
 * The chain this route requires. /sdttest is Sepolia-only (local dev);
 * every other route wants TARGET_CHAIN_ID (mainnet in production).
 */
function routeTargetChain(pathname: string | null): number {
  return pathname?.startsWith("/sdttest") ? SEPOLIA_CHAIN_ID : TARGET_CHAIN_ID;
}

/**
 * True when a wallet is connected but on a chain the current route does not
 * support.
 *
 * IMPORTANT: reads `useAccount().chainId` — the wallet's ACTUAL connected
 * chain — NOT `useChainId()`. With production pinned to a single configured
 * chain (mainnet), `useChainId()` is clamped to that chain and reports "1"
 * even when the wallet is really on Polygon/BSC/etc., which let a taker
 * place/fill orders from the wrong network with no warning (tester E-04).
 * `useAccount().chainId` reflects the connector's real chain.
 */
export function useIsWrongNetwork(): boolean {
  const { status, chainId: walletChainId } = useAccount();
  const pathname = usePathname();
  if (status !== "connected" || walletChainId === undefined) return false;
  return walletChainId !== routeTargetChain(pathname);
}

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
  // Wallet's REAL chain (see useIsWrongNetwork). useChainId() is clamped to a
  // configured chain and would report the target even when the wallet is on
  // an unconfigured chain, defeating the guard.
  const { status, chainId } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const pathname = usePathname();

  const target = routeTargetChain(pathname);

  // Track the last chainId we attempted a switch for to avoid re-firing
  // on every render while the wallet processes the request.
  const lastAttempted = useRef<number | null>(null);

  useEffect(() => {
    if (status !== "connected" || chainId === undefined) return;
    // While a switch is in flight, do NOTHING. wagmi optimistically flips
    // chainId to the target mid-switch; without this guard that transient
    // both (a) reset lastAttempted below and (b) — if the wallet then
    // rejects and chainId reverts — re-fired the switch, producing a ~7Hz
    // switchChain loop that flickered the whole trade UI on a wrong-network
    // wallet. Serialising on isPending breaks that loop: after the switch
    // settles we re-evaluate exactly once.
    if (isPending) return;
    if (chainId === target) {
      lastAttempted.current = null; // reset so a future wrong-chain triggers again
      return;
    }
    if (lastAttempted.current === chainId) return; // already asked (or rejected), don't spam
    lastAttempted.current = chainId;
    switchChain({ chainId: target });
  }, [status, chainId, switchChain, target, isPending]);
}
