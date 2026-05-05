"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import {
  LOCALE_LABELS,
  LOCALE_SHORT,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n-dictionary";

const TRADE_PATH = "/trade";
const HOME_PATH = "/";

const LOCALE_COOKIE = "locale";
const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Top navigation. Locale state is cookie-driven — `initialLocale` comes from
 * the server (root layout) so the first paint is correct, then the switcher
 * writes the cookie and triggers `router.refresh()` which re-renders the tree
 * with the new server-resolved locale. The URL never changes.
 */
export function Header({ initialLocale }: { initialLocale: SupportedLocale }) {
  const pathname = usePathname();
  const t = getTranslator(initialLocale);

  const onTrade = pathname === TRADE_PATH;
  const onHome = !onTrade;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link href={HOME_PATH} className="flex items-center gap-2 font-medium shrink-0">
            <Image
              src="/logo.svg"
              alt=""
              width={26}
              height={26}
              priority
              aria-hidden="true"
            />
            <span className="tracking-wide text-[15px]">SCENTDEX</span>
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.18em] text-fg-faint border border-line rounded px-1.5 py-0.5">
              v5
            </span>
          </Link>

          <nav aria-label="Primary" className="hidden md:flex items-center gap-1">
            <Link
              href={HOME_PATH}
              aria-current={onHome ? "page" : undefined}
              className="px-3 py-1.5 rounded-md text-[14px] text-fg-dim hover:text-fg hover:bg-white/[0.03] transition-colors aria-[current=page]:bg-white/[0.04] aria-[current=page]:text-fg"
            >
              {t("header.nav.home")}
            </Link>
            <Link
              href={TRADE_PATH}
              aria-current={onTrade ? "page" : undefined}
              className="px-3 py-1.5 rounded-md text-[14px] text-fg-dim hover:text-fg hover:bg-white/[0.03] transition-colors aria-[current=page]:bg-white/[0.04] aria-[current=page]:text-fg"
            >
              {t("header.nav.trade")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <LocaleSwitcher locale={initialLocale} className="hidden sm:flex" />
          <ConnectButton
            label="Connect"
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
            chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
            showBalance={false}
          />
        </div>
      </div>

      {/* Mobile bottom-row nav: nav links + locale switcher. */}
      <div className="md:hidden flex items-center justify-between gap-2 px-4 pb-2 pt-1 border-t border-line">
        <nav aria-label="Primary mobile" className="flex items-center gap-1">
          <Link
            href={HOME_PATH}
            aria-current={onHome ? "page" : undefined}
            className="px-3 py-1.5 rounded-md text-[13px] text-fg-dim hover:text-fg hover:bg-white/[0.03] transition-colors aria-[current=page]:bg-white/[0.04] aria-[current=page]:text-fg"
          >
            {t("header.nav.home")}
          </Link>
          <Link
            href={TRADE_PATH}
            aria-current={onTrade ? "page" : undefined}
            className="px-3 py-1.5 rounded-md text-[13px] text-fg-dim hover:text-fg hover:bg-white/[0.03] transition-colors aria-[current=page]:bg-white/[0.04] aria-[current=page]:text-fg"
          >
            {t("header.nav.trade")}
          </Link>
        </nav>
        <LocaleSwitcher locale={initialLocale} className="flex" />
      </div>
    </header>
  );
}

function LocaleSwitcher({
  locale,
  className,
}: {
  locale: SupportedLocale;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pickLocale(next: SupportedLocale) {
    setOpen(false);
    if (next === locale) return;
    // Persist choice; the same URL re-renders with the new server-resolved locale.
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    router.refresh();
  }

  return (
    <div ref={ref} className={`relative ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-line text-[11px] font-mono text-fg-dim hover:text-fg hover:border-line-strong"
      >
        <span aria-hidden="true">🌐</span>
        <span className="tabular-nums">{LOCALE_SHORT[locale]}</span>
        <svg
          aria-hidden="true"
          width="10"
          height="10"
          viewBox="0 0 10 10"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" />
        </svg>
      </button>
      {open ? (
        <ul
          role="listbox"
          aria-label="Language"
          className="absolute right-0 mt-1 w-44 rounded-md border border-line bg-bg-soft shadow-lg overflow-hidden z-40"
        >
          {SUPPORTED_LOCALES.map((code) => {
            const active = code === locale;
            return (
              <li key={code} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => pickLocale(code)}
                  className={`w-full text-left px-3 py-2 text-[13px] flex items-center justify-between gap-3 transition-colors ${
                    active
                      ? "bg-white/[0.05] text-fg"
                      : "text-fg-dim hover:bg-white/[0.03] hover:text-fg"
                  }`}
                >
                  <span>{LOCALE_LABELS[code]}</span>
                  <span className="font-mono text-[10px] text-fg-faint">
                    {LOCALE_SHORT[code]}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
