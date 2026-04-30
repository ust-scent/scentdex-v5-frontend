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

      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-3 px-6 py-4">
        <OrderBook />
        <RecentTrades />
        <PlaceOrder pair={pair} />
      </div>

      <div className="px-6 pb-8">
        <BottomTabs />
      </div>
    </div>
  );
}
