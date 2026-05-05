/**
 * Postgres connection helper for SCENTDEX V5.
 *
 * The off-chain order book and reputation tracker (Phase 3.5) live here.
 * The chain itself remains the source of truth for fills/cancels — this DB
 * is a cache/index that the front-end can query in milliseconds.
 *
 * Connection string priority (first hit wins):
 *   DATABASE_URL → POSTGRES_URL (Vercel Postgres integration)
 *
 * If neither is set, `getPool()` returns null and callers fall back to the
 * in-memory store (`lib/orders-store.ts`). That keeps local dev runnable
 * without provisioning a database, while production picks up the auto-
 * injected env from the Vercel/Neon integration.
 */

import { Pool, type QueryResult, type QueryResultRow } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __SCENTDEX_PG_POOL__: Pool | null | undefined;
}

function resolveConnectionString(): string | null {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

function buildPool(connectionString: string): Pool {
  // Many managed providers (Vercel Postgres / Neon / Supabase) require TLS.
  // Pull SSL from the URL when present, otherwise default to permissive
  // verification to keep dev painless. Production providers terminate at the
  // load balancer with valid certs anyway.
  const ssl =
    /sslmode=(?!disable)/.test(connectionString) ||
    /supabase|neon|vercel|amazonaws/.test(connectionString)
      ? { rejectUnauthorized: false }
      : undefined;

  return new Pool({
    connectionString,
    ssl,
    max: 5,
    idleTimeoutMillis: 30_000,
  });
}

export function getPool(): Pool | null {
  if (globalThis.__SCENTDEX_PG_POOL__ !== undefined) {
    return globalThis.__SCENTDEX_PG_POOL__;
  }
  const url = resolveConnectionString();
  if (!url) {
    globalThis.__SCENTDEX_PG_POOL__ = null;
    return null;
  }
  globalThis.__SCENTDEX_PG_POOL__ = buildPool(url);
  return globalThis.__SCENTDEX_PG_POOL__;
}

export function isDbAvailable(): boolean {
  return getPool() !== null;
}

export async function query<T extends QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T> | null> {
  const pool = getPool();
  if (!pool) return null;
  return pool.query<T>(text, params as unknown as unknown[]);
}
