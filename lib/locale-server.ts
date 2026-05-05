import { cookies, headers } from "next/headers";

import {
  DEFAULT_LOCALE,
  isSupportedLocale,
  resolveLocale,
  type SupportedLocale,
} from "@/lib/i18n";

/**
 * Server-side locale resolution.
 *
 * Single source of truth used by the root layout and every server page.
 * Resolution order:
 *   1. `locale` cookie (set by middleware on first visit, by the user when
 *      they pick a language from the switcher)
 *   2. `Accept-Language` header (initial paint before the cookie exists)
 *   3. DEFAULT_LOCALE
 *
 * The URL never carries the locale — switching language re-renders the
 * same path with a different cookie. That matches the convention on our
 * other public sites (scentdays.com, hrz.co.jp), where the URL is
 * locale-agnostic.
 */

export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function getRequestLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (fromCookie && isSupportedLocale(fromCookie)) return fromCookie;

  const headerList = await headers();
  const accept = headerList.get("accept-language") ?? "";
  const preferred = accept.split(",")[0]?.trim().split(";")[0] ?? "";
  return resolveLocale(preferred) || DEFAULT_LOCALE;
}
