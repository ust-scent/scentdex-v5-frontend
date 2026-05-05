import { NextResponse, type NextRequest } from "next/server";

import { isSupportedLocale, resolveLocale } from "@/lib/i18n";

/**
 * Locale bootstrap middleware.
 *
 * On every page request we make sure the visitor has a `locale` cookie. If
 * one is already set we pass through untouched; if not, we read their
 * Accept-Language header, pick the closest supported locale, and write the
 * cookie so subsequent renders are deterministic.
 *
 * No URL rewriting happens — the locale stays in the cookie alone, mirroring
 * the convention on our other public sites (scentdays.com, hrz.co.jp).
 *
 * The matcher excludes API routes, Next internals, and any path that looks
 * like a static asset (`*.svg`, `*.png`, …) so we don't burn CPU on each
 * favicon hit.
 */

const LOCALE_COOKIE = "locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(LOCALE_COOKIE)?.value;
  if (existing && isSupportedLocale(existing)) {
    return NextResponse.next();
  }

  const accept = req.headers.get("accept-language") ?? "";
  const preferred = accept.split(",")[0]?.trim().split(";")[0] ?? "";
  const locale = resolveLocale(preferred);

  const res = NextResponse.next();
  res.cookies.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR,
    sameSite: "lax",
  });
  return res;
}

export const config = {
  matcher: "/((?!api|_next|.*\\..*).*)",
};
