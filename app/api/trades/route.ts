import { NextRequest, NextResponse } from "next/server";

import { listTrades } from "@/lib/orders-store";

/**
 * GET /api/trades?pair=SDT/WETH&chainId=1&limit=30
 *
 * Executed-fill tape for a pair, most recent first. Backs the Recent Trades
 * panel: the on-chain event index only reaches back ~24h (getLogs is chunked
 * at 900 blocks/call, so a deeper window costs dozens of RPC round trips per
 * refresh), which shows a single row on a quiet pair. This reads the
 * `order_events` audit log instead — one indexed query, no range ceiling, and
 * each row already carries the tx hash for the explorer link.
 *
 * Returns raw token/amount pairs rather than a derived price: the client owns
 * the base/quote orientation and decimals for the pair it is rendering, and
 * duplicating that here would be a second place to keep in sync.
 */
export const runtime = "nodejs";

const DEFAULT_LIMIT = 30;

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pair = url.searchParams.get("pair");
  const chainParam = url.searchParams.get("chainId");
  const limitParam = url.searchParams.get("limit");

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

  const limit = limitParam === null ? DEFAULT_LIMIT : Number(limitParam);
  if (!Number.isFinite(limit) || limit <= 0) {
    return NextResponse.json({ error: "bad limit" }, { status: 400 });
  }

  const trades = await listTrades(pair, chainId, limit);
  return NextResponse.json({ trades });
}
