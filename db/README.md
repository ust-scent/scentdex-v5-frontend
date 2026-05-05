# SCENTDEX V5 — Database setup

The off-chain order book and maker reputation system (Phase 3.5) need a Postgres database. The app code in `lib/db.ts` automatically falls back to in-memory storage when no `DATABASE_URL` is set — local dev keeps working, but the data resets on every restart and won't be visible across Vercel's serverless cold starts.

## What you need

- A Postgres database (any provider: Vercel Postgres / Neon / Supabase / Docker / RDS)
- The schema in `db/schema.sql` applied to it
- The connection string available as `DATABASE_URL` (or `POSTGRES_URL`) in the runtime env

## Recommended: Vercel Postgres on the UST team

Keeps everything inside the same legal entity (no Horizon resources touched), and Vercel auto-injects the env vars at deploy time so production "just works".

```sh
# In the Vercel dashboard, on the ust-scent team:
#   1. Storage → Create → Postgres
#   2. Connect to the scentdex-v5-frontend project
#   3. Vercel injects DATABASE_URL / POSTGRES_URL automatically
#
# To pull the production env locally (for dev that hits the real DB):
vercel link              # one-time, picks the ust-scent team / scentdex-v5-frontend project
vercel env pull .env.local

# Apply the schema (psql comes with brew install libpq, then `brew link --force libpq`)
psql "$(grep ^DATABASE_URL .env.local | cut -d= -f2- | tr -d '"')" -f db/schema.sql
```

## Alternative: local Postgres via Docker

```sh
docker run --name scentdex-pg -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:16
echo 'DATABASE_URL=postgres://postgres:dev@localhost:5432/postgres' >> .env.local
psql "$DATABASE_URL" -f db/schema.sql
```

## What lives in the DB

| Table         | Purpose                                                                      |
|---------------|------------------------------------------------------------------------------|
| `orders`      | Current state of every signed order (status, fills, expiry).                 |
| `order_events`| Append-only audit log used to compute maker reputation (cancel rate, fill rate, failed-fill rate). |

Schema lives in `db/schema.sql` — re-run it any time, all statements use `IF NOT EXISTS`.

## What's still missing (Phase 3.5b)

- **On-chain event indexer** — a serverless cron that watches V5's `OrderFilled` and `OrderCancelled` events and records `filled` / `cancelled` rows in `order_events`. Without it, the only events we see are the off-chain ones (POST /api/orders, POST /api/orders/[hash]/cancel).
- **Failed-fill tracking** — needs taker-side instrumentation: when a taker's fill tx reverts, the UI should POST to `/api/orders/[hash]/failed-fill` so reputation reflects "this maker burns gas". TBD how to authenticate (the receipt itself plus a server-side replay against the RPC is one option).
