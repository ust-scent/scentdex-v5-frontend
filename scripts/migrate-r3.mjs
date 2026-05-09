import { readFileSync } from "node:fs";
import { Client } from "pg";

const url = process.env.POSTGRES_URL_NON_POOLING || process.env.DATABASE_URL_UNPOOLED || process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("no postgres url found");
  process.exit(2);
}

// Resolve the schema relative to repo root, not the script's own dir.
const schemaPath = new URL("../db/schema.sql", import.meta.url);
const sql = readFileSync(schemaPath, "utf8");

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log("connected");

await client.query(sql);
console.log("schema applied");

const r = await client.query(
  `SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'orders'
      AND column_name IN ('permit_single_json', 'permit_signature')
    ORDER BY column_name`,
);
console.log("round-3 columns:");
for (const row of r.rows) console.log("  -", row.column_name, "(" + row.data_type + ")");

const c = await client.query(`SELECT count(*)::int AS n FROM orders`);
console.log("orders row count:", c.rows[0].n);

await client.end();
console.log("done");
