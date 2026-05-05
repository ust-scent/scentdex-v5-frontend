"use client";

import { createContext, useContext } from "react";
import { DEFAULT_LOCALE, type SupportedLocale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n-dictionary";

const LocaleContext = createContext<SupportedLocale>(DEFAULT_LOCALE);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: SupportedLocale;
  children: React.ReactNode;
}) {
  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}

export function useLocale(): SupportedLocale {
  return useContext(LocaleContext);
}

export function useTranslator() {
  return getTranslator(useLocale());
}
