import { getRequestLocale } from "@/lib/locale-server";
import { SdtTestClient } from "@/app/sdttest/SdtTestClient";

/**
 * /sdttest — SDT/WETH listing rehearsal market (Sepolia ONLY).
 *
 * Isolated from the production /trade route: pinned pair, env-gated
 * contract addresses, its own Sepolia network guard. Page copy is
 * intentionally English-only — this is a clearly-bannered internal test
 * surface, not a localized end-user product page.
 */
export default async function SdtTestPage() {
  const locale = await getRequestLocale();
  return <SdtTestClient initialLocale={locale} />;
}
