import { NextRequest, NextResponse } from "next/server";
import {
  isAddress,
  recoverTypedDataAddress,
  type Address,
  type Hex,
} from "viem";

import { SCENTDEX_V5_ADDRESS } from "@/lib/contracts";
import { ORDER_TYPES, buildDomain, type Order } from "@/lib/order";

/**
 * SCENTDEX V5 — Off-chain order book API
 *
 * POST /api/orders   — accept a maker's signed order
 * GET  /api/orders   — list active orders, optionally filtered by ?pair=
 *
 * Phase 3.3 storage: process-local Map. This survives within a single
 * Next.js dev server, but evaporates on each Vercel cold start in
 * production. Phase 3.5 swaps in Upstash Redis (or Vercel Postgres)
 * + a cron-driven event indexer that watches OrderFilled / Cancelled
 * to drive `status` transitions.
 *
 * Order is canonical, JSON-encoded with bigints serialised as strings.
 * The hash used as primary key is the on-chain orderHash (EIP-712 digest)
 * recomputed inside this handler for authenticity.
 */

// ---------- types & storage --------------------------------------------------

type StoredOrder = {
  orderHash: Hex;
  order: SerialisedOrder;
  signature: Hex;
  status: "open" | "partially-filled" | "filled" | "cancelled" | "expired";
  filledMakerAmount: string;
  filledTakerAmount: string;
  pair: string; // canonical "MAKER_SYMBOL/TAKER_SYMBOL" — used for filtering
  chainId: number;
  createdAt: number; // unix seconds
};

type SerialisedOrder = {
  maker: Address;
  makerToken: Address;
  takerToken: Address;
  makerAmount: string;
  takerAmount: string;
  expiry: string;
  nonce: string;
  salt: Hex;
  feeSide: Address;
  feeBps: number;
};

declare global {
  // Persist across HMR in dev. Recreated per cold start in prod.
  // eslint-disable-next-line no-var
  var __SCENTDEX_ORDERS__: Map<string, StoredOrder> | undefined;
}

function getStore(): Map<string, StoredOrder> {
  if (!globalThis.__SCENTDEX_ORDERS__) {
    globalThis.__SCENTDEX_ORDERS__ = new Map();
  }
  return globalThis.__SCENTDEX_ORDERS__;
}

// ---------- handlers ---------------------------------------------------------

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const pair = url.searchParams.get("pair") ?? undefined;
  const chainParam = url.searchParams.get("chainId");
  const chainId = chainParam ? Number(chainParam) : undefined;

  const all = Array.from(getStore().values());
  const now = Math.floor(Date.now() / 1000);

  const filtered = all
    .filter((o) => (pair ? o.pair === pair : true))
    .filter((o) => (chainId ? o.chainId === chainId : true))
    .map((o) => {
      // Lazy expiry transition
      if (o.status === "open" || o.status === "partially-filled") {
        const expiryUnix = Number(o.order.expiry);
        if (expiryUnix > 0 && expiryUnix < now) {
          return { ...o, status: "expired" as const };
        }
      }
      return o;
    });

  // Sort: best price first per side. For now we just sort by createdAt desc.
  filtered.sort((a, b) => b.createdAt - a.createdAt);

  return NextResponse.json({ orders: filtered, count: filtered.length });
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
  const { order, signature, pair, chainId } = parsed.value;

  const dexAddress = SCENTDEX_V5_ADDRESS[chainId];
  if (!dexAddress) {
    return NextResponse.json(
      { error: `SCENTDEX V5 not deployed on chainId ${chainId}` },
      { status: 400 },
    );
  }

  // Reconstruct the bigint order for signature verification.
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
      // viem's generic infers the message shape from `types`, but our reified
      // order uses bigints which don't match the strict primitive inference.
      // The runtime check is correct; we only need to silence the static check.
      message: reified as unknown as Record<string, unknown>,
      signature,
    } as Parameters<typeof recoverTypedDataAddress>[0]);
  } catch (e) {
    return NextResponse.json(
      { error: `signature recovery failed: ${e instanceof Error ? e.message : String(e)}` },
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

  // Compute orderHash via the EIP-712 digest. We replay it via a structHash + domain
  // separator to use as the primary key. For Phase 3.3 we use the signature itself
  // as the unique identifier (always 65 bytes, always unique per signed order).
  const orderHash = signature; // placeholder primary key

  const store = getStore();
  if (store.has(orderHash)) {
    return NextResponse.json(
      { error: "order already submitted" },
      { status: 409 },
    );
  }

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
  };
  store.set(orderHash, stored);

  return NextResponse.json({ ok: true, order: stored }, { status: 201 });
}

// ---------- request body parsing ---------------------------------------------

type SubmitBody = {
  order: SerialisedOrder;
  signature: Hex;
  pair: string;
  chainId: number;
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
  for (const numField of [
    "makerAmount",
    "takerAmount",
    "expiry",
    "nonce",
  ]) {
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
  if (typeof o.salt !== "string" || !o.salt.startsWith("0x") || o.salt.length !== 66) {
    return { ok: false, error: "order.salt must be a 0x-prefixed 32-byte hex string" };
  }
  if (typeof o.feeBps !== "number" || o.feeBps < 0 || o.feeBps > 10000) {
    return { ok: false, error: "order.feeBps must be 0..10000" };
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
    },
  };
}
