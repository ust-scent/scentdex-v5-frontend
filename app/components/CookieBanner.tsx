"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

import type { SupportedLocale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n-dictionary";

const STORAGE_KEY = "scentdex.cookie.consent";
type Consent = "accepted" | "essential-only";

function readConsent(): Consent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "accepted" || raw === "essential-only") return raw;
    return null;
  } catch {
    return null;
  }
}

let cachedConsent: Consent | null =
  typeof window === "undefined" ? null : readConsent();
const consentListeners = new Set<() => void>();

function subscribeConsent(cb: () => void): () => void {
  consentListeners.add(cb);
  return () => {
    consentListeners.delete(cb);
  };
}

function getConsentSnapshot(): Consent | null {
  return cachedConsent;
}

function getServerConsentSnapshot(): Consent | null {
  return null;
}

function persistConsent(value: Consent): void {
  window.localStorage.setItem(STORAGE_KEY, value);
  cachedConsent = value;
  consentListeners.forEach((cb) => cb());
}

export function CookieBanner({ locale }: { locale: SupportedLocale }) {
  const t = getTranslator(locale);
  const consent = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );

  if (consent !== null) return null;

  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg-soft/95 backdrop-blur-md px-4 py-3 print:hidden"
    >
      <div className="max-w-[1440px] mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-[13px]">
        <p className="flex-1 text-fg-dim leading-relaxed">
          {t("cookie.banner.body")}{" "}
          <Link href="/privacy" className="text-accent hover:underline">
            {t("cookie.banner.learnMore")}
          </Link>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => persistConsent("essential-only")}
            className="px-3 py-1.5 rounded-md border border-line text-fg-dim hover:text-fg hover:border-line-strong transition-colors"
          >
            {t("cookie.banner.rejectNonEssential")}
          </button>
          <button
            type="button"
            onClick={() => persistConsent("accepted")}
            className="px-3 py-1.5 rounded-md bg-accent text-bg font-medium hover:bg-accent/90 transition-colors"
          >
            {t("cookie.banner.accept")}
          </button>
        </div>
      </div>
    </div>
  );
}
