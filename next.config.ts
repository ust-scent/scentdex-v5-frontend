import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strip every `console.*` call from production bundles.
  //
  // Rationale: wagmi/viem can surface upstream error messages (and our own
  // console.warn calls) that embed the failing RPC URL — which contains the
  // Alchemy project key. Removing console.* at build time keeps those
  // runtime traces out of devtools.
  //
  // What this does NOT do: the Alchemy URL itself is read from
  // NEXT_PUBLIC_ALCHEMY_MAINNET_URL, which Next.js inlines as a string
  // literal into the client bundle regardless of this setting — and every
  // viem read fires HTTP to it, so the URL is also visible in the Network
  // tab. Project-key confidentiality therefore relies on the Alchemy
  // dashboard's domain-referer allowlist, not on removeConsole. Rotate the
  // key from Vercel if the allowlist ever becomes insufficient.
  //
  // Dev mode keeps console.* so we can still debug locally.
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production" ? true : false,
  },
};

export default nextConfig;
