"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type Address } from "viem";
import {
  useAccount,
  useChainId,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";

import { PERMIT2_ABI } from "@/lib/abi";
import { PERMIT2_ADDRESS, SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { TOKENS } from "@/lib/tokens";

/**
 * Detect + revoke leftover round-2 standing Permit2 → DEX allowances.
 *
 * Round-3 moved spend authorisation onto per-order PermitSingle signatures,
 * so any standing `Permit2.allowance(maker, token, dex)` from the previous
 * build is dead weight — it grants the DEX a blanket right to spend the
 * maker's wallet that the maker no longer needs to give. We surface a
 * banner on the trade page when one or more such allowances are still
 * non-zero, and let the maker collapse them to (0, 0) in one transaction
 * per token.
 *
 * The revoke action calls `Permit2.approve(token, dex, 0, 0)` per token.
 * Sequencing happens in the hook: queue, fire one, wait for receipt,
 * fire next. Each fired tx counts down `pendingRevokes` so the UI can
 * render progress.
 */

export type StandingAllowance = {
  token: Address;
  symbol: string;
  amount: bigint;
  expiration: number;
  /** Already collapsed to zero; we keep the row out of the banner. */
  zeroed: boolean;
};

export type StandingAllowancesData = {
  /** Tokens whose Permit2 → DEX allowance is still non-zero AND not expired. */
  outstanding: StandingAllowance[];
  loading: boolean;
  /** Calling this kicks off `Permit2.approve(token, dex, 0, 0)` for each row in turn. */
  revokeAll: () => void;
  /** Number of revoke txs that are still pending (in-flight or queued). */
  pendingRevokes: number;
  isRevoking: boolean;
  lastError: Error | null;
};

export function useStandingAllowances(): StandingAllowancesData {
  const { address: account, isConnected } = useAccount();
  const chainId = useChainId();
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];

  // One Permit2.allowance read per supported token, all in a single
  // multicall so we don't pay per-token RPC round-trips.
  const tokensOnChain = useMemo<
    Array<{ symbol: string; address: Address }>
  >(() => {
    const out: Array<{ symbol: string; address: Address }> = [];
    for (const tok of TOKENS) {
      const addr = tok.addresses[chainId];
      if (!addr) continue;
      out.push({ symbol: tok.symbol, address: addr });
    }
    return out;
  }, [chainId]);

  const contracts = useMemo(() => {
    if (!account || !dexAddress) return [];
    return tokensOnChain.map((t) => ({
      address: PERMIT2_ADDRESS,
      abi: PERMIT2_ABI,
      functionName: "allowance" as const,
      args: [account, t.address, dexAddress] as const,
      chainId,
    }));
  }, [tokensOnChain, account, dexAddress, chainId]);

  const reads = useReadContracts({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    contracts: contracts as any,
    query: {
      enabled: contracts.length > 0 && isConnected,
      refetchInterval: 20_000,
      refetchOnWindowFocus: true,
    },
  });

  // Wall-clock comparison for expiration. The polled `data` already drives
  // the cadence and a few seconds of clock drift can't change the outstanding
  // decision.
  const nowSec = Math.floor(Date.now() / 1000);

  const outstanding = useMemo<StandingAllowance[]>(() => {
    const data = reads.data;
    if (!data) return [];
    const out: StandingAllowance[] = [];
    for (let i = 0; i < tokensOnChain.length; i++) {
      const r = data[i];
      if (!r || r.status !== "success") continue;
      const tuple = r.result as readonly [bigint, number, number];
      const amount = BigInt(tuple[0]);
      const expiration = Number(tuple[1]);
      if (amount === 0n) continue;
      if (expiration <= nowSec) continue; // already expired, no risk
      out.push({
        token: tokensOnChain[i].address,
        symbol: tokensOnChain[i].symbol,
        amount,
        expiration,
        zeroed: false,
      });
    }
    return out;
  }, [reads.data, tokensOnChain, nowSec]);

  // ------ revoke queue --------------------------------------------------
  const queueRef = useRef<StandingAllowance[]>([]);
  const [pending, setPending] = useState(0);
  const [lastError, setLastError] = useState<Error | null>(null);

  const writeContract = useWriteContract();
  const receipt = useWaitForTransactionReceipt({
    hash: writeContract.data,
    query: { enabled: Boolean(writeContract.data) },
  });

  const revokeAll = () => {
    if (outstanding.length === 0) return;
    if (queueRef.current.length > 0) return; // a flow is already in flight
    queueRef.current = [...outstanding];
    setPending(queueRef.current.length);
    setLastError(null);
    fireNext();
  };

  function fireNext() {
    const next = queueRef.current.shift();
    if (!next || !dexAddress) {
      setPending(0);
      return;
    }
    writeContract.writeContract(
      {
        address: PERMIT2_ADDRESS,
        abi: PERMIT2_ABI,
        functionName: "approve",
        args: [next.token, dexAddress, 0n, 0],
      },
      {
        onError: (err) => {
          setLastError(err as Error);
          // Drop the rest of the queue on first failure — the user can
          // re-trigger after fixing whatever blocked them.
          queueRef.current = [];
          setPending(0);
        },
      },
    );
  }

  // Each receipt confirmation drains one slot from the queue and fires
  // the next pending revoke, if any. The setState + re-fire chain inside
  // the effect is the intended cascade and stops cleanly when the queue
  // is empty.
  useEffect(() => {
    if (!receipt.isSuccess) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPending((n) => Math.max(0, n - 1));
    if (queueRef.current.length > 0) {
      fireNext();
    } else {
      // Refresh the read so the banner disappears on its own.
      void reads.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receipt.isSuccess]);

  return {
    outstanding,
    loading: reads.isLoading,
    revokeAll,
    pendingRevokes: pending,
    isRevoking: writeContract.isPending || receipt.isLoading || pending > 0,
    lastError,
  };
}
