import { NextRequest, NextResponse } from "next/server";
import {
  isAddress,
  recoverTypedDataAddress,
  type Address,
  type Hex,
} from "viem";

import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { cancelOrder, findOrder } from "@/lib/orders-store";
import { readOnchainCancelled } from "@/lib/server-chain";

/**
 * POST /api/orders/[hash]/cancel
 *
 * Two modes:
 *
 * 1. Off-chain cancel (default) — takes the order off the public book and
 *    records a `cancelled` event. Free, no gas. ⚠️ The contract never hears
 *    about it: the maker's signature stays valid on-chain until expiry, so
 *    anyone who already holds it can still fill the order (audit OC-01).
 *    The UI labels this as "hide from the book only".
 *    Authn: an EIP-712 signature over { orderHash, action: "cancel", chainId }
 *    that recovers to the order's maker. Body: { signature, chainId }.
 *    (Only enforced when a database is configured — see STRICT_CANCEL_AUTH.)
 *
 * 2. On-chain mirror — body { onchain: true, chainId }. Called by the UI
 *    after the maker's `cancelOrder()` transaction is mined. No wallet
 *    signature is needed: the server reads `cancelled(orderHash)` from the
 *    DEX itself and only mirrors what the chain already says (only the
 *    maker can set that flag). Idempotent — a row that is already
 *    cancelled in the DB returns 200 too.
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
  if (!hash || !hash.startsWith("0x") || hash.length !== 66) {
    return NextResponse.json({ error: "invalid order hash" }, { status: 400 });
  }

  const order = await findOrder(hash);
  if (!order) {
    return NextResponse.json({ error: "order not found" }, { status: 404 });
  }

  // The body may legitimately be empty for the dev/in-memory off-chain path.
  let body: Record<string, unknown> = {};
  try {
    const parsed: unknown = await req.json();
    if (parsed && typeof parsed === "object") {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = {};
  }

  if (body.onchain === true) {
    return mirrorOnchainCancel(hash as Hex, order.chainId, order.status, body);
  }

  if (order.status !== "open" && order.status !== "partially-filled") {
    return NextResponse.json(
      { error: `order is ${order.status}; nothing to cancel` },
      { status: 409 },
    );
  }

  if (STRICT_CANCEL_AUTH) {
    const auth = await verifyCancelAuth(body, order.order.maker, hash, order.chainId);
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

  return NextResponse.json({ ok: true, onchainCancelled: false });
}

async function mirrorOnchainCancel(
  hash: Hex,
  chainId: number,
  status: string,
  body: Record<string, unknown>,
) {
  if (typeof body.chainId !== "number" || body.chainId !== chainId) {
    return NextResponse.json({ error: "chainId mismatch" }, { status: 400 });
  }
  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  if (!dexAddress) {
    return NextResponse.json(
      { error: `SCENTDEX V5 not deployed on chainId ${chainId}` },
      { status: 400 },
    );
  }

  const onchain = await readOnchainCancelled(chainId, dexAddress, hash);
  if (onchain === null) {
    return NextResponse.json(
      { error: "could not read on-chain cancel state; retry" },
      { status: 502 },
    );
  }
  if (!onchain) {
    // Usually the RPC has not caught up with the just-mined tx yet.
    return NextResponse.json(
      { pending: true, error: "order is not cancelled on-chain (yet)" },
      { status: 409 },
    );
  }

  if (status === "open" || status === "partially-filled") {
    await cancelOrder(hash);
  }
  return NextResponse.json({ ok: true, onchainCancelled: true });
}

async function verifyCancelAuth(
  b: Record<string, unknown>,
  expectedMaker: Address,
  orderHash: string,
  chainId: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
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
