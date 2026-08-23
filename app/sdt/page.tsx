import { redirect } from "next/navigation";

/**
 * /sdt (and /SDT) — legacy pinned SDT/WETH page.
 *
 * SDT/WETH is now a first-class tab on /trade (added to PAIRS at official
 * release), so this route just forwards there with the pair preselected. Kept
 * as a redirect — not deleted — so already-shared /SDT release links stay live
 * instead of 404ing. The old market UI lives on in ./SdtLiveClient (unused).
 */
export default function SdtPage() {
  redirect("/trade?pair=SDT-WETH");
}
