import { expect, test } from "@playwright/test";

import { blockExternalNetwork } from "./support/hermetic";

/**
 * PlaceOrder form on /sdttest — pure client-side maths and copy.
 * Covers tester items D-02 (comma input) and D-05 (sub-1 precision).
 */
test.describe("/sdttest PlaceOrder form", () => {
  test.beforeEach(async ({ context, page }) => {
    await blockExternalNetwork(context);
    await page.goto("/sdttest");
    await expect(
      page.getByRole("heading", { name: "注文を出す" }),
    ).toBeVisible();
  });

  test("market renders (not env-gated) with book + form + trades", async ({
    page,
  }) => {
    await expect(page.getByText("Market not available yet")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "板情報" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "最近の取引" }),
    ).toBeVisible();
  });

  test("sell receipt preview: comma size × dust price (D-02/D-05)", async ({
    page,
  }) => {
    const inputs = page.locator("input[inputmode='decimal']");
    await inputs.nth(0).fill("1,000");
    await inputs.nth(1).fill("0.000005");

    // 1,000 SDT × 0.000005 = 0.005 gross; 10% fee = 0.0005; net 0.0045.
    await expect(page.getByText("0.005 WETH（ETH）")).toBeVisible();
    await expect(page.getByText("0.0005 WETH（ETH）")).toBeVisible();
    await expect(page.getByText("0.0045 WETH（ETH）")).toBeVisible();
  });

  test("dust size that rounds to zero is rejected as too small", async ({
    page,
  }) => {
    const inputs = page.locator("input[inputmode='decimal']");
    // 1e-20 SDT rounds to a zero-amount order → builtOrder null. With no
    // wallet connected the button label shows the connect reason, so the
    // amount-too-small reason is asserted via the button's title (the
    // joined reasons list).
    await inputs.nth(0).fill("0.00000000000000000001");
    await inputs.nth(1).fill("0.000005");
    await expect(
      page.locator("button[title*='数量が小さすぎます']"),
    ).toBeVisible();
  });
});
