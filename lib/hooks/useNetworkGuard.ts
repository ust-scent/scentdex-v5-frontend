"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: string,
    handler: (...args: unknown[]) => void,
  ) => void;
};

function injectedProvider(): Eip1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
}

/**
 * The wallet's TRUE chain id, read straight from the injected EIP-1193
 * provider (`eth_chainId`) and kept live via the `chainChanged` event.
 *
 * Why not wagmi's `useChainId()` / `useAccount().chainId`: with production
 * pinned to a single configured chain (mainnet), both are normalised to a
 * configured chain and report "1" even when MetaMask is really on Polygon.
 * That defeated the wrong-network guard — orders could be signed from the
 * wrong network (tester E-04). The provider read is ground truth and cannot
 * be clamped. SCENTDEX is MetaMask-only, so `window.ethereum` is the wallet.
 *
 * Returns undefined until the first read resolves (or when no injected
 * provider exists) — callers must treat undefined as "unknown", not "ok".
 */
export function useWalletChainId(): number | undefined {
  const { status } = useAccount();
  const [walletChainId, setWalletChainId] = useState<number | undefined>();

  useEffect(() => {
    if (status !== "connected") {
      setWalletChainId(undefined);
      return;
    }
    const eth = injectedProvider();
    if (!eth?.request) return;

    let active = true;
    const apply = (hex: unknown) => {
      if (active && typeof hex === "string") {
        const n = parseInt(hex, 16);
        if (Number.isFinite(n)) setWalletChainId(n);
      }
    };
    void eth.request({ method: "eth_chainId" }).then(apply).catch(() => {});

    const onChainChanged = (...args: unknown[]) => apply(args[0]);
    eth.on?.("chainChanged", onChainChanged);
    return () => {
      active = false;
      eth.removeListener?.("chainChanged", onChainChanged);
    };
  }, [status]);

  return walletChainId;
}

/**
 * True when a wallet is connected but on a chain the current route does not
 * support — keyed off the provider's real chain (see useWalletChainId).
 */
export function useIsWrongNetwork(): boolean {
  const { status } = useAccount();
  const walletChainId = useWalletChainId();
  const pathname = usePathname();
  if (status !== "connected" || walletChainId === undefined) return false;
  return walletChainId !== routeTargetChain(pathname);
}

/**
 * Read the wallet's current chain id on demand (not reactive). Use this as a
 * hard gate right before requesting a signature, so a stale render can never
 * let an order be signed on the wrong network even if the reactive hook lags.
 * Returns undefined if it can't be determined.
 */
export async function readWalletChainId(): Promise<number | undefined> {
  const eth = injectedProvider();
  if (!eth?.request) return undefined;
  try {
    const hex = await eth.request({ method: "eth_chainId" });
    if (typeof hex === "string") {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) ? n : undefined;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function targetChainForPath(pathname: string | null): number {
  return routeTargetChain(pathname);
}

/**
 * Automatically prompts the connected wallet to switch to the route's
 * target chain whenever the user is on a different chain.
 *
 * - Fires once on connect, and again if the user manually switches away.
 * - If the wallet rejects the switch, RainbowKit's ConnectButton already
 *   shows a "Wrong network" badge — no extra UI needed here.
 * - Only switches if the wallet is fully connected (not reconnecting/pending).
 */
export function useNetworkGuard() {
  // Real wallet chain (see useWalletChainId). wagmi's chainId is clamped to a
  // configured chain and would report the target even when the wallet is on
  // an unconfigured chain (Polygon/BSC/…), defeating the guard.
  const { status } = useAccount();
  const chainId = useWalletChainId();
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
