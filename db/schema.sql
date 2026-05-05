-- SCENTDEX V5 — off-chain order book + reputation schema (Phase 3.5)
--
-- Two tables:
--   orders         current state of every signed order ever submitted
--   order_events   append-only audit log used to compute maker reputation
--
-- All amounts are stored as NUMERIC(78, 0) to fit a uint256 exactly.
-- Addresses are stored lowercase to make joins/aggregates straightforward.
-- The chain itself remains the source of truth — this DB is a cache built
-- from POSTs (off-chain submission) plus an indexer that watches contract
-- events (Phase 3.5b).
--
-- Apply locally:    psql "$DATABASE_URL" -f db/schema.sql
-- Apply on Vercel:  pull the env then run the same psql command.

CREATE TABLE IF NOT EXISTS orders (
  order_hash             TEXT PRIMARY KEY,
  maker                  TEXT NOT NULL,
  maker_token            TEXT NOT NULL,
  taker_token            TEXT NOT NULL,
  maker_amount           NUMERIC(78, 0) NOT NULL,
  taker_amount           NUMERIC(78, 0) NOT NULL,
  expiry                 BIGINT NOT NULL,
  nonce                  NUMERIC(78, 0) NOT NULL,
  salt                   TEXT NOT NULL,
  fee_side               TEXT NOT NULL,
  fee_bps                INTEGER NOT NULL,
  signature              TEXT NOT NULL,
  pair                   TEXT NOT NULL,
  chain_id               INTEGER NOT NULL,
  status                 TEXT NOT NULL
                         CHECK (status IN ('open','partially-filled','filled','cancelled','expired')),
  filled_maker_amount    NUMERIC(78, 0) NOT NULL DEFAULT 0,
  filled_taker_amount    NUMERIC(78, 0) NOT NULL DEFAULT 0,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS orders_pair_status_idx
  ON orders (pair, status);

CREATE INDEX IF NOT EXISTS orders_maker_idx
  ON orders (maker);

-- Append-only audit log. One row per state transition.
-- event_type values:
--   created       maker submitted a signed order
--   cancelled     maker cancelled (off-chain or via on-chain cancelOrder)
--   expired       expiry passed without a fill
--   filled        OrderFilled emitted on chain (full or partial)
--   failed_fill   a taker submitted fill but tx reverted (gas wasted by taker)
CREATE TABLE IF NOT EXISTS order_events (
  id              BIGSERIAL PRIMARY KEY,
  order_hash      TEXT NOT NULL,
  maker           TEXT NOT NULL,
  event_type      TEXT NOT NULL
                  CHECK (event_type IN ('created','cancelled','expired','filled','failed_fill')),
  chain_tx_hash   TEXT,
  block_number    BIGINT,
  meta            JSONB,
  at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS order_events_maker_type_idx
  ON order_events (maker, event_type);

CREATE INDEX IF NOT EXISTS order_events_order_hash_idx
  ON order_events (order_hash);
