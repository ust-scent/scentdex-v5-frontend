import { NextRequest, NextResponse } from "next/server";

import { lastTrade } from "@/lib/orders-store";

/**
 * GET /api/last-price?pair=SDT/WETH&chainId=1
 *
 * Returns the token/amount shape of the most recently filled order for the
 * pair so the client can derive the last traded price. Used by the StatsBar
 * as a persistent price fallback when the 24h on-chain stats window has no
 * fills (a quiet pair) — the price sticks at the last trade instead of
 * blanking to "—". Returns { trade: null } when the pair has never traded.
 */
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pair = url.searchParams.get("pair");
  const chainParam = url.searchParams.get("chainId");
  if (!pair || !chainParam) {
    return NextResponse.json(
      { error: "pair and chainId required" },
      { status: 400 },
    );
  }
  const chainId = Number(chainParam);
  if (!Number.isInteger(chainId)) {
    return NextResponse.json({ error: "bad chainId" }, { status: 400 });
  }
  const trade = await lastTrade(pair, chainId);
  return NextResponse.json({ trade });
}
