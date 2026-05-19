#!/usr/bin/env node
// Keeper-bot Phase 1 for SCENTDEX V6 (mainnet).
//
// Read-only daemon that rescans every open / partially-filled order on
// a 30 s cadence and toggles `orders.keeper_hidden` in Postgres when an
// on-chain precondition has fallen out from under a signed order. The
// public /api/orders GET filters those rows by default, so the order
// book stays clean without the bot sending a single transaction.
//
// Decision codes (recorded as keeper_reason):
//   dead_expired         — order.expiry < now
//   dead_filled          — filledMakerAmount(orderHash) >= makerAmount
//   dead_cancelled       — cancelled(orderHash) == true on-chain
//   dead_no_balance      — maker's ERC20 balance < remaining
//   dead_no_allowance    — maker's ERC20 → Permit2 allowance < remaining
//   dead_nonce_consumed  — Permit2.allowance(maker, token, DEX).nonce !=
//                          signed permitSingle.details.nonce
//
// Flags:
//   --dry-run    Read-only mode. Logs every decision but does not write
//                to the database. Exits after one pass. Used for local
//                verification before pointing at production data.
//
// Env:
//   DATABASE_URL / POSTGRES_URL   Required. Neon Postgres connection URL.
//   MAINNET_RPC_URL               Optional. Falls back to publicnode.

import process from "node:process";
import pg from "pg";
import { createPublicClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";

const DRY_RUN = process.argv.includes("--dry-run");
const SCAN_INTERVAL_MS = Number(process.env.SCAN_INTERVAL_MS) || 300_000;
const CHAIN_ID = 1;
const DEX_ADDRESS = "0x9962584c755f943f2c29dF190dA97008db216D16";
const PERMIT2_ADDRESS = "0x000000000022D473030F116dDEE9F6B43aC78BA3";

const RPC_URL =
  process.env.MAINNET_RPC_URL || "https://ethereum-rpc.publicnode.com";

const DB_URL = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
if (!DB_URL) {
  console.error("[keeper] DATABASE_URL / POSTGRES_URL not set, aborting.");
  process.exit(1);
}

// Inline ABI fragments. Selectors are keccak-derived from the signatures
// here, so they must match the on-chain function / auto-getter names
// exactly — `filledMakerAmount` and `cancelled` are the Solidity
// public-mapping getters on ScentDexV6 (mappings declared at L436 / L446).
const ERC20 = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address,address) view returns (uint256)",
]);
const PERMIT2 = parseAbi([
  "function allowance(address,address,address) view returns (uint160,uint48,uint48)",
]);
const DEX = parseAbi([
  "function filledMakerAmount(bytes32) view returns (uint256)",
  "function cancelled(bytes32) view returns (bool)",
]);

const ssl =
  /sslmode=(?!disable)/.test(DB_URL) ||
  /supabase|neon|vercel|amazonaws/.test(DB_URL)
    ? { rejectUnauthorized: false }
    : undefined;

const pool = new pg.Pool({ connectionString: DB_URL, ssl, max: 5 });

const client = createPublicClient({
  chain: mainnet,
  transport: http(RPC_URL),
  batch: { multicall: true },
});

let stop = false;
process.on("SIGINT", () => {
  console.log("[keeper] SIGINT received, draining...");
  stop = true;
});
process.on("SIGTERM", () => {
  console.log("[keeper] SIGTERM received, draining...");
  stop = true;
});

async function fetchOpenOrders() {
  const r = await pool.query(
    `SELECT order_hash, maker, maker_token, maker_amount, expiry,
            filled_maker_amount, status, permit_single_json, keeper_hidden,
            keeper_reason
       FROM orders
      WHERE chain_id = $1
        AND status IN ('open','partially-filled')
      ORDER BY created_at DESC`,
    [CHAIN_ID],
  );
  return r.rows;
}

async function decideForOrder(o) {
  const orderHash = o.order_hash;
  const maker = o.maker;
  const makerToken = o.maker_token;
  const makerAmount = BigInt(o.maker_amount);
  const filledMaker = BigInt(o.filled_maker_amount ?? "0");
  const remaining =
    makerAmount > filledMaker ? makerAmount - filledMaker : 0n;
  const expiry = BigInt(o.expiry ?? "0");
  const now = BigInt(Math.floor(Date.now() / 1000));

  if (expiry > 0n && expiry < now) return "dead_expired";

  const signedNonceRaw = o.permit_single_json?.details?.nonce;
  const signedNonce =
    signedNonceRaw === undefined || signedNonceRaw === null
      ? null
      : BigInt(signedNonceRaw);

  // 5 on-chain reads in parallel (multicall transport batches them).
  const [filledOnChain, isCancelled, balance, erc20Allowance, permit2Tuple] =
    await Promise.all([
      client.readContract({
        address: DEX_ADDRESS,
        abi: DEX,
        functionName: "filledMakerAmount",
        args: [orderHash],
      }),
      client.readContract({
        address: DEX_ADDRESS,
        abi: DEX,
        functionName: "cancelled",
        args: [orderHash],
      }),
      client.readContract({
        address: makerToken,
        abi: ERC20,
        functionName: "balanceOf",
        args: [maker],
      }),
      client.readContract({
        address: makerToken,
        abi: ERC20,
        functionName: "allowance",
        args: [maker, PERMIT2_ADDRESS],
      }),
      client.readContract({
        address: PERMIT2_ADDRESS,
        abi: PERMIT2,
        functionName: "allowance",
        args: [maker, makerToken, DEX_ADDRESS],
      }),
    ]);

  if (filledOnChain >= makerAmount) return "dead_filled";
  if (isCancelled) return "dead_cancelled";
  if (balance < remaining) return "dead_no_balance";
  if (erc20Allowance < remaining) return "dead_no_allowance";

  const onChainNonce = BigInt(permit2Tuple[2]);
  if (signedNonce !== null && signedNonce !== onChainNonce) {
    return "dead_nonce_consumed";
  }

  return null;
}

async function cycle() {
  const t0 = Date.now();
  const orders = await fetchOpenOrders();
  let scanned = 0;
  let hidden = 0;
  let restored = 0;

  for (const o of orders) {
    try {
      const reason = await decideForOrder(o);
      const newHidden = reason !== null;
      const wasHidden = Boolean(o.keeper_hidden);
      scanned++;

      if (DRY_RUN) {
        console.log(
          `[keeper] dry-run  ${o.order_hash.slice(0, 10)}…  was=${wasHidden}/${o.keeper_reason ?? "-"}  → now=${newHidden}/${reason ?? "-"}`,
        );
        if (newHidden && !wasHidden) hidden++;
        else if (!newHidden && wasHidden) restored++;
        continue;
      }

      if (newHidden && !wasHidden) {
        await pool.query(
          `UPDATE orders
              SET keeper_hidden=TRUE,
                  keeper_reason=$2,
                  keeper_checked_at=NOW()
            WHERE order_hash=$1`,
          [o.order_hash, reason],
        );
        hidden++;
      } else if (!newHidden && wasHidden) {
        await pool.query(
          `UPDATE orders
              SET keeper_hidden=FALSE,
                  keeper_reason=NULL,
                  keeper_checked_at=NOW()
            WHERE order_hash=$1`,
          [o.order_hash],
        );
        restored++;
      } else {
        await pool.query(
          `UPDATE orders SET keeper_checked_at=NOW() WHERE order_hash=$1`,
          [o.order_hash],
        );
      }
    } catch (e) {
      console.error(
        `[keeper] scan error ${o.order_hash.slice(0, 10)}…: ${e.message ?? e}`,
      );
    }
  }

  const ms = Date.now() - t0;
  console.log(
    `[keeper] scanned: ${scanned}, hidden: ${hidden}, restored: ${restored}, ms: ${ms}${DRY_RUN ? " (dry-run)" : ""}`,
  );
}

async function main() {
  console.log(
    `[keeper] starting  chainId=${CHAIN_ID}  DEX=${DEX_ADDRESS}  rpc=${RPC_URL}  dryRun=${DRY_RUN}`,
  );
  try {
    while (!stop) {
      await cycle();
      if (DRY_RUN) break;
      await new Promise((r) => setTimeout(r, SCAN_INTERVAL_MS));
    }
  } finally {
    await pool.end();
    console.log("[keeper] shutdown complete");
  }
}

main().catch(async (e) => {
  console.error("[keeper] fatal:", e);
  try {
    await pool.end();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
