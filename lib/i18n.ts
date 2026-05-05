/**
 * Web i18n base. Mirrors the Scentdays server/_core/i18n.ts pattern:
 *   const t = getTranslator("ja");
 *   t("hero.title.line1")
 *
 * Adding a new translation key:
 *   1. Add the key to the Dictionary type in lib/i18n-dictionary.ts
 *   2. Provide a string for every locale in `dictionaries`
 *   The TypeScript type guarantees full coverage.
 */

export const SUPPORTED_LOCALES = ["en", "ja", "ko", "zh-CN", "zh-TW", "id"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = "en";

export function isSupportedLocale(v: unknown): v is SupportedLocale {
  return typeof v === "string" && (SUPPORTED_LOCALES as readonly string[]).includes(v);
}

/**
 * Coerce any incoming locale-like string to a supported locale.
 * Falls back to DEFAULT_LOCALE if no match.
 */
export function resolveLocale(input: string | null | undefined): SupportedLocale {
  if (!input) return DEFAULT_LOCALE;
  if (isSupportedLocale(input)) return input;
  const lower = input.toLowerCase();
  if (lower.startsWith("ja")) return "ja";
  if (lower.startsWith("ko")) return "ko";
  if (lower.startsWith("id") || lower.startsWith("in")) return "id";
  if (lower.startsWith("zh")) {
    if (
      lower.includes("hant") ||
      lower.includes("tw") ||
      lower.includes("hk") ||
      lower.includes("mo")
    ) {
      return "zh-TW";
    }
    return "zh-CN";
  }
  return DEFAULT_LOCALE;
}

/** Display label for the locale-switcher dropdown. */
export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  ja: "日本語",
  ko: "한국어",
  "zh-CN": "简体中文",
  "zh-TW": "繁體中文",
  id: "Bahasa",
};

/** Short label for compact UIs. */
export const LOCALE_SHORT: Record<SupportedLocale, string> = {
  en: "EN",
  ja: "JA",
  ko: "KO",
  "zh-CN": "ZH",
  "zh-TW": "TW",
  id: "ID",
};
