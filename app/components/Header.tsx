"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import Image from "next/image";
import Link from "next/link";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/trade", label: "Trade" },
] as const;

export function Header() {
  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link href="/" className="flex items-center gap-2 font-medium shrink-0">
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
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-md text-[14px] text-fg-dim hover:text-fg hover:bg-white/[0.03] transition-colors aria-[current=page]:bg-white/[0.04] aria-[current=page]:text-fg"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <ConnectButton
            label="Connect"
            accountStatus={{ smallScreen: "avatar", largeScreen: "address" }}
            chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
            showBalance={false}
          />
        </div>
      </div>

      {/* Mobile bottom-row nav: only nav links, not the brand row */}
      <nav
        aria-label="Primary mobile"
        className="md:hidden flex items-center gap-1 px-4 pb-2 pt-1 border-t border-line"
      >
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-1.5 rounded-md text-[13px] text-fg-dim hover:text-fg hover:bg-white/[0.03] transition-colors aria-[current=page]:bg-white/[0.04] aria-[current=page]:text-fg"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
