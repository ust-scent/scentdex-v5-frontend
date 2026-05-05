import { NextRequest, NextResponse } from "next/server";
import {
  isAddress,
  recoverTypedDataAddress,
  type Address,
  type Hex,
} from "viem";

import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { cancelOrder, findOrder } from "@/lib/orders-store";

/**
 * POST /api/orders/[hash]/cancel
 *
 * Off-chain cancel: takes the order out of the public book and records a
 * `cancelled` event for reputation. This is FREE — no transaction, no gas.
 *
 * Caveat: anyone who has cached the maker's signature could in principle
 * still submit it on-chain before our indexer picks up the cancel and
 * blacklists it. For ironclad cancellation the maker calls `cancelOrder()`
 * on the V5 contract (gas + on-chain event). The UI surfaces both options.
 *
 * Authn: the request body must include an EIP-712 signature over a
 *   { orderHash, action: "cancel", chainId } message that recovers to the
 * order's maker. We don't trust client-supplied "I'm the maker" claims.
 *
 * Body shape:
 *   { signature: 0x..., chainId: 11155111 }
 *
 * For the dev/in-memory backend we accept the request as-is to keep local
 * iteration fast — the auth check only fires when DATABASE_URL is set
 * (i.e. production). See `STRICT_CANCEL_AUTH` toggle below if you want to
 * force it locally too.
 */

export const runtime = "nodejs";

const STRICT_CANCEL_AUTH = process.env.STRICT_CANCEL_AUTH === "1" ||
  Boolean(process.env.DATABASE_URL ?? process.env.POSTGRES_URL);

const CANCEL_TYPES = {
  CancelOrder: [
    { name: "orderHash", type: "bytes32" },
    { name: "action", type: "string" },
    { name: "chainId", type: "uint256" },
  ],
} as const;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hash: string }> },
) {
  const { hash } = await params;
  if (!hash || !hash.startsWith("0x")) {
    return NextResponse.json({ error: "invalid order hash" }, { status: 400 });
  }

  const order = await findOrder(hash);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }
  if (order.status !== "open" && order.status !== "partially-filled") {
    return NextResponse.json(
      { error: `order is ${order.status}; nothing to cancel` },
      { status: 409 },
    );
  }

  if (STRICT_CANCEL_AUTH) {
    const auth = await verifyCancelAuth(req, order.order.maker, hash, order.chainId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: 401 });
    }
  }

  const cancelled = await cancelOrder(hash);
  if (!cancelled) {
    return NextResponse.json(
      { error: "order is no longer cancellable" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function verifyCancelAuth(
  req: NextRequest,
  expectedMaker: Address,
  orderHash: string,
  chainId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return { ok: false, error: "invalid json body" };
  }

  if (!body || typeof body !== "object") {
    return { ok: false, error: "body must be { signature, chainId }" };
  }
  const b = body as Record<string, unknown>;
  if (typeof b.signature !== "string" || !b.signature.startsWith("0x")) {
    return { ok: false, error: "missing signature" };
  }
  if (typeof b.chainId !== "number" || b.chainId !== chainId) {
    return { ok: false, error: "chainId mismatch" };
  }
  if (!isAddress(expectedMaker)) {
    return { ok: false, error: "invalid maker on stored order" };
  }
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  if (!dexAddress) {
    return { ok: false, error: `SCENTDEX V5 not deployed on chainId ${chainId}` };
  }

  let recovered: Address;
  try {
    recovered = await recoverTypedDataAddress({
      domain: {
        name: "SCENTDEX",
        version: "6",
        chainId,
        verifyingContract: dexAddress,
      },
      types: CANCEL_TYPES,
      primaryType: "CancelOrder",
      message: { orderHash: orderHash as Hex, action: "cancel", chainId: BigInt(chainId) },
      signature: b.signature as Hex,
    } as Parameters<typeof recoverTypedDataAddress>[0]);
  } catch (e) {
    return {
      ok: false,
      error: `signature recovery failed: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  if (recovered.toLowerCase() !== expectedMaker.toLowerCase()) {
    return { ok: false, error: "signature does not match order maker" };
  }
  return { ok: true };
}
