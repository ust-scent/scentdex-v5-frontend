import { NextRequest, NextResponse } from "next/server";
import { isAddress } from "viem";

import { getMakerStats } from "@/lib/orders-store";

/**
 * GET /api/maker-stats?address=0x…[&address=0x…]
 *
 * Batched lookup so the order book can fetch reputation for every visible
 * maker in a single round-trip. Returns a map keyed by lowercase address:
 *
 *   {
 *     stats: {
 *       "0xabc…": { totals, cancelRate, fillRate, failedFillRate, lastSeenAt, durable },
 *       ...
 *     }
 *   }
 *
 * Addresses we don't recognise still appear in the map with all-zero counts
 * — keeps the consumer's logic uniform (no special "unknown" branch).
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const raw = url.searchParams.getAll("address");
  if (raw.length === 0) {
    return NextResponse.json(
      { error: "at least one ?address=0x… parameter required" },
      { status: 400 },
    );
  }
  if (raw.length > 50) {
    return NextResponse.json(
      { error: "max 50 addresses per request" },
      { status: 400 },
    );
  }

  const valid: string[] = [];
  for (const a of raw) {
    if (!isAddress(a)) {
      return NextResponse.json(
        { error: `invalid address: ${a}` },
        { status: 400 },
      );
    }
    valid.push(a.toLowerCase());
  }

  const stats: Record<string, Awaited<ReturnType<typeof getMakerStats>>> = {};
  await Promise.all(
    Array.from(new Set(valid)).map(async (a) => {
      stats[a] = await getMakerStats(a);
    }),
  );

  return NextResponse.json({ stats });
}
