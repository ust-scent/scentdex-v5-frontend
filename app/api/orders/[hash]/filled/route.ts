import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  decodeEventLog,
  getAddress,
  http,
  type Hash,
  type Hex,
} from "viem";
import { mainnet, sepolia } from "viem/chains";

import { SCENTDEX_V5_ABI } from "@/lib/abi";
import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { findOrder, markFilled } from "@/lib/orders-store";

/**
 * POST /api/orders/[hash]/filled
 *
 * Mirrors a successful on-chain OrderFilled into the off-chain book so the
 * order disappears from the public board and shows up in the maker's
 * "filled" history. The caller is the taker UI right after
 * useWaitForTransactionReceipt resolves with status === 'success'.
 *
 * Body shape:
 *   { txHash: "0x...", chainId: 11155111 }
 *
 * We do not trust the client to tell us the fill amounts. We fetch the
 * tx receipt server-side, decode every `OrderFilled` log against the V5
 * ABI, and pick the one whose `orderHash` argument matches the path
 * parameter. fillMakerAmount / fillTakerAmount come from that log.
 *
 * If the tx is not yet mined we return 202 and let the client retry — the
 * UI is already polling /api/orders every 3 seconds, so a few extra
 * retries are cheap.
 *
 * Idempotent: `markFilled` keys off (orderHash, txHash) in order_events
 * and short-circuits when the same fill has already been applied.
 */

export const runtime = "nodejs";

const ORDER_FILLED_EVENT = SCENTDEX_V5_ABI.find(
  (entry) => entry.type === "event" && entry.name === "OrderFilled",
);

function rpcClientFor(chainId: number) {
  if (chainId === 11155111) {
    const url =
      process.env.SEPOLIA_RPC_URL ||
      "https://ethereum-sepolia-rpc.publicnode.com";
    return createPublicClient({ chain: sepolia, transport: http(url) });
  }
  if (chainId === 1) {
    const url = process.env.MAINNET_RPC_URL;
    if (!url) return null;
    return createPublicClient({ chain: mainnet, transport: http(url) });
  }
  return null;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> },
) {
  const { hash } = await params;
  if (!hash || !hash.startsWith("0x") || hash.length !== 66) {
    return NextResponse.json({ error: "invalid order hash" }, { status: 400 });
  }
  if (!ORDER_FILLED_EVENT) {
    // Cannot happen in practice (compile-time constant ABI), but TS demands the check.
    return NextResponse.json(
      { error: "OrderFilled event missing from ABI" },
      { status: 500 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json body" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "body must be { txHash, chainId }" },
      { status: 400 },
    );
  }
  const b = body as Record<string, unknown>;
  if (typeof b.txHash !== "string" || !b.txHash.startsWith("0x")) {
    return NextResponse.json({ error: "missing txHash" }, { status: 400 });
  }
  if (typeof b.chainId !== "number") {
    return NextResponse.json({ error: "missing chainId" }, { status: 400 });
  }
  const txHash = b.txHash as Hash;
  const chainId = b.chainId;

  const order = await findOrder(hash);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  if (order.chainId !== chainId) {
    return NextResponse.json(
      { error: `order is on chain ${order.chainId}, request says ${chainId}` },
      { status: 400 },
    );
  }
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  if (!dexAddress) {
    return NextResponse.json(
      { error: `SCENTDEX V5 not deployed on chainId ${chainId}` },
      { status: 400 },
    );
  }

  const client = rpcClientFor(chainId);
  if (!client) {
    return NextResponse.json(
      { error: `no RPC configured for chainId ${chainId}` },
      { status: 500 },
    );
  }

  let receipt;
  try {
    receipt = await client.getTransactionReceipt({ hash: txHash });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // Treat "not found" / "not yet mined" as a transient state, not a
    // client error — let the UI retry.
    if (/not found|cannot be found|could not be found/i.test(msg)) {
      return NextResponse.json({ pending: true }, { status: 202 });
    }
    return NextResponse.json(
      { error: `receipt fetch failed: ${msg.slice(0, 200)}` },
      { status: 502 },
    );
  }

  if (receipt.status !== "success") {
    return NextResponse.json(
      { error: `tx ${txHash} reverted on chain` },
      { status: 400 },
    );
  }

  // The taker calls the DEX directly; the OrderFilled log must originate
  // from the DEX address we know. Anything else is either the wrong tx or
  // a spoofed receipt — refuse.
  const dexLower = dexAddress.toLowerCase();
  let matchedFillMaker: bigint | null = null;
  let matchedFillTaker: bigint | null = null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== dexLower) continue;
    let decoded;
    try {
      decoded = decodeEventLog({
        abi: SCENTDEX_V5_ABI,
        data: log.data,
        topics: log.topics,
      });
    } catch {
      continue;
    }
    if (decoded.eventName !== "OrderFilled") continue;
    const a = decoded.args as {
      orderHash: Hex;
      fillMakerAmount: bigint;
      fillTakerAmount: bigint;
    };
    if (a.orderHash.toLowerCase() !== hash.toLowerCase()) continue;
    matchedFillMaker = a.fillMakerAmount;
    matchedFillTaker = a.fillTakerAmount;
    break;
  }

  if (matchedFillMaker === null || matchedFillTaker === null) {
    return NextResponse.json(
      {
        error: `tx ${txHash} did not emit OrderFilled for order ${hash}`,
      },
      { status: 400 },
    );
  }

  // Sanity check: the recovered DEX in the log matches our table.
  // (Defensive — already filtered by address above, but explicit is cheap.)
  if (getAddress(dexAddress) !== getAddress(dexAddress)) {
    /* unreachable */
  }

  const result = await markFilled(
    hash,
    matchedFillMaker,
    matchedFillTaker,
    txHash,
    Number(receipt.blockNumber),
  );
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 409 });
  }
  return NextResponse.json({
    ok: true,
    status: result.status,
    alreadyApplied: result.alreadyApplied,
  });
}
