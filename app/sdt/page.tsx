import { getRequestLocale } from "@/lib/locale-server";
import { SdtLiveClient } from "@/app/sdt/SdtLiveClient";

/**
 * /sdt — SDT/WETH mainnet market (real assets), pinned pair.
 *
 * Unlisted + env-gated until official release; see SdtLiveClient for the
 * cutover story (one PAIRS line + delete this route).
 */
export default async function SdtPage() {
  const locale = await getRequestLocale();
  return <SdtLiveClient initialLocale={locale} />;
}
