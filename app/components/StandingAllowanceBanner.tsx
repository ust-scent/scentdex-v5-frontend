"use client";

import { useTranslator } from "@/lib/locale-context";
import { useStandingAllowances } from "@/lib/hooks/useStandingAllowances";

/**
 * One-time round-2 → round-3 cleanup prompt.
 *
 * If the connected wallet still holds a non-zero `Permit2.allowance(maker,
 * token, DEX)` from the round-2 build, this banner offers to collapse it
 * to (0, 0) so the DEX no longer carries a standing right to spend any of
 * the maker's tokens between trades. Round-3 orders carry their own
 * per-order PermitSingle, so nothing breaks if the standing allowance is
 * gone — and the security benefit is real (blast radius shrinks from
 * "everything in the wallet" to "the makerAmount of the open order").
 *
 * Renders nothing when:
 *  - the wallet isn't connected,
 *  - there are no outstanding standing allowances,
 *  - the reads are still loading.
 */
export function StandingAllowanceBanner() {
  const t = useTranslator();
  const s = useStandingAllowances();

  if (s.outstanding.length === 0 && s.pendingRevokes === 0) return null;

  const total = s.outstanding.length + s.pendingRevokes;
  const tokenList = s.outstanding.map((a) => a.symbol).join(", ");

  return (
    <div className="mx-3 sm:mx-6 mt-3 px-4 py-3 rounded-md border border-amber-500/40 bg-amber-500/[0.08] text-[13px]">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
        <div className="flex-1 leading-relaxed">
          <div className="font-medium text-amber-200 mb-1">
            {t("trade.standingAllowance.headline")}
          </div>
          <div className="text-fg-dim">
            {t("trade.standingAllowance.body").replace(
              "{tokens}",
              tokenList || "—",
            )}
          </div>
          {s.lastError ? (
            <div className="mt-1 text-[12px] text-sell">
              {s.lastError.message.slice(0, 140)}
            </div>
          ) : null}
        </div>
        <button
          onClick={s.revokeAll}
          disabled={s.isRevoking || s.outstanding.length === 0}
          className="shrink-0 px-3 py-2 rounded-md bg-amber-500 text-bg font-medium text-[13px] disabled:opacity-60 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
        >
          {s.isRevoking
            ? t("trade.standingAllowance.revoking").replace(
                "{remaining}",
                String(s.pendingRevokes),
              )
            : t("trade.standingAllowance.revokeAll").replace(
                "{count}",
                String(total),
              )}
        </button>
      </div>
    </div>
  );
}
