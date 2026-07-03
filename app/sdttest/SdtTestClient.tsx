"use client";

import { useMemo } from "react";
import { formatUnits } from "viem";
import { useAccount, useChainId } from "wagmi";

import { BottomTabs } from "@/app/components/BottomTabs";
import { OrderBook } from "@/app/components/OrderBook";
import { PlaceOrder } from "@/app/components/PlaceOrder";
import { RecentTrades } from "@/app/components/RecentTrades";
import { StatsBar } from "@/app/components/StatsBar";
import { SEPOLIA_CHAIN_ID } from "@/lib/contracts";
import { useTokenStatus } from "@/lib/hooks/useTokenStatus";
import { useWeth } from "@/lib/hooks/useWeth";
import { type SupportedLocale } from "@/lib/i18n";
import { LocaleProvider } from "@/lib/locale-context";
import { SDTTEST_PAIR, TOKENS } from "@/lib/tokens";

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
 */

const DEX_LIVE = Boolean(process.env.NEXT_PUBLIC_SDTTEST_DEX_ADDRESS);
const SDT_LIVE = Boolean(process.env.NEXT_PUBLIC_SDTTEST_SDT_ADDRESS);
const MARKET_LIVE = DEX_LIVE && SDT_LIVE;

export function SdtTestClient({
  initialLocale,
}: {
  initialLocale: SupportedLocale;
}) {
  return (
    <LocaleProvider locale={initialLocale}>
      <div className="max-w-[1440px] mx-auto">
        <TestnetBanner />
        {!MARKET_LIVE ? (
          <NotLiveNotice />
        ) : (
          <>
            <StatsBar pair={SDTTEST_PAIR} />
            <EthWethBar />

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

function TestnetBanner() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const wrongChain = isConnected && chainId !== SEPOLIA_CHAIN_ID;
  return (
    <div className="px-3 sm:px-6 pt-3">
      <div className="rounded-md border-2 border-amber-500/50 bg-amber-500/[0.08] px-4 py-3">
        <div className="flex items-center gap-2 text-amber-300 text-[13px] font-semibold uppercase tracking-[0.14em]">
          <span aria-hidden="true">⚠</span>
          <span>Sepolia testnet — SDT/WETH test market</span>
        </div>
        <p className="text-[12px] text-fg-dim mt-1 leading-relaxed">
          Test environment for the SDT listing. Every token here is a
          valueless testnet asset; nothing on this page trades real funds.
          The SDT seller pays a 10% protocol fee, carved from their WETH
          proceeds. You trade in ETH — wrapping to WETH happens
          automatically when needed.
          {wrongChain ? (
            <span className="text-amber-300">
              {" "}
              Your wallet is on the wrong network — approve the Sepolia
              switch prompt, or switch manually.
            </span>
          ) : null}
        </p>
      </div>
    </div>
  );
}

function NotLiveNotice() {
  return (
    <div className="px-3 sm:px-6 py-16 text-center">
      <div className="inline-block rounded-lg border border-line bg-white/[0.015] px-8 py-10">
        <div className="text-[15px] font-medium mb-2">
          Test market not live yet
        </div>
        <p className="text-[13px] text-fg-dim leading-relaxed max-w-[420px]">
          The SDT/WETH Sepolia contracts have not been deployed (or this
          build is missing their addresses). Check back once the bring-up
          completes.
        </p>
      </div>
    </div>
  );
}

/**
 * ETH / WETH balance strip with faucet + unwrap helpers.
 *
 * - ETH is what the user thinks in; WETH is the on-chain trading leg.
 * - "Unwrap all" returns received WETH to native ETH in one click.
 * - The SDT faucet mints 1,000 test SDT so a fresh wallet can play the
 *   sell side immediately.
 */
function EthWethBar() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const weth = useWeth();
  const sdtToken = useMemo(
    () => TOKENS.find((t) => t.symbol === "SDT")!,
    [],
  );
  const sdtStatus = useTokenStatus(sdtToken);
  const onSepolia = chainId === SEPOLIA_CHAIN_ID;

  if (!isConnected || !onSepolia) return null;

  return (
    <div className="px-3 sm:px-6 pt-3">
      <div className="rounded-md border border-line bg-white/[0.02] px-4 py-3 flex flex-wrap items-center gap-x-8 gap-y-2">
        <BalanceItem label="ETH" value={fmt(weth.ethBalance)} />
        <BalanceItem label="WETH" value={fmt(weth.wethBalance)} />
        <BalanceItem label="SDT" value={fmt(sdtStatus.balance)} />
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={() => weth.unwrap(weth.wethBalance)}
            disabled={weth.wethBalance === 0n || weth.isUnwrapping}
            className="px-3 py-1.5 rounded-md border border-line text-[12px] text-fg-dim hover:text-fg hover:border-line-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {weth.isUnwrapping ? "Unwrapping…" : "Unwrap WETH → ETH"}
          </button>
          <button
            onClick={() => sdtStatus.mintDefault()}
            disabled={sdtStatus.isMinting}
            className="px-3 py-1.5 rounded-md border border-line text-[12px] text-fg-dim hover:text-fg hover:border-line-strong disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {sdtStatus.isMinting ? "Minting…" : "Faucet: mint 1,000 SDT"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BalanceItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] uppercase tracking-[0.14em] text-fg-faint">
        {label}
      </span>
      <span className="font-mono tnum text-[14px]">{value}</span>
    </div>
  );
}

function fmt(raw: bigint): string {
  const s = formatUnits(raw, 18);
  const [whole, frac = ""] = s.split(".");
  const fracTrimmed = frac.slice(0, 4).replace(/0+$/, "");
  const wholeFmt = Number(whole).toLocaleString("en-US");
  return fracTrimmed ? `${wholeFmt}.${fracTrimmed}` : wholeFmt;
}
