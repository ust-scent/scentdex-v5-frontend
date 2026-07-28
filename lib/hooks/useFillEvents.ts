"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  formatUnits,
  type Address,
  type Hash,
  type PublicClient,
} from "viem";
import { useBlockNumber, useChainId, usePublicClient } from "wagmi";

import { SCENTDEX_V5_ABI } from "@/lib/abi";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { TOKENS, type Pair } from "@/lib/tokens";

/**
 * 24h on-chain fill index for a single pair.
 *
 * Streams `OrderFilled` events from the V5 contract over the last ~24h of
 * blocks (7,200 at 12s/block on Sepolia), filters to the requested pair,
 * decorates each entry with derived (price, baseAmount, quoteAmount, side),
 * and rolls up the standard 24h aggregates the trade UI needs:
 *
 *   - latestPrice         — most recent fill's price
 *   - priceChange24h      — fractional change vs the oldest fill in window
 *   - volume24h           — sum of quote-amount transferred
 *   - high24h / low24h    — price extremes
 *
 * Real data, fed straight from chain. Replaces the `Phase 1 placeholder`
 * arrays that StatsBar / RecentTrades carried during the bring-up.
 *
 * Implementation notes:
 *
 * - We chunk `getLogs` into 900-block ranges. thirdweb (the mainnet fill
 *   index RPC) caps a single getLogs at 1,000 blocks and returns
 *   error -32005 above that; 900 leaves headroom. 7,200 blocks (~24h) →
 *   8 sequential calls per refetch. A larger chunk (the old 5,000) made
 *   EVERY call error, so Recent Trades / StatsBar hung on "loading".
 * - Block age is estimated from `latestBlock - log.blockNumber` * 12s
 *   instead of querying `eth_getBlockByNumber` per log. Off by a few
 *   seconds at most; saves N round-trips per refetch.
 * - The query refetches every 15s and on window focus; results are
 *   cached by (chainId, dexAddress, pair, latestBlock) so panning to a
 *   different pair doesn't blow out the cache when the user comes back.
 */

/** Minimal subset of viem's parsed log we care about, with strict typing. */
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

export type Fill = {
  txHash: Hash;
  /**
   * The filled order's EIP-712 hash. One tx can settle several orders, so
   * (txHash, orderHash) — not txHash alone — identifies a fill. Used by
   * `useTradeHistory` to de-duplicate against the off-chain fill log.
   */
  orderHash: Hash;
  blockNumber: bigint;
  /** Approximate seconds since the fill (blockNumber-derived, 12s/block). */
  ageSec: number;
  /**
   * Absolute unix seconds, stamped at fetch time (`now - ageSec`). Gives the
   * trade tape one sort basis it can share with the off-chain fill log, whose
   * rows carry a real recorded timestamp. Stamped inside the query function on
   * purpose — reading the clock during render is impure.
   */
  atSec: number;
  maker: Address;
  taker: Address;
  makerToken: Address;
  takerToken: Address;
  fillMakerAmount: bigint;
  fillTakerAmount: bigint;
  /** Quote per base, decimal-aware. */
  price: number;
  /** Base-token amount transferred this fill (in pair.base units). */
  baseAmount: number;
  /** Quote-token amount transferred this fill (in pair.quote units). */
  quoteAmount: number;
  /** "buy" if the taker received base, "sell" if the taker delivered base. */
  side: "buy" | "sell";
};

export type PairStats = {
  fills: Fill[];
  loading: boolean;
  error: unknown;
  latestPrice: number | undefined;
  priceChange24h: number | undefined;
  volume24h: number;
  high24h: number | undefined;
  low24h: number | undefined;
};

const BLOCKS_24H = 7200n;
// thirdweb caps getLogs at 1,000 blocks/call (error -32005 above that).
const CHUNK = 900n;
const ORDER_FILLED_EVENT = SCENTDEX_V5_ABI.find(
  (entry) => entry.type === "event" && entry.name === "OrderFilled",
) as Extract<(typeof SCENTDEX_V5_ABI)[number], { type: "event" }>;

export function useFillEvents(pair: Pair): PairStats {
  const chainId = useChainId();
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  const publicClient = usePublicClient({ chainId });

  const baseToken = TOKENS.find((t) => t.symbol === pair.base);
  const quoteToken = TOKENS.find((t) => t.symbol === pair.quote);
  const baseAddr = baseToken?.addresses[chainId]?.toLowerCase();
  const quoteAddr = quoteToken?.addresses[chainId]?.toLowerCase();

  const { data: latestBlock } = useBlockNumber({ chainId, watch: false });

  const queryKey = [
    "scentdex.fills",
    chainId,
    dexAddress,
    baseAddr,
    quoteAddr,
    latestBlock?.toString(),
  ] as const;

  const { data, isLoading, error } = useQuery<Fill[]>({
    queryKey,
    enabled: Boolean(
      dexAddress &&
        publicClient &&
        latestBlock &&
        baseToken &&
        quoteToken &&
        baseAddr &&
        quoteAddr,
    ),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (
        !dexAddress ||
        !publicClient ||
        !latestBlock ||
        !baseToken ||
        !quoteToken ||
        !baseAddr ||
        !quoteAddr
      ) {
        return [];
      }
      const fromBlock =
        latestBlock > BLOCKS_24H ? latestBlock - BLOCKS_24H : 0n;
      const logs = await fetchFillLogs(
        publicClient,
        dexAddress,
        fromBlock,
        latestBlock,
      );

      const nowSec = Math.floor(Date.now() / 1000);
      const fills: Fill[] = [];
      for (const log of logs) {
        const mt = log.args.makerToken.toLowerCase();
        const tt = log.args.takerToken.toLowerCase();
        const matchesBaseQuote = mt === baseAddr && tt === quoteAddr;
        const matchesQuoteBase = mt === quoteAddr && tt === baseAddr;
        if (!matchesBaseQuote && !matchesQuoteBase) continue;

        let baseAmount: number;
        let quoteAmount: number;
        let side: "buy" | "sell";
        if (matchesBaseQuote) {
          baseAmount = Number(
            formatUnits(log.args.fillMakerAmount, baseToken.decimals),
          );
          quoteAmount = Number(
            formatUnits(log.args.fillTakerAmount, quoteToken.decimals),
          );
          side = "buy";
        } else {
          baseAmount = Number(
            formatUnits(log.args.fillTakerAmount, baseToken.decimals),
          );
          quoteAmount = Number(
            formatUnits(log.args.fillMakerAmount, quoteToken.decimals),
          );
          side = "sell";
        }

        const price = baseAmount > 0 ? quoteAmount / baseAmount : 0;
        const ageSec = Number(latestBlock - log.blockNumber) * 12;

        fills.push({
          txHash: log.transactionHash,
          orderHash: log.args.orderHash,
          blockNumber: log.blockNumber,
          ageSec,
          atSec: nowSec - ageSec,
          maker: log.args.maker,
          taker: log.args.taker,
          makerToken: log.args.makerToken,
          takerToken: log.args.takerToken,
          fillMakerAmount: log.args.fillMakerAmount,
          fillTakerAmount: log.args.fillTakerAmount,
          price,
          baseAmount,
          quoteAmount,
          side,
        });
      }

      // Most recent first.
      fills.sort((a, b) => {
        if (a.blockNumber === b.blockNumber) return 0;
        return a.blockNumber > b.blockNumber ? -1 : 1;
      });
      return fills;
    },
  });

  // Persistent last-traded-price fallback from the off-chain book (records
  // every fill). When the 24h on-chain window has no fills, the StatsBar
  // price sticks at the last trade instead of blanking to "—" on a quiet
  // pair. 24h stats (change / volume / high / low) stay window-scoped.
  const pairKey = `${pair.base}/${pair.quote}`;
  const { data: lastTradePrice } = useQuery<number | undefined>({
    queryKey: ["scentdex.lastPrice", chainId, pairKey],
    enabled: Boolean(baseToken && quoteToken && baseAddr && quoteAddr),
    refetchInterval: 30_000,
    queryFn: async () => {
      const res = await fetch(
        `/api/last-price?pair=${encodeURIComponent(pairKey)}&chainId=${chainId}`,
      );
      if (!res.ok) return undefined;
      const { trade } = (await res.json()) as {
        trade: {
          makerToken: string;
          takerToken: string;
          makerAmount: string;
          takerAmount: string;
        } | null;
      };
      if (!trade || !baseToken || !quoteToken || !baseAddr || !quoteAddr) {
        return undefined;
      }
      const mt = trade.makerToken.toLowerCase();
      const tt = trade.takerToken.toLowerCase();
      const makerAmount = BigInt(trade.makerAmount);
      const takerAmount = BigInt(trade.takerAmount);
      if (makerAmount === 0n || takerAmount === 0n) return undefined;
      if (mt === baseAddr && tt === quoteAddr) {
        const base = Number(formatUnits(makerAmount, baseToken.decimals));
        const quote = Number(formatUnits(takerAmount, quoteToken.decimals));
        return base > 0 ? quote / base : undefined;
      }
      if (mt === quoteAddr && tt === baseAddr) {
        const base = Number(formatUnits(takerAmount, baseToken.decimals));
        const quote = Number(formatUnits(makerAmount, quoteToken.decimals));
        return base > 0 ? quote / base : undefined;
      }
      return undefined;
    },
  });

  return useMemo<PairStats>(() => {
    const list = data ?? [];
    if (list.length === 0) {
      return {
        fills: [],
        loading: isLoading,
        error,
        // Persist the last traded price even outside the 24h window.
        latestPrice: lastTradePrice,
        priceChange24h: undefined,
        volume24h: 0,
        high24h: undefined,
        low24h: undefined,
      };
    }
    const latestPrice = list[0].price;
    const oldestInWindow = list[list.length - 1].price;
    const priceChange24h =
      oldestInWindow > 0
        ? (latestPrice - oldestInWindow) / oldestInWindow
        : undefined;
    const volume24h = list.reduce((sum, f) => sum + f.quoteAmount, 0);
    const prices = list.map((f) => f.price).filter((p) => p > 0);
    const high24h = prices.length > 0 ? Math.max(...prices) : undefined;
    const low24h = prices.length > 0 ? Math.min(...prices) : undefined;
    return {
      fills: list,
      loading: false,
      error: undefined,
      latestPrice,
      priceChange24h,
      volume24h,
      high24h,
      low24h,
    };
  }, [data, isLoading, error, lastTradePrice]);
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
      // viem types these as possibly-undefined when the event signature
      // is generic, but our `event` argument pins the args shape — the
      // cast just relaxes the TS surface.
      all.push(log as unknown as ParsedFillLog);
    }
  }
  return all;
}
