import { NextRequest, NextResponse } from "next/server";
import {
  isAddress,
  recoverTypedDataAddress,
  type Address,
  type Hex,
} from "viem";

import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { ORDER_TYPES, buildDomain, type Order } from "@/lib/order";
import type { SerialisedPermitSingle } from "@/lib/permit2";
import {
  insertOrder,
  listOrders,
  type SerialisedOrder,
  type StoredOrder,
} from "@/lib/orders-store";

/**
 * SCENTDEX V5 — Off-chain order book API
 *
 * POST /api/orders   — accept a maker's signed order
 * GET  /api/orders   — list orders, optionally filtered by ?pair= and ?chainId=
 *
 * Storage moved to `lib/orders-store.ts` in Phase 3.5: Postgres when
 * DATABASE_URL is set, in-memory Map otherwise. Cancel and reputation
 * endpoints live alongside this file.
 *
 * The on-chain orderHash (EIP-712 digest) is the canonical identifier.
 * For Phase 3.5 we still use the signature itself as the primary key —
 * always 65 bytes, always unique per signed order. The proper digest
 * computation lands when the indexer goes in (Phase 3.5b).
 */

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pair = url.searchParams.get("pair") ?? undefined;
  const chainParam = url.searchParams.get("chainId");
  const chainId = chainParam ? Number(chainParam) : undefined;

  const orders = await listOrders({ pair, chainId });
  return NextResponse.json({ orders, count: orders.length });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = parseSubmitBody(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const { order, signature, pair, chainId, permitSingle, permitSignature } =
    parsed.value;

  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  if (!dexAddress) {
    return NextResponse.json(
      { error: `SCENTDEX V5 not deployed on chainId ${chainId}` },
      { status: 400 },
    );
  }

  const reified: Order = {
    maker: order.maker,
    makerToken: order.makerToken,
    takerToken: order.takerToken,
    makerAmount: BigInt(order.makerAmount),
    takerAmount: BigInt(order.takerAmount),
    expiry: BigInt(order.expiry),
    nonce: BigInt(order.nonce),
    salt: order.salt,
    feeSide: order.feeSide,
    feeBps: order.feeBps,
  };

  let recovered: Address;
  try {
    recovered = await recoverTypedDataAddress({
      domain: buildDomain(chainId, dexAddress),
      types: ORDER_TYPES,
      primaryType: "Order",
      message: reified as unknown as Record<string, unknown>,
      signature,
    } as Parameters<typeof recoverTypedDataAddress>[0]);
  } catch (e) {
    return NextResponse.json(
      {
        error: `signature recovery failed: ${
          e instanceof Error ? e.message : String(e)
        }`,
      },
      { status: 400 },
    );
  }

  if (recovered.toLowerCase() !== order.maker.toLowerCase()) {
    return NextResponse.json(
      {
        error: "signature does not match maker",
        recovered,
        maker: order.maker,
      },
      { status: 400 },
    );
  }

  const orderHash: Hex = signature; // placeholder primary key — see file header

  const stored: StoredOrder = {
    orderHash,
    order,
    signature,
    status: "open",
    filledMakerAmount: "0",
    filledTakerAmount: "0",
    pair,
    chainId,
    createdAt: Math.floor(Date.now() / 1000),
    permitSingle,
    permitSignature,
  };

  try {
    await insertOrder(stored);
  } catch (e) {
    return NextResponse.json(
      {
        error: `failed to persist order: ${
          e instanceof Error ? e.message : String(e)
        }`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, order: stored }, { status: 201 });
}

// ---------- request body parsing ---------------------------------------------

type SubmitBody = {
  order: SerialisedOrder;
  signature: Hex;
  pair: string;
  chainId: number;
  /**
   * Round-3: per-order Permit2 signature. The maker signs a PermitSingle
   * scoped to (token=makerToken, amount=makerAmount, expiration=expiry,
   * spender=DEX) and the taker forwards it via fillOrder. Optional during
   * the round-3 transition so legacy orders without one still post.
   */
  permitSingle?: SerialisedPermitSingle;
  permitSignature?: Hex;
};

function parseSubmitBody(
  body: unknown,
): { ok: true; value: SubmitBody } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "body must be object" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.signature !== "string" || !b.signature.startsWith("0x")) {
    return { ok: false, error: "signature missing or malformed" };
  }
  if (typeof b.pair !== "string") {
    return { ok: false, error: "pair missing" };
  }
  if (typeof b.chainId !== "number") {
    return { ok: false, error: "chainId missing" };
  }
  if (!b.order || typeof b.order !== "object") {
    return { ok: false, error: "order missing" };
  }
  const o = b.order as Record<string, unknown>;
  const required = [
    "maker",
    "makerToken",
    "takerToken",
    "makerAmount",
    "takerAmount",
    "expiry",
    "nonce",
    "salt",
    "feeSide",
    "feeBps",
  ];
  for (const k of required) {
    if (o[k] === undefined) {
      return { ok: false, error: `order.${k} missing` };
    }
  }

  for (const addrField of ["maker", "makerToken", "takerToken", "feeSide"]) {
    const v = o[addrField];
    if (typeof v !== "string" || !isAddress(v)) {
      return { ok: false, error: `order.${addrField} not a valid address` };
    }
  }
  for (const numField of ["makerAmount", "takerAmount", "expiry", "nonce"]) {
    const v = o[numField];
    if (typeof v !== "string") {
      return {
        ok: false,
        error: `order.${numField} must be a decimal string (got ${typeof v})`,
      };
    }
    try {
      BigInt(v);
    } catch {
      return { ok: false, error: `order.${numField} not parseable as bigint` };
    }
  }
  if (
    typeof o.salt !== "string" ||
    !o.salt.startsWith("0x") ||
    o.salt.length !== 66
  ) {
    return {
      ok: false,
      error: "order.salt must be a 0x-prefixed 32-byte hex string",
    };
  }
  if (typeof o.feeBps !== "number" || o.feeBps < 0 || o.feeBps > 10000) {
    return { ok: false, error: "order.feeBps must be 0..10000" };
  }

  // Round-3 fields — optional + structurally checked. We accept the body
  // even without them (legacy infinite-allowance flow) so the round-3 cut
  // doesn't strand existing UAT orders, but new clients should always send
  // both.
  let permitSingle: SerialisedPermitSingle | undefined;
  let permitSignature: Hex | undefined;
  if (b.permitSingle !== undefined) {
    const validation = validatePermitSingle(b.permitSingle);
    if (!validation.ok) {
      return { ok: false, error: validation.error };
    }
    permitSingle = validation.value;
  }
  if (b.permitSignature !== undefined) {
    if (
      typeof b.permitSignature !== "string" ||
      !b.permitSignature.startsWith("0x")
    ) {
      return { ok: false, error: "permitSignature missing or malformed" };
    }
    permitSignature = b.permitSignature as Hex;
  }
  if ((permitSingle && !permitSignature) || (!permitSingle && permitSignature)) {
    return {
      ok: false,
      error: "permitSingle and permitSignature must come together",
    };
  }

  return {
    ok: true,
    value: {
      order: {
        maker: o.maker as Address,
        makerToken: o.makerToken as Address,
        takerToken: o.takerToken as Address,
        makerAmount: o.makerAmount as string,
        takerAmount: o.takerAmount as string,
        expiry: o.expiry as string,
        nonce: o.nonce as string,
        salt: o.salt as Hex,
        feeSide: o.feeSide as Address,
        feeBps: o.feeBps,
      },
      signature: b.signature as Hex,
      pair: b.pair,
      chainId: b.chainId,
      permitSingle,
      permitSignature,
    },
  };
}

function validatePermitSingle(
  raw: unknown,
):
  | { ok: true; value: SerialisedPermitSingle }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== "object") {
    return { ok: false, error: "permitSingle must be object" };
  }
  const p = raw as Record<string, unknown>;
  const d = p.details as Record<string, unknown> | undefined;
  if (!d || typeof d !== "object") {
    return { ok: false, error: "permitSingle.details missing" };
  }
  if (typeof d.token !== "string" || !isAddress(d.token)) {
    return { ok: false, error: "permitSingle.details.token invalid address" };
  }
  if (typeof d.amount !== "string") {
    return {
      ok: false,
      error: "permitSingle.details.amount must be a decimal string",
    };
  }
  try {
    BigInt(d.amount);
  } catch {
    return { ok: false, error: "permitSingle.details.amount unparsable" };
  }
  if (typeof d.expiration !== "number" || d.expiration < 0) {
    return { ok: false, error: "permitSingle.details.expiration must be uint48" };
  }
  if (typeof d.nonce !== "number" || d.nonce < 0) {
    return { ok: false, error: "permitSingle.details.nonce must be uint48" };
  }
  if (typeof p.spender !== "string" || !isAddress(p.spender)) {
    return { ok: false, error: "permitSingle.spender invalid address" };
  }
  if (typeof p.sigDeadline !== "string") {
    return { ok: false, error: "permitSingle.sigDeadline must be a decimal string" };
  }
  try {
    BigInt(p.sigDeadline);
  } catch {
    return { ok: false, error: "permitSingle.sigDeadline unparsable" };
  }

  return {
    ok: true,
    value: {
      details: {
        token: d.token as Address,
        amount: d.amount as string,
        expiration: d.expiration,
        nonce: d.nonce,
      },
      spender: p.spender as Address,
      sigDeadline: p.sigDeadline as string,
    },
  };
}
