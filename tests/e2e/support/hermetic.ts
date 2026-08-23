import type { BrowserContext } from "@playwright/test";

/**
 * Hermetic network policy: allow only the local dev server; abort every
 * external request (RPC endpoints, WalletConnect/Reown config, analytics).
 *
 * This is a hard isolation guarantee — E2E must never talk to a real
 * chain or third-party service — AND a degradation test in itself: the
 * app has to stay usable when every RPC is down (fillability fails open
 * to "unknown", previewFee shows its error note, client-side previews
 * and warnings keep working).
 */
export async function blockExternalNetwork(
  context: BrowserContext,
): Promise<void> {
  await context.route("**/*", (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "127.0.0.1" || url.hostname === "localhost") {
      return route.continue();
    }
    return route.abort();
  });
}
