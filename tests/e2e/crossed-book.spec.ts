import { expect, request as pwRequest, test } from "@playwright/test";

import { blockExternalNetwork } from "./support/hermetic";
import { postSignedOrder } from "./support/orders";

/**
 * E-10 crossed-book warning — signed orders are posted into the in-memory
 * book, then the PlaceOrder form is driven across / away from the top of
 * book. The warning must fire on crossing prices, stay silent otherwise,
 * and never block signing.
 */
test.describe("E-10 crossed-book warning", () => {
  test.beforeAll(async ({}, testInfo) => {
    const api = await pwRequest.newContext({
      baseURL: testInfo.project.use.baseURL,
    });
    // Ask: sell 1,000 SDT @ 0.000005 WETH. Bid: buy 500 SDT @ 0.000004.
    await postSignedOrder(api, {
      side: "ask",
      makerSize: "1000",
      takerSize: "0.005",
    });
    await postSignedOrder(api, {
      side: "bid",
      makerSize: "0.002",
      takerSize: "500",
    });
    await api.dispose();
  });

  test.beforeEach(async ({ context, page }) => {
    await blockExternalNetwork(context);
    await page.goto("/sdttest");
    await expect(
      page.getByRole("heading", { name: "注文を出す" }),
    ).toBeVisible();
  });

  test("buy at/above best ask warns; between the spread stays silent", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "SDT を買う" }).click();
    const inputs = page.locator("input[inputmode='decimal']");
    await inputs.nth(0).fill("1");

    await inputs.nth(1).fill("0.000005"); // == best ask → crosses
    await expect(page.getByText("この買い価格は最良売り気配")).toBeVisible();
    await expect(page.getByText("板とクロス")).toBeVisible();
    // C-L2: the warning states its basis (all resting orders).
    await expect(page.getByText("板上の全未約定注文")).toBeVisible();

    await inputs.nth(1).fill("0.0000045"); // inside the spread → silent
    await expect(page.getByText("板とクロス")).toHaveCount(0);
  });

  test("sell at/below best bid warns; above stays silent", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "SDT を売る" }).click();
    const inputs = page.locator("input[inputmode='decimal']");
    await inputs.nth(0).fill("1");

    await inputs.nth(1).fill("0.000004"); // == best bid → crosses
    await expect(page.getByText("この売り価格は最良買い気配")).toBeVisible();

    await inputs.nth(1).fill("0.0000045"); // above best bid → silent
    await expect(page.getByText("板とクロス")).toHaveCount(0);
  });
});
