import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strip every `console.*` call from production bundles.
  //
  // Rationale: wagmi/viem can surface upstream error messages that include
  // the failing RPC URL — and our RPC URL embeds the Alchemy API key. Even
  // our own `console.warn` calls leak API paths into devtools. To keep
  // endpoint URLs, API keys, and internal error traces out of the browser
  // console entirely, the Next.js compiler removes every console call at
  // build time. Dev mode keeps them so we can still debug locally.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? true : false,
  },
};

export default nextConfig;
