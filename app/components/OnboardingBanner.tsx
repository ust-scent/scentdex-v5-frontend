"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslator } from "@/lib/locale-context";

const STORAGE_KEY = "scentdex.banner.dismissed.v1";

export function OnboardingBanner() {
  const t = useTranslator();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      // ignore (private mode etc.)
    }
    setDismissed(true);
  };

  return (
    <div className="mx-3 sm:mx-6 mt-3 px-4 py-3 rounded-md border border-amber-500/30 bg-amber-500/[0.05] text-[13px]">
      <div className="flex items-start sm:items-center gap-3">
        <div className="flex-1 leading-relaxed text-fg-dim">
          {t("onboarding.banner.text")}{" "}
          <Link
            href="/faq#how-it-works"
            className="text-amber-200 hover:text-amber-100 underline-offset-2 hover:underline whitespace-nowrap"
          >
            {t("onboarding.banner.cta")}
          </Link>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("onboarding.banner.dismissAria")}
          className="shrink-0 -mt-0.5 -mr-1 p-1 text-fg-faint hover:text-fg-dim transition-colors"
        >
          <span aria-hidden="true" className="text-[16px] leading-none">
            ×
          </span>
        </button>
      </div>
    </div>
  );
}
