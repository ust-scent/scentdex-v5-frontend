import { createPublicClient, http, type Address, type Hex } from "viem";
import { mainnet, sepolia } from "viem/chains";

import { SCENTDEX_V5_ABI } from "@/lib/abi";
import type { PriceLimits } from "@/lib/price-limits";

/**
 * Server-side chain reads for the API routes (never used from the browser).
 *
 * RPC: MAINNET_RPC_URL / SEPOLIA_RPC_URL, falling back to publicnode so a
 * missing env var degrades instead of breaking the route.
 */
export function rpcClientFor(chainId: number) {
  if (chainId === 11155111) {
    const url =
      process.env.SEPOLIA_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com";
    return createPublicClient({ chain: sepolia, transport: http(url) });
  }
  if (chainId === 1) {
    const url =
      process.env.MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com";
    return createPublicClient({ chain: mainnet, transport: http(url) });
  }
  return null;
}

// ---------- price limits (maxPriceRatio / minTakerAmount) --------------------

const LIMITS_TTL_MS = 60_000;
const limitsCache = new Map<string, { at: number; value: PriceLimits }>();

/**
 * Test-only fixture so the hermetic E2E server never needs an RPC. Ignored
 * in production builds (`next start` / Vercel run with NODE_ENV=production).
 * Shape: {"maxPriceRatio":"<uint>","minTakerAmount":"<uint>"}
 */
function fixtureLimits(): PriceLimits | null {
  if (process.env.NODE_ENV === "production") return null;
  const raw = process.env.SCENTDEX_PRICE_LIMITS_FIXTURE;
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { maxPriceRatio: string; minTakerAmount: string };
    return {
      maxPriceRatio: BigInt(j.maxPriceRatio),
      minTakerAmount: BigInt(j.minTakerAmount),
    };
  } catch {
    return null;
  }
}

/**
 * Reads the contract's live limits for an order's takerToken. Cached for
 * 60 s per (chain, dex, takerToken) — the owner changes these rarely, and
 * the contract re-checks at fill time anyway.
 *
 * Returns the last known value when the RPC fails, and `null` only when it
 * has never been read. Callers treat `null` as "could not verify" and fail
 * open: the contract still refuses the fill, so the worst case of failing
 * open is an unfillable row on the book — never a loss of funds.
 */
export async function readPriceLimits(
  chainId: number,
  dex: Address,
  takerToken: Address,
): Promise<PriceLimits | null> {
  const fixture = fixtureLimits();
  if (fixture) return fixture;

  const key = `${chainId}:${dex.toLowerCase()}:${takerToken.toLowerCase()}`;
  const cached = limitsCache.get(key);
  if (cached && Date.now() - cached.at < LIMITS_TTL_MS) return cached.value;

  const client = rpcClientFor(chainId);
  if (!client) return cached?.value ?? null;

  try {
    const [maxPriceRatio, minTakerAmount] = await Promise.all([
      client.readContract({
        address: dex,
        abi: SCENTDEX_V5_ABI,
        functionName: "maxPriceRatio",
      }),
      client.readContract({
        address: dex,
        abi: SCENTDEX_V5_ABI,
        functionName: "minTakerAmount",
        args: [takerToken],
      }),
    ]);
    const value: PriceLimits = { maxPriceRatio, minTakerAmount };
    limitsCache.set(key, { at: Date.now(), value });
    return value;
  } catch (e) {
    console.warn(
      `[price-limits] read failed chain=${chainId} dex=${dex}: ${
        e instanceof Error ? e.message.slice(0, 160) : String(e).slice(0, 160)
      }`,
    );
    return cached?.value ?? null;
  }
}

// ---------- on-chain cancel state ---------------------------------------------

/**
 * `cancelled(orderHash)` on the DEX. `null` when the RPC could not answer.
 */
export async function readOnchainCancelled(
  chainId: number,
  dex: Address,
  orderHash: Hex,
): Promise<boolean | null> {
  const client = rpcClientFor(chainId);
  if (!client) return null;
  try {
    return await client.readContract({
      address: dex,
      abi: SCENTDEX_V5_ABI,
      functionName: "cancelled",
      args: [orderHash],
    });
  } catch {
    return null;
  }
}
