import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";

import { CookieBanner } from "@/app/components/CookieBanner";
import { Footer } from "@/app/components/Footer";
import { Header } from "@/app/components/Header";
import { Providers } from "@/app/providers";
import { TermsAcceptanceModal } from "@/app/components/TermsAcceptanceModal";
import { getRequestLocale } from "@/lib/locale-server";
import "./globals.css";

const sans = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SCENTDEX — Peer-to-peer limit-order DEX",
  description:
    "SCENTDEX is the peer-to-peer limit-order exchange for Scent Token. Audit-first, zero escrow. Operated by Universal Scent Technology.",
  metadataBase: new URL("https://dex.scenttoken.com"),
  openGraph: {
    title: "SCENTDEX",
    description: "Peer-to-peer limit-order DEX for Scent Token. Zero escrow.",
    url: "https://dex.scenttoken.com",
    siteName: "SCENTDEX",
    images: [{ url: "/logo.png", width: 420, height: 420 }],
    type: "website",
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale is cookie-driven (see lib/locale-server.ts) — the URL never carries
  // it. We resolve it once here so `<html lang>` is correct on first paint and
  // the Header can render its switcher in the right state without flashing.
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale}
      className={`${sans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-fg font-sans">
        <Providers>
          <Header initialLocale={locale} />
          <main className="flex-1">{children}</main>
          <Footer locale={locale} />
          <TermsAcceptanceModal locale={locale} />
          <CookieBanner locale={locale} />
        </Providers>
      </body>
    </html>
  );
}
