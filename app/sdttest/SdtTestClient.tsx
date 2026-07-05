"use client";

import { BottomTabs } from "@/app/components/BottomTabs";
import { OrderBook } from "@/app/components/OrderBook";
import { PlaceOrder } from "@/app/components/PlaceOrder";
import { RecentTrades } from "@/app/components/RecentTrades";
import { StatsBar } from "@/app/components/StatsBar";
import { type SupportedLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import { SDTTEST_PAIR } from "@/lib/tokens";

/**
 * SDT/WETH test market client (Sepolia only).
 *
 * Reuses the production trade components pinned to the SDT/WETH pair.
 * The global WalletGuard already targets Sepolia on this route (see
 * useNetworkGuard), so a wallet that connects here is auto-prompted onto
 * the right chain.
 *
 * Env-gated: until NEXT_PUBLIC_SDTTEST_DEX_ADDRESS and
 * NEXT_PUBLIC_SDTTEST_SDT_ADDRESS are set (post-deploy), the page renders
 * a "not live yet" notice instead of a dead trading UI.
 *
 * 2026-07-05 (Alex): the ETH↔WETH explainer + faucet/unwrap helper strip
 * was removed so this page's UX matches what production /trade will ship
 * (test-what-you-ship). Tester funding is handled by ops-side transfers;
 * MockERC20.mint stays callable directly on-chain if ever needed.
 */

const DEX_LIVE = Boolean(process.env.NEXT_PUBLIC_SDTTEST_DEX_ADDRESS);
const SDT_LIVE = Boolean(process.env.NEXT_PUBLIC_SDTTEST_SDT_ADDRESS);
const WETH_LIVE = Boolean(process.env.NEXT_PUBLIC_SDTTEST_WETH_ADDRESS);
const MARKET_LIVE = DEX_LIVE && SDT_LIVE && WETH_LIVE;

export function SdtTestClient({
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
            <StatsBar pair={SDTTEST_PAIR} />

            <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-3 px-3 sm:px-6 py-3 sm:py-4">
              <OrderBook pair={SDTTEST_PAIR} />
              <PlaceOrder pair={SDTTEST_PAIR} />
              <RecentTrades pair={SDTTEST_PAIR} />
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

