"use client";

import { useEffect, useMemo, useState } from "react";
import type { Address } from "viem";

/**
 * Batch-fetch reputation for a list of maker addresses.
 *
 * Single round-trip to /api/maker-stats no matter how many makers are visible
 * in the order book. The result is keyed by lowercase address, with
 * pessimistic defaults for makers we haven't seen before (zeros + undefined
 * rates) — the consumer can render a row uniformly regardless of whether the
 * maker has any history yet.
 *
 * Refresh cadence: addresses are debounced + the request runs every 30s while
 * the component is mounted. That's enough resolution for "this maker just
 * started racking up cancellations" to surface before a buyer commits gas.
 */

const REFRESH_MS = 30_000;

export type MakerStat = {
  address: string;
  totals: {
    created: number;
    cancelled: number;
    expired: number;
    filled: number;
    failedFill: number;
  };
  cancelRate: number | undefined;
  fillRate: number | undefined;
  failedFillRate: number | undefined;
  lastSeenAt: number | undefined;
  durable: boolean;
};

export type MakerStatsResult = {
  stats: Record<string, MakerStat>;
  loading: boolean;
};

export function useMakerStats(makers: Address[]): MakerStatsResult {
  const [stats, setStats] = useState<Record<string, MakerStat>>({});
  const [loading, setLoading] = useState(false);

  // Stable, lowercase, de-duplicated key list. Stringified for useEffect dep.
  const key = useMemo(() => {
    const set = new Set(makers.map((a) => a.toLowerCase()));
    return Array.from(set).sort().join(",");
  }, [makers]);

  useEffect(() => {
    if (!key) {
      setStats({});
      return;
    }
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function fetchOnce() {
      const params = new URLSearchParams();
      for (const a of key.split(",")) params.append("address", a);
      setLoading(true);
      try {
        const res = await fetch(`/api/maker-stats?${params.toString()}`);
        if (!res.ok) return;
        const data = (await res.json()) as { stats: Record<string, MakerStat> };
        if (!cancelled) setStats(data.stats);
      } catch {
        // Network blip — keep the previous snapshot, retry on the next tick.
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(fetchOnce, REFRESH_MS);
        }
      }
    }

    fetchOnce();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [key]);

  return { stats, loading };
}

/**
 * Threshold helpers — single source of truth so the explainer page and the
 * OrderBook UI can't drift.
 */
export const REPUTATION_THRESHOLDS = {
  /** cancelRate at which we surface a yellow warning. */
  cancelWarn: 0.3,
  /** cancelRate at which we surface a red warning. */
  cancelStrong: 0.6,
} as const;

export function classifyCancelRate(
  rate: number | undefined,
): "ok" | "warn" | "strong" {
  if (rate === undefined) return "ok";
  if (rate >= REPUTATION_THRESHOLDS.cancelStrong) return "strong";
  if (rate >= REPUTATION_THRESHOLDS.cancelWarn) return "warn";
  return "ok";
}
