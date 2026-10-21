/**
 * Block-explorer URL builder.
 *
 * Resolves the explorer from viem's own chain definitions rather than a
 * hand-written host table, so mainnet → etherscan.io and Sepolia →
 * sepolia.etherscan.io come straight from the chain object and can't drift.
 *
 * Deliberately independent of `lib/wagmi.ts`'s `chains` array: that list is
 * env-gated (Sepolia only when NEXT_PUBLIC_ENABLE_SEPOLIA is set) and governs
 * which networks a WALLET may connect to. A tx link is just a read-only
 * pointer at a public explorer — it should resolve for any chain we ever
 * recorded a fill on, regardless of whether the connect modal offers it.
 *
 * Returns `undefined` for an unknown chain or a malformed hash. Callers must
 * render plain text (not a dead anchor) in that case.
 */

import { mainnet, sepolia, type Chain } from "wagmi/chains";

const CHAINS: Chain[] = [mainnet, sepolia];

/** 0x + 64 hex chars. Guards against half-written / placeholder hashes. */
const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;

function explorerBase(chainId: number): string | undefined {
  const url = CHAINS.find((c) => c.id === chainId)?.blockExplorers?.default.url;
  // Trailing slashes vary between chain defs; normalise so callers can
  // concatenate a path without doubling up.
  return url ? url.replace(/\/+$/, "") : undefined;
}

/** Explorer page for a transaction, or undefined if it can't be resolved. */
export function explorerTxUrl(
  chainId: number,
  txHash: string | undefined | null,
): string | undefined {
  if (!txHash || !TX_HASH_RE.test(txHash)) return undefined;
  const base = explorerBase(chainId);
  return base ? `${base}/tx/${txHash}` : undefined;
}

/** Human-readable explorer name ("Etherscan"), for aria-labels and titles. */
export function explorerName(chainId: number): string | undefined {
  return CHAINS.find((c) => c.id === chainId)?.blockExplorers?.default.name;
}
