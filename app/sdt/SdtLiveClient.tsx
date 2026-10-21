"use client";

import { BottomTabs } from "@/app/components/BottomTabs";
import { OrderBook } from "@/app/components/OrderBook";
import { PlaceOrder } from "@/app/components/PlaceOrder";
import { RecentTrades } from "@/app/components/RecentTrades";
import { StatsBar } from "@/app/components/StatsBar";
import { type SupportedLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import { SDT_MAINNET_PAIR } from "@/lib/tokens";

/**
 * /sdt — SDT/WETH market on MAINNET (real assets), pinned-pair page.
 *
 * Identical composition to the production /trade surface: the same five
 * components, pinned to SDT/WETH. No test helpers, no banners, no extra
 * labels (Alex 2026-07-05: the page must be byte-for-byte the UX that
 * ships). Cutover to /trade = add SDT_MAINNET_PAIR to PAIRS and delete
 * this route.
 *
 * Not linked from anywhere and env-gated (NEXT_PUBLIC_ENABLE_SDT_MAINNET)
 * until the official release gates (external audit / legal / SDT source
 * verification) clear. The default network guard already targets mainnet
 * on this route — no carve-out needed.
 */

const MARKET_LIVE = process.env.NEXT_PUBLIC_ENABLE_SDT_MAINNET === "1";

export function SdtLiveClient({
  initialLocale,
}: {
  initialLocale: SupportedLocale;
}) {
  return (
    <LocaleProvider locale={initialLocale}>
      <div className="max-w-[1440px] mx-auto">
        {!MARKET_LIVE ? (
          <NotLiveNotice />
        ) : (
          <>
            <StatsBar pair={SDT_MAINNET_PAIR} />

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-3 px-3 sm:px-6 py-3 sm:py-4">
              <OrderBook pair={SDT_MAINNET_PAIR} />
              <PlaceOrder pair={SDT_MAINNET_PAIR} />
              <RecentTrades pair={SDT_MAINNET_PAIR} />
            </div>

            <div className="px-3 sm:px-6 pb-6 sm:pb-8">
              <BottomTabs />
            </div>
          </>
        )}
      </div>
    </LocaleProvider>
  );
}

function NotLiveNotice() {
  return (
    <div className="px-3 sm:px-6 py-16 text-center">
      <div className="inline-block rounded-lg border border-line bg-white/[0.015] px-8 py-10">
        <div className="text-[15px] font-medium mb-2">
          Market not available yet
        </div>
        <p className="text-[13px] text-fg-dim leading-relaxed max-w-[420px]">
          The SDT/WETH market is not live in this build. Check back once
          setup completes.
        </p>
      </div>
    </div>
  );
}
