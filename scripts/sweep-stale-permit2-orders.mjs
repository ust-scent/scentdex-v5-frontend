/**
 * Sweep open orders whose embedded Permit2 PermitSingle.details.nonce no
 * longer matches the on-chain Permit2.allowance(maker, makerToken, DEX).nonce.
 *
 * Why this exists: until commit <permit2-nonce-fix>, PlaceOrder.tsx was
 * feeding `buildOrderPermit({ ownerNonce })` from a wagmi useReadContract
 * cache that never auto-refetched. So once any of a maker's prior orders
 * on the same token got filled, the cached nonce went stale, and every
 * subsequent order embedded the OLD nonce. Those orders are zombies —
 * AllowanceTransfer.permit() inside _fillOrder reverts InvalidNonce at
 * fill time and the taker eats the gas.
 *
 * This script walks every `status='open'` row, asks the chain what the
 * Permit2 nonce should be, and if there's a mismatch:
 *   1. UPDATE orders SET status='cancelled'
 *   2. INSERT order_events (event_type='cancelled', meta=<reason>)
 *
 * The order is now gone from the book. The maker can re-sign cleanly with
 * the fixed PlaceOrder code.
 *
 * Run with WIPE_CONFIRM=YES; defaults to dry-run so an accidental
 * invocation just prints what it WOULD do.
 *
 *   DATABASE_URL=...  npx node scripts/sweep-stale-permit2-orders.mjs                # dry run
 *   DATABASE_URL=...  WIPE_CONFIRM=YES npx node scripts/sweep-stale-permit2-orders.mjs # actually mutate
 *
 * SEPOLIA_RPC_URL is optional; defaults to publicnode.
 */

import { Client } from "pg";
import { createPublicClient, http } from "viem";
import { sepolia, mainnet } from "viem/chains";

const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const DEX_BY_CHAIN = {
  11155111: "0x42349e93B90c69536Ab8a2cc5C55b3cd14872395", // Sepolia (1-min timelock build)
};

const PERMIT2_ABI = [
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { type: "address" },
      { type: "address" },
      { type: "address" },
    ],
    outputs: [
      { name: "amount", type: "uint160" },
      { name: "expiration", type: "uint48" },
      { name: "nonce", type: "uint48" },
    ],
  },
];

const DRY_RUN = process.env.WIPE_CONFIRM !== "YES";

const url =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL_UNPOOLED ||
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL;
if (!url) {
  console.error("no postgres url found in env (POSTGRES_URL / DATABASE_URL)");
  process.exit(2);
}

const sepoliaRpc =
  process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia-rpc.publicnode.com";
const mainnetRpc = process.env.MAINNET_RPC_URL;

function clientFor(chainId) {
  if (chainId === 11155111) {
    return createPublicClient({ chain: sepolia, transport: http(sepoliaRpc) });
  }
  if (chainId === 1 && mainnetRpc) {
    return createPublicClient({ chain: mainnet, transport: http(mainnetRpc) });
  }
  return null;
}

const pg = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await pg.connect();
console.log(`connected — ${DRY_RUN ? "DRY RUN" : "WILL MUTATE"} mode`);

const { rows: open } = await pg.query(
  `SELECT order_hash, maker, maker_token, pair, chain_id, permit_single_json
     FROM orders
    WHERE status = 'open'
      AND permit_single_json IS NOT NULL`,
);
console.log(`open orders with PermitSingle: ${open.length}`);

let stale = 0;
let healthy = 0;
let skipped = 0;
let dexUnknown = 0;
const staleHashes = [];

for (const row of open) {
  const client = clientFor(row.chain_id);
  if (!client) {
    skipped++;
    continue;
  }
  const dex = DEX_BY_CHAIN[row.chain_id];
  if (!dex) {
    dexUnknown++;
    continue;
  }

  const embeddedNonce = Number(row.permit_single_json?.details?.nonce);
  if (!Number.isFinite(embeddedNonce)) {
    skipped++;
    continue;
  }

  let onchainNonce;
  try {
    const allowance = await client.readContract({
      address: PERMIT2_ADDRESS,
      abi: PERMIT2_ABI,
      functionName: "allowance",
      args: [row.maker, row.maker_token, dex],
    });
    onchainNonce = Number(allowance[2]);
  } catch (e) {
    console.warn(
      `  RPC error for ${row.order_hash.slice(0, 10)}…:`,
      e?.shortMessage || e?.message || String(e),
    );
    skipped++;
    continue;
  }

  if (embeddedNonce === onchainNonce) {
    healthy++;
    continue;
  }

  stale++;
  staleHashes.push(row.order_hash);
  console.log(
    `  STALE ${row.order_hash.slice(0, 10)}… pair=${row.pair} maker=${row.maker.slice(0, 10)}… embedded=${embeddedNonce} onchain=${onchainNonce}`,
  );
}

console.log("");
console.log(
  `summary: healthy=${healthy} stale=${stale} skipped=${skipped} dex_unknown=${dexUnknown}`,
);

if (!DRY_RUN && stale > 0) {
  console.log("\napplying status=cancelled to stale orders...");
  await pg.query("BEGIN");
  try {
    for (const hash of staleHashes) {
      await pg.query(
        `UPDATE orders
            SET status='cancelled', updated_at = NOW()
          WHERE order_hash = $1
            AND status = 'open'`,
        [hash],
      );
      await pg.query(
        `INSERT INTO order_events (order_hash, maker, event_type, meta)
           SELECT order_hash, maker, 'cancelled',
                  jsonb_build_object('reason', 'permit2_nonce_stale')
             FROM orders
            WHERE order_hash = $1`,
        [hash],
      );
    }
    await pg.query("COMMIT");
    console.log(`done — ${stale} orders moved to cancelled`);
  } catch (e) {
    await pg.query("ROLLBACK");
    console.error("rolled back:", e);
    process.exit(1);
  }
} else if (DRY_RUN) {
  console.log("\nDRY RUN — set WIPE_CONFIRM=YES to actually mutate the DB.");
}

await pg.end();
