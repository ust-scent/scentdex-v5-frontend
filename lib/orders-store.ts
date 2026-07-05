/**
 * SCENTDEX V5 — order book + reputation storage abstraction.
 *
 * Two backends, same interface:
 *   - Postgres (production / staging) — durable across restarts and deploys
 *   - In-memory Map (dev fallback)    — ephemeral, resets per process
 *
 * Pick the backend at first call based on whether `DATABASE_URL`/`POSTGRES_URL`
 * was set. The intent: when Alex provisions Vercel Postgres on the UST team,
 * the production deployment automatically picks it up; local dev keeps working
 * without a database.
 *
 * Maker reputation lives entirely in the `order_events` audit log. We compute
 * counts on demand rather than maintaining materialised aggregates — at 1k+
 * orders per maker per day the counting query is still <5ms with our indexes.
 */

import type { Address, Hex } from "viem";

import { isDbAvailable, query } from "@/lib/db";
import type { SerialisedPermitSingle } from "@/lib/permit2";

// ---------- shared shapes ----------------------------------------------------

export type OrderStatus =
  | "open"
  | "partially-filled"
  | "filled"
  | "cancelled"
  | "expired";

export type SerialisedOrder = {
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

export type StoredOrder = {
  orderHash: Hex;
  order: SerialisedOrder;
  signature: Hex;
  status: OrderStatus;
  filledMakerAmount: string;
  filledTakerAmount: string;
  pair: string;
  chainId: number;
  createdAt: number; // unix seconds — kept for API back-compat
  /**
   * Round-3: per-order Permit2 signature. Optional so legacy orders without
   * one (which rely on a standing wallet → Permit2 → DEX allowance) still
   * round-trip cleanly. New orders should always populate both fields.
   */
  permitSingle?: SerialisedPermitSingle;
  permitSignature?: Hex;
};

export type OrderEventType =
  | "created"
  | "cancelled"
  | "expired"
  | "filled"
  | "failed_fill";

export type MakerStats = {
  address: string; // lowercase
  totals: {
    created: number;
    cancelled: number;
    expired: number;
    filled: number;
    failedFill: number;
  };
  /** cancelled / created — 0..1, undefined when created==0. */
  cancelRate: number | undefined;
  /** filled / created — 0..1, undefined when created==0. */
  fillRate: number | undefined;
  /** failed_fill / (filled + failed_fill) — gas-waster metric. */
  failedFillRate: number | undefined;
  /** unix seconds of the last event we saw for this maker. */
  lastSeenAt: number | undefined;
  /** Whether the numbers come from durable storage. UI uses this to footnote. */
  durable: boolean;
};

// ---------- in-memory fallback -----------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __SCENTDEX_ORDERS__: Map<string, StoredOrder> | undefined;
  // eslint-disable-next-line no-var
  var __SCENTDEX_EVENTS__: Array<MemoryEvent> | undefined;
}

type MemoryEvent = {
  orderHash: string;
  maker: string;
  eventType: OrderEventType;
  at: number; // unix seconds
};

function memOrders(): Map<string, StoredOrder> {
  if (!globalThis.__SCENTDEX_ORDERS__) {
    globalThis.__SCENTDEX_ORDERS__ = new Map();
  }
  return globalThis.__SCENTDEX_ORDERS__;
}

function memEvents(): Array<MemoryEvent> {
  if (!globalThis.__SCENTDEX_EVENTS__) {
    globalThis.__SCENTDEX_EVENTS__ = [];
  }
  return globalThis.__SCENTDEX_EVENTS__;
}

// ---------- public API -------------------------------------------------------

export async function insertOrder(o: StoredOrder): Promise<void> {
  if (isDbAvailable()) {
    await query(
      `INSERT INTO orders (
         order_hash, maker, maker_token, taker_token,
         maker_amount, taker_amount, expiry, nonce, salt,
         fee_side, fee_bps, signature, pair, chain_id, status,
         permit_single_json, permit_signature
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'open',
         $15, $16
       ) ON CONFLICT (order_hash) DO NOTHING`,
      [
        o.orderHash,
        o.order.maker.toLowerCase(),
        o.order.makerToken.toLowerCase(),
        o.order.takerToken.toLowerCase(),
        o.order.makerAmount,
        o.order.takerAmount,
        Number(o.order.expiry),
        o.order.nonce,
        o.order.salt,
        o.order.feeSide.toLowerCase(),
        o.order.feeBps,
        o.signature,
        o.pair,
        o.chainId,
        o.permitSingle ? JSON.stringify(o.permitSingle) : null,
        o.permitSignature ?? null,
      ],
    );
    await recordEvent(o.orderHash, o.order.maker, "created");
    return;
  }

  // Memory backend
  memOrders().set(o.orderHash, o);
  memEvents().push({
    orderHash: o.orderHash,
    maker: o.order.maker.toLowerCase(),
    eventType: "created",
    at: Math.floor(Date.now() / 1000),
  });
}

export async function listOrders(filter: {
  pair?: string;
  chainId?: number;
  /**
   * When false (default), rows that the keeper-bot has flagged as
   * unfillable (`keeper_hidden = TRUE`) are filtered out, keeping
   * the public order book clean. Set to true from admin / debug
   * surfaces that need to see every row regardless of state.
   */
  includeKeeperHidden?: boolean;
}): Promise<StoredOrder[]> {
  const now = Math.floor(Date.now() / 1000);
  const includeKeeperHidden = filter.includeKeeperHidden === true;

  if (isDbAvailable()) {
    const result = await query<DbOrderRow>(
      `SELECT * FROM orders
        WHERE ($1::text IS NULL OR pair = $1)
          AND ($2::int  IS NULL OR chain_id = $2)
          AND ($3::bool OR keeper_hidden = FALSE)
        ORDER BY created_at DESC`,
      [filter.pair ?? null, filter.chainId ?? null, includeKeeperHidden],
    );

    const rows = result?.rows ?? [];
    const transitions: Array<Promise<unknown>> = [];

    const orders = rows.map((r) => {
      const o = rowToStored(r);
      // Lazy expiry transition: if the row is still 'open' but expiry has
      // passed, persist the transition + event so the audit log is right.
      if (
        (o.status === "open" || o.status === "partially-filled") &&
        Number(o.order.expiry) > 0 &&
        Number(o.order.expiry) < now
      ) {
        o.status = "expired";
        transitions.push(
          query(
            `UPDATE orders SET status='expired', updated_at=NOW()
              WHERE order_hash=$1 AND status IN ('open','partially-filled')`,
            [o.orderHash],
          ),
        );
        transitions.push(recordEvent(o.orderHash, o.order.maker, "expired"));
      }
      return o;
    });

    if (transitions.length > 0) await Promise.all(transitions);
    return orders;
  }

  // Memory backend — keeper_hidden lives on DB only; for the memory
  // fallback (local dev without Postgres) all rows are visible.
  const all = Array.from(memOrders().values());
  return all
    .filter((o) => (filter.pair ? o.pair === filter.pair : true))
    .filter((o) => (filter.chainId ? o.chainId === filter.chainId : true))
    .map((o) => {
      if (
        (o.status === "open" || o.status === "partially-filled") &&
        Number(o.order.expiry) > 0 &&
        Number(o.order.expiry) < now
      ) {
        o.status = "expired";
        memEvents().push({
          orderHash: o.orderHash,
          maker: o.order.maker.toLowerCase(),
          eventType: "expired",
          at: now,
        });
      }
      return o;
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function findOrder(orderHash: string): Promise<StoredOrder | null> {
  if (isDbAvailable()) {
    const result = await query<DbOrderRow>(
      `SELECT * FROM orders WHERE order_hash = $1 LIMIT 1`,
      [orderHash],
    );
    const row = result?.rows[0];
    return row ? rowToStored(row) : null;
  }
  return memOrders().get(orderHash) ?? null;
}

/** Token/amount shape needed to derive the last traded price of a pair. */
export type LastTrade = {
  makerToken: string;
  takerToken: string;
  makerAmount: string;
  takerAmount: string;
};

/**
 * The most recently FILLED (or partially-filled) order for a pair — its
 * unit price is the last traded price. `markFilled` bumps `updated_at` on
 * every fill, so ordering by it surfaces the latest trade even if it is
 * older than the 24h on-chain stats window (so the StatsBar price persists
 * instead of blanking to "—" on a quiet pair).
 */
export async function lastTrade(
  pair: string,
  chainId: number,
): Promise<LastTrade | null> {
  if (isDbAvailable()) {
    const result = await query<{
      maker_token: string;
      taker_token: string;
      maker_amount: string;
      taker_amount: string;
    }>(
      `SELECT maker_token, taker_token, maker_amount, taker_amount
         FROM orders
        WHERE pair = $1 AND chain_id = $2
          AND status IN ('filled','partially-filled')
        ORDER BY updated_at DESC
        LIMIT 1`,
      [pair, chainId],
    );
    const row = result?.rows[0];
    return row
      ? {
          makerToken: row.maker_token,
          takerToken: row.taker_token,
          makerAmount: row.maker_amount,
          takerAmount: row.taker_amount,
        }
      : null;
  }
  // Memory backend (local dev): no updated_at, approximate by createdAt.
  const filled = Array.from(memOrders().values())
    .filter(
      (o) =>
        o.pair === pair &&
        o.chainId === chainId &&
        (o.status === "filled" || o.status === "partially-filled"),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  const o = filled[0];
  return o
    ? {
        makerToken: o.order.makerToken,
        takerToken: o.order.takerToken,
        makerAmount: o.order.makerAmount,
        takerAmount: o.order.takerAmount,
      }
    : null;
}

/**
 * Off-chain cancel: marks the order cancelled and records a `cancelled` event.
 * The taker side will see the order disappear on the next /api/orders read.
 *
 * The maker's signature is still floating around — anyone who has it cached
 * could in theory submit it on-chain before our indexer marks it cancelled,
 * and the contract would happily fill it (because it doesn't know about our
 * off-chain cancel). For ironclad cancellation the maker must call
 * cancelOrder() on V5 (which costs gas but emits OrderCancelled and prevents
 * any future fill). Surface that affordance in the UI for high-value orders.
 */
export async function cancelOrder(orderHash: string): Promise<boolean> {
  if (isDbAvailable()) {
    const result = await query<DbOrderRow>(
      `UPDATE orders
          SET status='cancelled', updated_at=NOW()
        WHERE order_hash=$1
          AND status IN ('open','partially-filled')
        RETURNING *`,
      [orderHash],
    );
    const row = result?.rows[0];
    if (!row) return false;
    await recordEvent(row.order_hash, row.maker, "cancelled");
    return true;
  }

  const o = memOrders().get(orderHash);
  if (!o) return false;
  if (o.status !== "open" && o.status !== "partially-filled") return false;
  o.status = "cancelled";
  memEvents().push({
    orderHash: o.orderHash,
    maker: o.order.maker.toLowerCase(),
    eventType: "cancelled",
    at: Math.floor(Date.now() / 1000),
  });
  return true;
}

/**
 * Off-chain mirror of a successful on-chain OrderFilled event.
 *
 * The caller (POST /api/orders/[hash]/filled) has already verified that the
 * provided txHash is a real fillOrder tx on the chain we expect and that the
 * OrderFilled log under it carries the right orderHash + fill amounts. So
 * this function just commits the consequence to our off-chain book:
 *
 *   - increment filled_maker_amount / filled_taker_amount
 *   - flip status to 'filled' (full) or 'partially-filled' (residue left)
 *   - append a 'filled' row to order_events with the chain tx hash
 *
 * Idempotent: if order_events already has a 'filled' row for the same
 * (order_hash, chain_tx_hash), we skip the whole mutation. That keeps a
 * client retry, or two browser tabs racing the same receipt, from
 * double-counting the fill.
 *
 * Returns the post-mutation status so the API layer can echo it back to
 * the UI. Returns `{ ok: false }` when the order can't be advanced (already
 * cancelled / expired / fully filled, or order not found).
 */
export async function markFilled(
  orderHash: string,
  fillMakerAmount: bigint,
  fillTakerAmount: bigint,
  chainTxHash: string,
  blockNumber: number,
): Promise<
  { ok: true; status: OrderStatus; alreadyApplied: boolean }
  | { ok: false; reason: string }
> {
  if (isDbAvailable()) {
    // Idempotency: have we already recorded THIS exact (orderHash, txHash) fill?
    const seen = await query<{ id: string }>(
      `SELECT id FROM order_events
        WHERE order_hash = $1
          AND event_type = 'filled'
          AND chain_tx_hash = $2
        LIMIT 1`,
      [orderHash, chainTxHash.toLowerCase()],
    );
    if (seen?.rows[0]) {
      const cur = await query<DbOrderRow>(
        `SELECT * FROM orders WHERE order_hash = $1 LIMIT 1`,
        [orderHash],
      );
      const row = cur?.rows[0];
      if (!row) return { ok: false, reason: "order not found" };
      return { ok: true, status: row.status, alreadyApplied: true };
    }

    // Update order row inside one statement. The CASE chooses partial vs full
    // based on the post-increment cumulative against maker_amount.
    const result = await query<DbOrderRow>(
      `UPDATE orders
          SET filled_maker_amount = filled_maker_amount + $2::numeric,
              filled_taker_amount = filled_taker_amount + $3::numeric,
              status = CASE
                WHEN filled_maker_amount + $2::numeric >= maker_amount THEN 'filled'
                ELSE 'partially-filled'
              END,
              updated_at = NOW()
        WHERE order_hash = $1
          AND status IN ('open','partially-filled')
        RETURNING *`,
      [orderHash, fillMakerAmount.toString(), fillTakerAmount.toString()],
    );
    const row = result?.rows[0];
    if (!row) {
      return {
        ok: false,
        reason: "order is not in a fillable state (already cancelled/expired/filled?)",
      };
    }
    await recordEvent(row.order_hash, row.maker, "filled", {
      chainTxHash: chainTxHash.toLowerCase(),
      blockNumber,
      extra: {
        fillMakerAmount: fillMakerAmount.toString(),
        fillTakerAmount: fillTakerAmount.toString(),
      },
    });
    return { ok: true, status: row.status, alreadyApplied: false };
  }

  // Memory backend
  const o = memOrders().get(orderHash);
  if (!o) return { ok: false, reason: "order not found" };
  if (o.status !== "open" && o.status !== "partially-filled") {
    return { ok: false, reason: `order is ${o.status}` };
  }
  const already = memEvents().some(
    (e) =>
      e.orderHash === orderHash &&
      e.eventType === "filled" &&
      // Memory backend doesn't carry chain_tx_hash today; this branch is
      // strictly dev-fallback so the looser identity check is fine.
      false,
  );
  if (already) {
    return { ok: true, status: o.status, alreadyApplied: true };
  }
  const newFilledMaker = BigInt(o.filledMakerAmount) + fillMakerAmount;
  const newFilledTaker = BigInt(o.filledTakerAmount) + fillTakerAmount;
  const makerCap = BigInt(o.order.makerAmount);
  o.filledMakerAmount = newFilledMaker.toString();
  o.filledTakerAmount = newFilledTaker.toString();
  o.status = newFilledMaker >= makerCap ? "filled" : "partially-filled";
  memEvents().push({
    orderHash: o.orderHash,
    maker: o.order.maker.toLowerCase(),
    eventType: "filled",
    at: Math.floor(Date.now() / 1000),
  });
  return { ok: true, status: o.status, alreadyApplied: false };
}

export async function recordEvent(
  orderHash: string,
  maker: string,
  eventType: OrderEventType,
  meta?: { chainTxHash?: string; blockNumber?: number; extra?: object },
): Promise<void> {
  if (isDbAvailable()) {
    await query(
      `INSERT INTO order_events (order_hash, maker, event_type, chain_tx_hash, block_number, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        orderHash,
        maker.toLowerCase(),
        eventType,
        meta?.chainTxHash ?? null,
        meta?.blockNumber ?? null,
        meta?.extra ? JSON.stringify(meta.extra) : null,
      ],
    );
    return;
  }
  memEvents().push({
    orderHash,
    maker: maker.toLowerCase(),
    eventType,
    at: Math.floor(Date.now() / 1000),
  });
}

export async function getMakerStats(address: string): Promise<MakerStats> {
  const lower = address.toLowerCase();
  if (isDbAvailable()) {
    const result = await query<{
      event_type: string;
      n: string;
      last_at: Date | null;
    }>(
      `SELECT event_type, COUNT(*)::text AS n, MAX(at) AS last_at
         FROM order_events WHERE maker = $1 GROUP BY event_type`,
      [lower],
    );
    const rows = result?.rows ?? [];
    return summariseRows(lower, rows, true);
  }

  // Memory backend
  const events = memEvents().filter((e) => e.maker === lower);
  const grouped = new Map<string, { n: number; lastAt: number }>();
  for (const e of events) {
    const cur = grouped.get(e.eventType) ?? { n: 0, lastAt: 0 };
    cur.n++;
    if (e.at > cur.lastAt) cur.lastAt = e.at;
    grouped.set(e.eventType, cur);
  }
  const rowsLike = Array.from(grouped.entries()).map(([event_type, v]) => ({
    event_type,
    n: String(v.n),
    last_at: v.lastAt > 0 ? new Date(v.lastAt * 1000) : null,
  }));
  return summariseRows(lower, rowsLike, false);
}

// ---------- internal helpers -------------------------------------------------

type DbOrderRow = {
  order_hash: string;
  maker: string;
  maker_token: string;
  taker_token: string;
  maker_amount: string;
  taker_amount: string;
  expiry: string | number;
  nonce: string;
  salt: string;
  fee_side: string;
  fee_bps: number;
  signature: string;
  pair: string;
  chain_id: number;
  status: OrderStatus;
  filled_maker_amount: string;
  filled_taker_amount: string;
  permit_single_json: SerialisedPermitSingle | string | null;
  permit_signature: string | null;
  created_at: Date;
  updated_at: Date;
};

function rowToStored(r: DbOrderRow): StoredOrder {
  // node-postgres returns JSONB columns as already-parsed objects in most
  // configs, but some drivers (or older versions) hand back the raw JSON
  // string. Handle both cleanly so we never crash on a Postgres rebuild.
  let permitSingle: SerialisedPermitSingle | undefined;
  if (r.permit_single_json) {
    permitSingle =
      typeof r.permit_single_json === "string"
        ? (JSON.parse(r.permit_single_json) as SerialisedPermitSingle)
        : r.permit_single_json;
  }

  return {
    orderHash: r.order_hash as Hex,
    signature: r.signature as Hex,
    status: r.status,
    filledMakerAmount: r.filled_maker_amount,
    filledTakerAmount: r.filled_taker_amount,
    pair: r.pair,
    chainId: r.chain_id,
    createdAt: Math.floor(new Date(r.created_at).getTime() / 1000),
    order: {
      maker: r.maker as Address,
      makerToken: r.maker_token as Address,
      takerToken: r.taker_token as Address,
      makerAmount: r.maker_amount,
      takerAmount: r.taker_amount,
      expiry: String(r.expiry),
      nonce: r.nonce,
      salt: r.salt as Hex,
      feeSide: r.fee_side as Address,
      feeBps: r.fee_bps,
    },
    permitSingle,
    permitSignature: (r.permit_signature ?? undefined) as Hex | undefined,
  };
}

function summariseRows(
  address: string,
  rows: Array<{ event_type: string; n: string; last_at: Date | null }>,
  durable: boolean,
): MakerStats {
  const totals = {
    created: 0,
    cancelled: 0,
    expired: 0,
    filled: 0,
    failedFill: 0,
  };
  let lastSeenAt: number | undefined;

  for (const r of rows) {
    const n = Number(r.n);
    switch (r.event_type) {
      case "created":
        totals.created = n;
        break;
      case "cancelled":
        totals.cancelled = n;
        break;
      case "expired":
        totals.expired = n;
        break;
      case "filled":
        totals.filled = n;
        break;
      case "failed_fill":
        totals.failedFill = n;
        break;
    }
    if (r.last_at) {
      const ts = Math.floor(r.last_at.getTime() / 1000);
      if (lastSeenAt === undefined || ts > lastSeenAt) lastSeenAt = ts;
    }
  }

  const cancelRate =
    totals.created > 0 ? totals.cancelled / totals.created : undefined;
  const fillRate =
    totals.created > 0 ? totals.filled / totals.created : undefined;
  const fillsAttempted = totals.filled + totals.failedFill;
  const failedFillRate =
    fillsAttempted > 0 ? totals.failedFill / fillsAttempted : undefined;

  return {
    address,
    totals,
    cancelRate,
    fillRate,
    failedFillRate,
    lastSeenAt,
    durable,
  };
}
