import Link from "next/link";

import { MarkdownDoc } from "@/app/components/MarkdownDoc";
import { getTranslator } from "@/lib/i18n-dictionary";
import type { SupportedLocale } from "@/lib/i18n";
import { LEGAL_LOCALES, type LegalLocale } from "@/lib/legal-locale";

const LEGAL_LOCALE_LABEL: Record<LegalLocale, string> = {
  en: "🇬🇧 English (Authoritative)",
  ja: "🇯🇵 日本語",
  id: "🇮🇩 Bahasa Indonesia",
  zh: "🇨🇳 中文",
};

export function LegalDocLayout({
  uiLocale,
  legalLocale,
  basePath,
  markdown,
}: {
  uiLocale: SupportedLocale;
  legalLocale: LegalLocale;
  basePath: "/terms" | "/privacy";
  markdown: string;
}) {
  const t = getTranslator(uiLocale);
  const isAuthoritative = legalLocale === "en";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <div className="flex flex-wrap items-center gap-3 mb-6 legal-doc-toolbar">
        <span className="text-[11px] font-mono uppercase tracking-[0.18em] text-fg-faint">
          {t("legal.language.label")}
        </span>
        <nav className="flex flex-wrap gap-1" aria-label="Document language">
          {LEGAL_LOCALES.map((code) => {
            const active = code === legalLocale;
            return (
              <Link
                key={code}
                href={`${basePath}?lang=${code}`}
                aria-current={active ? "page" : undefined}
                className={`px-2.5 py-1 rounded-md text-[12px] border transition-colors ${
                  active
                    ? "bg-white/[0.05] text-fg border-line-strong"
                    : "text-fg-dim border-line hover:text-fg hover:border-line-strong"
                }`}
              >
                {LEGAL_LOCALE_LABEL[code]}
              </Link>
            );
          })}
        </nav>
      </div>

      {!isAuthoritative ? (
        <div className="mb-6 rounded border border-line bg-bg-elev px-4 py-3 text-[13px] text-fg-dim legal-doc-toolbar">
          {t("legal.translation.notice")}{" "}
          <Link
            href={`${basePath}?lang=en`}
            className="text-accent hover:underline"
          >
            {t("legal.translation.viewEnglish")}
          </Link>
        </div>
      ) : null}

      <MarkdownDoc source={markdown} />
    </div>
  );
}
