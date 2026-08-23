import { MarkdownDoc } from "@/app/components/MarkdownDoc";
import { getTranslator } from "@/lib/i18n-dictionary";
import type { SupportedLocale } from "@/lib/i18n";
import type { LegalLocale } from "@/lib/legal-locale";

export function LegalDocLayout({
  uiLocale,
  legalLocale,
  markdown,
}: {
  uiLocale: SupportedLocale;
  legalLocale: LegalLocale;
  markdown: string;
}) {
  const t = getTranslator(uiLocale);
  const isAuthoritative = legalLocale === "en";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {!isAuthoritative ? (
        <div className="mb-6 rounded border border-line bg-bg-elev px-4 py-3 text-[13px] text-fg-dim legal-doc-toolbar">
          {t("legal.translation.notice")}
        </div>
      ) : null}

      <MarkdownDoc source={markdown} />
    </div>
  );
}
