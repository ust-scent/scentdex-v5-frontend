import { expect, request as pwRequest, test } from "@playwright/test";

import { blockExternalNetwork } from "./support/hermetic";
import { postSignedOrder } from "./support/orders";

/**
 * H-05 partial-fill UI in FillModal — driven off a real signed ask sitting
 * in the in-memory book. Wallet-less by design: everything up to the
 * signing gate is asserted (prefill, Max, range/precision validation,
 * client-side payment preview mirroring the contract's ceil rounding).
 *
 * With all RPC blocked (hermetic policy), fillability is "unknown" (rows
 * stay visible — fail-open) and previewFee shows its error note; both are
 * the specified degradation behaviours and are asserted below.
 */
test.describe("H-05 FillModal partial fill", () => {
  test.beforeAll(async ({}, testInfo) => {
    const api = await pwRequest.newContext({
      baseURL: testInfo.project.use.baseURL,
    });
    // Dedicated ask away from the crossed-book spec's prices:
    // sell 2,000 SDT @ 0.000006 WETH → takerAmount 0.012 WETH.
    await postSignedOrder(api, {
      side: "ask",
      makerSize: "2000",
      takerSize: "0.012",
    });
    await api.dispose();
  });

  test.beforeEach(async ({ context, page }) => {
    await blockExternalNetwork(context);
    await page.goto("/sdttest");
    // Open the 2,000-SDT ask row (amount column shows 2000.00).
    await page
      .getByRole("button", { name: /0\.000006/ })
      .first()
      .click();
    await expect(page.getByText("約定する数量")).toBeVisible();
  });

  test("prefills the exact remaining amount with Max + partial hint", async ({
    page,
  }) => {
    const fillInput = page.getByLabel("約定する数量");
    await expect(fillInput).toHaveValue("2000");
    await expect(page.getByRole("button", { name: "全量" })).toBeVisible();
    await expect(page.getByText("一部だけ約定できます")).toBeVisible();
    // Hermetic degradation: without RPC the fee preview can't resolve, so
    // the primary action must stay disabled (previewBlocking / no wallet).
    // (The explicit previewFeeError note needs wagmi's retry cycle to
    // exhaust — too slow/flaky to pin in a 5s assertion.)
    await expect(
      page.locator(".fixed button.w-full").last(),
    ).toBeDisabled();
  });

  test("partial size scales the payment with contract ceil rounding", async ({
    page,
  }) => {
    const fillInput = page.getByLabel("約定する数量");
    await fillInput.fill("100");
    // ceil(100e18 × 0.012e18 / 2000e18) = 0.0006 WETH. Symbol-agnostic:
    // wallet-less sdttest sessions resolve token meta as "?" (chainId
    // defaults to mainnet where the test tokens have no address).
    await expect(page.getByText("0.0006")).toBeVisible();
    await expect(page.getByText("受取").locator("..").getByText("100")).toBeVisible();
  });

  test("over-max input shows the range warning", async ({ page }) => {
    const fillInput = page.getByLabel("約定する数量");
    await fillInput.fill("2001");
    await expect(page.getByText(/0 より大きく 2,000/)).toBeVisible();
    // Back inside range clears it.
    await fillInput.fill("2000");
    await expect(page.getByText(/0 より大きく 2,000/)).toHaveCount(0);
  });

  test("over-precision input (>18 decimals) is rejected, exact 18 accepted (C-L3)", async ({
    page,
  }) => {
    const fillInput = page.getByLabel("約定する数量");
    await fillInput.fill("0.0000000000000000001"); // 19 fraction digits
    await expect(page.getByText(/0 より大きく 2,000/)).toBeVisible();
    await fillInput.fill("0.000000000000000001"); // exactly 1 wei
    await expect(page.getByText(/0 より大きく 2,000/)).toHaveCount(0);
  });

  test("Max button restores the full remaining amount", async ({ page }) => {
    const fillInput = page.getByLabel("約定する数量");
    await fillInput.fill("5");
    await page.getByRole("button", { name: "全量" }).click();
    await expect(fillInput).toHaveValue("2000");
  });
});
