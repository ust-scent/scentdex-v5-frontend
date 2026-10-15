#!/usr/bin/env node
// Idempotent migration that brings an existing SCENTDEX V5 / V6 deployment
// up to the keeper-bot Phase-1 schema. Adds three columns + one index to
// the `orders` table; safe to re-run because every statement uses
// `IF NOT EXISTS`.
//
// Usage (any env that exposes DATABASE_URL or POSTGRES_URL):
//   npm run migrate:keeper
//   # or
//   node scripts/migrate-keeper-flags.mjs

import process from "node:process";
import pg from "pg";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!url) {
  console.error(
    "[migrate-keeper-flags] DATABASE_URL / POSTGRES_URL is not set. Aborting.",
  );
  process.exit(1);
}

const ssl =
  /sslmode=(?!disable)/.test(url) ||
  /supabase|neon|vercel|amazonaws/.test(url)
    ? { rejectUnauthorized: false }
    : undefined;

const client = new pg.Client({ connectionString: url, ssl });

async function listKeeperColumns() {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_name = 'orders'
        AND column_name IN
            ('keeper_hidden','keeper_reason','keeper_checked_at')
      ORDER BY column_name`,
  );
  return r.rows.map((row) => row.column_name);
}

async function main() {
  await client.connect();
  try {
    const before = await listKeeperColumns();
    console.log("[migrate-keeper-flags] keeper columns BEFORE:", before);

    await client.query(`
      ALTER TABLE orders
        ADD COLUMN IF NOT EXISTS keeper_hidden     BOOLEAN NOT NULL DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS keeper_reason     TEXT,
        ADD COLUMN IF NOT EXISTS keeper_checked_at TIMESTAMPTZ
    `);
    console.log("[migrate-keeper-flags] ALTER TABLE applied");

    await client.query(`
      CREATE INDEX IF NOT EXISTS orders_keeper_hidden_idx
        ON orders (keeper_hidden)
    `);
    console.log("[migrate-keeper-flags] CREATE INDEX applied");

    const after = await listKeeperColumns();
    console.log("[migrate-keeper-flags] keeper columns AFTER :", after);
    console.log("[migrate-keeper-flags] done");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("[migrate-keeper-flags] failed:", e);
  process.exit(1);
});
