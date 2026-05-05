import { getRequestLocale } from "@/lib/locale-server";
import { TradeClient } from "@/app/trade/TradeClient";

export default async function TradePage() {
  const locale = await getRequestLocale();
  return <TradeClient initialLocale={locale} />;
}
