import type { SupportedLocale } from "@/lib/i18n";

// Legal documents are authored in four locales (en/ja/id/zh). The wider
// UI locale set is mapped onto these — ko falls back to English (the
// authoritative version), zh-TW shares the Simplified Chinese reference
// translation because UST has no separate Traditional Chinese draft yet.
// The /terms and /privacy pages follow the user's UI locale cookie; the
// document language is never carried on the URL.
export const LEGAL_LOCALES = ["en", "ja", "id", "zh"] as const;
export type LegalLocale = (typeof LEGAL_LOCALES)[number];

export function toLegalLocale(ui: SupportedLocale): LegalLocale {
  switch (ui) {
    case "ja":
      return "ja";
    case "id":
      return "id";
    case "zh-CN":
    case "zh-TW":
      return "zh";
    case "ko":
    case "en":
    default:
      return "en";
  }
}

// Latest revision date of each public legal document. Kept here so a future
// "your acceptance pre-dates the latest revision" flow can compare against
// the timestamp on the user's signed order.
export const TERMS_VERSION = "2026-05-16";
export const PRIVACY_VERSION = "2026-05-16";
