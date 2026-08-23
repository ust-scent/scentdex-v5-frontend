import Link from "next/link";

import type { SupportedLocale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n-dictionary";

export function Footer({ locale }: { locale: SupportedLocale }) {
  const t = getTranslator(locale);

  return (
    <footer className="border-t border-line mt-12 py-6 text-[12px] text-fg-faint print:hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <nav
          aria-label="Legal"
          className="flex flex-wrap items-center gap-x-4 gap-y-2"
        >
          <Link
            href="/terms"
            className="hover:text-fg transition-colors"
          >
            {t("footer.terms")}
          </Link>
          <span aria-hidden="true">|</span>
          <Link
            href="/privacy"
            className="hover:text-fg transition-colors"
          >
            {t("footer.privacy")}
          </Link>
          <span aria-hidden="true">|</span>
          <a
            href="mailto:cs@scenttoken.com"
            className="hover:text-fg transition-colors"
          >
            {t("footer.contact")}
          </a>
        </nav>
        <p className="text-fg-faint">{t("footer.copyright")}</p>
      </div>
    </footer>
  );
}
