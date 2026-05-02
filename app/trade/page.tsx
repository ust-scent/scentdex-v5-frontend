"use client";

import { BottomTabs } from "@/app/components/BottomTabs";
import { OrderBook } from "@/app/components/OrderBook";
import { PairTabs, usePair } from "@/app/components/PairTabs";
import { PlaceOrder } from "@/app/components/PlaceOrder";
import { RecentTrades } from "@/app/components/RecentTrades";
import { StatsBar } from "@/app/components/StatsBar";

export default function Home() {
  const [pair, setPair] = usePair();

  return (
    <div className="max-w-[1440px] mx-auto">
      <PairTabs active={pair} onChange={setPair} />
      <StatsBar pair={pair} />

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-3 px-3 sm:px-6 py-3 sm:py-4">
        <OrderBook pair={pair} />
        <PlaceOrder pair={pair} />
        <RecentTrades />
      </div>

      <div className="px-3 sm:px-6 pb-6 sm:pb-8">
        <BottomTabs />
      </div>
    </div>
  );
}
