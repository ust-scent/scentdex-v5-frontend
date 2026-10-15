"use client";

import Link from "next/link";

import { useTranslator } from "@/lib/locale-context";

/**
 * Per-order click-wrap consent. Mounted directly above every "place order"
 * and "fill order" submit button so the user re-affirms acceptance of the
 * current Terms of Service and Privacy Policy on every single transaction.
 *
 * The acceptance state is intentionally NOT persisted — the parent component
 * resets `checked` to `false` after each submit so the next order forces a
 * fresh re-agreement.
 */
export function TermsConsentCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  const t = useTranslator();
  const prefix = t("terms.consent.prefix");
  const joiner = t("terms.consent.joiner");
  const suffix = t("terms.consent.suffix");

  return (
    <label className="flex items-start gap-2 text-[12px] text-fg-dim cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-accent shrink-0"
      />
      <span className="leading-relaxed">
        {prefix ? `${prefix} ` : ""}
        <Link
          href="/terms"
          target="_blank"
          rel="noopener"
          className="text-accent hover:underline"
        >
          {t("terms.consent.termsLink")}
        </Link>
        {` ${joiner} `}
        <Link
          href="/privacy"
          target="_blank"
          rel="noopener"
          className="text-accent hover:underline"
        >
          {t("terms.consent.privacyLink")}
        </Link>
        {suffix}
      </span>
    </label>
  );
}
