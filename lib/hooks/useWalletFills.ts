"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  formatUnits,
  type Address,
  type Hash,
  type PublicClient,
} from "viem";
import { useAccount, useBlockNumber, useChainId, usePublicClient } from "wagmi";

import { SCENTDEX_V5_ABI } from "@/lib/abi";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { TOKENS } from "@/lib/tokens";

/**
 * Wallet-scoped fill history.
 *
 * Pulls every OrderFilled event the V5 contract has emitted in the last
 * ~24h, then narrows to fills where the connected wallet was either the
 * maker or the taker. Used to populate the Trade History tab so a maker
 * can confirm their order actually filled (not just "still open" because
 * the off-chain order book hasn't been told).
 *
 * The on-chain event is always the source of truth; the API store can
 * lag or even forget (Vercel lambda restarts in the in-memory mode), so
 * sourcing this view from chain rather than `/api/orders` is what makes
 * "did my order fill?" reliably answerable.
 */

type ParsedFillLog = {
  blockNumber: bigint;
  transactionHash: Hash;
  logIndex: number;
  args: {
    orderHash: Hash;
    maker: Address;
    taker: Address;
    makerToken: Address;
    takerToken: Address;
    fillMakerAmount: bigint;
    fillTakerAmount: bigint;
    protocolFeeAmount: bigint;
    feeToken: Address;
  };
};

export type WalletFill = {
  txHash: Hash;
  blockNumber: bigint;
  ageSec: number;
  orderHash: Hash;
  /** Pair string in canonical "BASE/QUOTE" form when both sides match a known token. */
  pair: string;
  /** From the connected wallet's perspective: "buy" if it received base, "sell" if it gave base. */
  walletSide: "buy" | "sell";
  /** Whether the connected wallet was the maker or the taker on this fill. */
  role: "maker" | "taker";
  baseAmount: number;
  quoteAmount: number;
  price: number;
  protocolFeeAmount: bigint;
  feeToken: Address;
  counterparty: Address;
};

const BLOCKS_24H = 7200n;
const CHUNK = 5000n;
const ORDER_FILLED_EVENT = SCENTDEX_V5_ABI.find(
  (entry) => entry.type === "event" && entry.name === "OrderFilled",
) as Extract<(typeof SCENTDEX_V5_ABI)[number], { type: "event" }>;

export function useWalletFills(): {
  fills: WalletFill[];
  loading: boolean;
  error: unknown;
} {
  const chainId = useChainId();
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  const publicClient = usePublicClient({ chainId });
  const { address: account } = useAccount();
  const { data: latestBlock } = useBlockNumber({ chainId, watch: false });

  const queryKey = [
    "scentdex.walletFills",
    chainId,
    dexAddress,
    account?.toLowerCase(),
    latestBlock?.toString(),
  ] as const;

  const { data, isLoading, error } = useQuery<WalletFill[]>({
    queryKey,
    enabled: Boolean(dexAddress && publicClient && latestBlock && account),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (!dexAddress || !publicClient || !latestBlock || !account) return [];
      const lower = account.toLowerCase();
      const fromBlock =
        latestBlock > BLOCKS_24H ? latestBlock - BLOCKS_24H : 0n;

      const logs = await fetchFillLogs(
        publicClient,
        dexAddress,
        fromBlock,
        latestBlock,
      );

      const out: WalletFill[] = [];
      for (const log of logs) {
        const a = log.args;
        const makerLower = a.maker.toLowerCase();
        const takerLower = a.taker.toLowerCase();
        const isMaker = makerLower === lower;
        const isTaker = takerLower === lower;
        if (!isMaker && !isTaker) continue;

        const role: "maker" | "taker" = isMaker ? "maker" : "taker";
        const counterparty: Address = isMaker ? a.taker : a.maker;

        // Identify base / quote so we can render a stable "BASE/QUOTE"
        // pair string. We pick whichever token is in the canonical PAIRS
        // catalog as base; if neither matches we fall through with the
        // maker-token-as-base ordering and a generic pair string.
        const makerSym = symbolFor(a.makerToken, chainId);
        const takerSym = symbolFor(a.takerToken, chainId);

        let baseSym: string | null = null;
        let quoteSym: string | null = null;
        let baseAmount = 0;
        let quoteAmount = 0;
        let walletSide: "buy" | "sell" = "buy";

        if (makerSym && takerSym) {
          // Use the maker's perspective to determine the pair: maker sells
          // makerToken (= base) for takerToken (= quote). Then translate to
          // wallet's side.
          baseSym = makerSym;
          quoteSym = takerSym;
          const makerTok = tokenFor(makerSym);
          const takerTok = tokenFor(takerSym);
          baseAmount = makerTok
            ? Number(formatUnits(a.fillMakerAmount, makerTok.decimals))
            : 0;
          quoteAmount = takerTok
            ? Number(formatUnits(a.fillTakerAmount, takerTok.decimals))
            : 0;
          // Maker gave base, took quote → maker's side = "sell".
          // Taker gave quote, took base → taker's side = "buy".
          walletSide = isMaker ? "sell" : "buy";
        }

        const price = baseAmount > 0 ? quoteAmount / baseAmount : 0;
        const ageSec = Number(latestBlock - log.blockNumber) * 12;

        out.push({
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          ageSec,
          orderHash: a.orderHash,
          pair:
            baseSym && quoteSym ? `${baseSym}/${quoteSym}` : "Unknown pair",
          walletSide,
          role,
          baseAmount,
          quoteAmount,
          price,
          protocolFeeAmount: a.protocolFeeAmount,
          feeToken: a.feeToken,
          counterparty,
        });
      }

      out.sort((a, b) => {
        if (a.blockNumber === b.blockNumber) return 0;
        return a.blockNumber > b.blockNumber ? -1 : 1;
      });
      return out;
    },
  });

  return useMemo(
    () => ({
      fills: data ?? [],
      loading: isLoading,
      error,
    }),
    [data, isLoading, error],
  );
}

function symbolFor(addr: Address, chainId: number): string | null {
  const lower = addr.toLowerCase();
  for (const tok of TOKENS) {
    const a = tok.addresses[chainId];
    if (a && a.toLowerCase() === lower) return tok.symbol;
  }
  return null;
}

function tokenFor(symbol: string) {
  return TOKENS.find((t) => t.symbol === symbol);
}

async function fetchFillLogs(
  client: PublicClient,
  dexAddress: Address,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<ParsedFillLog[]> {
  const all: ParsedFillLog[] = [];
  for (let start = fromBlock; start <= toBlock; start += CHUNK + 1n) {
    const end = start + CHUNK > toBlock ? toBlock : start + CHUNK;
    const logs = await client.getLogs({
      address: dexAddress,
      event: ORDER_FILLED_EVENT,
      fromBlock: start,
      toBlock: end,
    });
    for (const log of logs) {
      all.push(log as unknown as ParsedFillLog);
    }
  }
  return all;
}
