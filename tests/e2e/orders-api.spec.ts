import { expect, test } from "@playwright/test";

import { MAKER, buildSignedOrderBody } from "./support/orders";

/**
 * /api/orders contract — API-only (no browser, no RPC).
 *
 *  - OC-01: signatures are returned only for live rows. A cancelled row
 *    comes back without `signature` / `permitSignature`, including under
 *    ?includeHidden=true.
 *  - Price limits: POST rejects orders outside the contract's
 *    maxPriceRatio / minTakerAmount. The hermetic server reads them from
 *    SCENTDEX_PRICE_LIMITS_FIXTURE (playwright.config.ts), never from a chain:
 *    maxPriceRatio = 1e33, minTakerAmount = 1000.
 *
 * Uses its own pair label so nothing here shows up on the SDT board the
 * UI specs assert against.
 */
const PAIR = "OC01-TEST/WETH-TEST";

type ApiRow = {
  orderHash: string;
  status: string;
  signature?: string;
  permitSignature?: string;
  permitSingle?: unknown;
  signatureWithheld?: boolean;
};

test.describe("/api/orders — OC-01 signature withholding + price limits", () => {
  test("live row keeps signatures; cancelled row never returns them", async ({
    request,
  }) => {
    const live = await buildSignedOrderBody({
      side: "ask",
      makerSize: "10",
      takerSize: "0.0001",
      pair: PAIR,
    });
    const doomed = await buildSignedOrderBody({
      side: "ask",
      makerSize: "11",
      takerSize: "0.0001",
      pair: PAIR,
    });
    const r1 = await request.post("/api/orders", { data: live.body });
    expect(r1.status()).toBe(201);
    const liveHash = ((await r1.json()) as { order: { orderHash: string } }).order
      .orderHash;
    const r2 = await request.post("/api/orders", { data: doomed.body });
    expect(r2.status()).toBe(201);
    const doomedHash = ((await r2.json()) as { order: { orderHash: string } })
      .order.orderHash;

    // In-memory backend: off-chain cancel needs no auth signature.
    const c = await request.post(`/api/orders/${doomedHash}/cancel`, {
      data: {},
    });
    expect(c.status()).toBe(200);

    for (const qs of [
      `pair=${encodeURIComponent(PAIR)}`,
      `pair=${encodeURIComponent(PAIR)}&includeHidden=true`,
      `maker=${MAKER.address}&includeHidden=true`,
    ]) {
      const res = await request.get(`/api/orders?${qs}`);
      expect(res.status()).toBe(200);
      const { orders } = (await res.json()) as { orders: ApiRow[] };

      const l = orders.find((o) => o.orderHash === liveHash);
      expect(l?.status).toBe("open");
      expect(l?.signature).toMatch(/^0x[0-9a-f]+$/i);
      expect(l?.permitSignature).toMatch(/^0x[0-9a-f]+$/i);

      const d = orders.find((o) => o.orderHash === doomedHash);
      expect(d?.status).toBe("cancelled");
      expect(d?.signature).toBeUndefined();
      expect(d?.permitSignature).toBeUndefined();
      expect(d?.permitSingle).toBeUndefined();
      expect(d?.signatureWithheld).toBe(true);
    }

    // Clean up the live row too.
    await request.post(`/api/orders/${liveHash}/cancel`, { data: {} });
  });

  test("?maker= filters and validates", async ({ request }) => {
    const bad = await request.get("/api/orders?maker=not-an-address");
    expect(bad.status()).toBe(400);

    const other = await request.get(
      "/api/orders?maker=0x000000000000000000000000000000000000dEaD&includeHidden=true",
    );
    expect(other.status()).toBe(200);
    const { orders } = (await other.json()) as { orders: ApiRow[] };
    expect(orders).toHaveLength(0);
  });

  test("POST rejects an order above maxPriceRatio", async ({ request }) => {
    // ratio = makerAmount * 1e18 / takerAmount = 1e18 * 1e18 / 1e3 = 1e33 → at the cap, allowed
    const atCap = await buildSignedOrderBody({
      side: "ask",
      makerAmount: 10n ** 18n,
      takerAmount: 1000n,
      pair: PAIR,
    });
    const ok = await request.post("/api/orders", { data: atCap.body });
    expect(ok.status()).toBe(201);
    const okHash = ((await ok.json()) as { order: { orderHash: string } }).order
      .orderHash;
    await request.post(`/api/orders/${okHash}/cancel`, { data: {} });

    // 1 wei more on the maker side → ratio just above 1e33 → rejected
    const overCap = await buildSignedOrderBody({
      side: "ask",
      makerAmount: 10n ** 18n + 1000n,
      takerAmount: 1000n,
      pair: PAIR,
    });
    const res = await request.post("/api/orders", { data: overCap.body });
    expect(res.status()).toBe(400);
    const j = (await res.json()) as { code?: string };
    expect(j.code).toBe("price-ratio-above-cap");
  });

  test("POST rejects an order below minTakerAmount", async ({ request }) => {
    const below = await buildSignedOrderBody({
      side: "bid",
      makerAmount: 1n,
      takerAmount: 999n,
      pair: PAIR,
    });
    const res = await request.post("/api/orders", { data: below.body });
    expect(res.status()).toBe(400);
    const j = (await res.json()) as { code?: string };
    expect(j.code).toBe("taker-amount-below-floor");
  });
});
