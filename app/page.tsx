import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="max-w-[960px] mx-auto px-6 sm:px-8 py-12 sm:py-16">
      <Hero />
      <Divider />
      <WhatIsSCENTDEX />
      <Divider />
      <HowItWorks />
      <Divider />
      <Permit2Section />
      <Divider />
      <PhishingSafety />
      <Divider />
      <AuditPosture />
      <Divider />
      <FinalCTA />
    </div>
  );
}

function Divider() {
  return <hr className="my-14 sm:my-20 border-line" />;
}

function Hero() {
  return (
    <section className="text-center pt-4 sm:pt-12">
      <Image
        src="/logo.svg"
        alt="SCENTDEX"
        width={120}
        height={120}
        priority
        className="mx-auto mb-8"
        style={{ filter: "drop-shadow(0 0 36px rgba(138, 92, 255, 0.4))" }}
      />
      <h1 className="text-[44px] sm:text-[64px] font-medium tracking-tight leading-[0.95] mb-5">
        Trade Scent Token,
        <br />
        peer to peer.
      </h1>
      <p className="text-[17px] sm:text-[19px] text-fg-dim max-w-[560px] mx-auto leading-relaxed mb-9">
        SCENTDEX is a limit-order exchange where you trade directly with
        another wallet. <strong className="text-fg">No escrow</strong>. <strong className="text-fg">No custody</strong>.
        Your funds stay in your wallet until the moment a trade settles.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/trade"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-accent text-bg font-medium text-[15px] hover:opacity-90 transition-opacity"
        >
          Start trading on Sepolia →
        </Link>
        <a
          href="https://github.com/ust-scent/scentdex-v5"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-line text-fg-dim hover:text-fg hover:border-line-strong text-[15px]"
        >
          View source
        </a>
      </div>
    </section>
  );
}

function WhatIsSCENTDEX() {
  return (
    <section>
      <SectionHeading kicker="01" title="What is SCENTDEX?" />
      <p className="text-[16px] text-fg-dim leading-relaxed mb-8">
        SCENTDEX is a decentralised exchange built specifically for Scent
        Token (SCENT). Unlike pool-based DEXs (Uniswap, Curve), SCENTDEX is a
        true <strong className="text-fg">limit-order book</strong> — you set
        your price, your terms, your expiry, and the contract matches you with
        another wallet that agrees.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FeatureCard
          title="Zero on-chain escrow"
          body="The contract never holds your tokens. Both sides settle atomically the instant a fill happens — or the entire transaction reverts."
        />
        <FeatureCard
          title="Audit-first design"
          body="Internal red team + 4 rounds of multi-agent automated review + 5 industry static-analysis tools, all clean. External formal audit before any TVL ramp."
        />
        <FeatureCard
          title="EIP-712 signed orders"
          body="Orders live off-chain as signed messages. Cancel costs nothing, change your mind anytime, and your private key signs only what the wallet shows you."
        />
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section>
      <SectionHeading kicker="02" title="How a trade works" />

      <div className="space-y-6">
        <FlowBlock
          who="Maker"
          summary="Wants to sell SCENT for JPYC at a price they choose"
          steps={[
            "Connect wallet (MetaMask, Rabby, Coinbase Wallet — any standard EOA)",
            "One-time: approve Permit2 for each token (1 transaction per token, ever)",
            "Open Place Order, set price + amount + expiry",
            "Sign the order — this is just a message, no transaction, no gas",
            "The order appears on the public book until someone fills it or you cancel",
          ]}
        />
        <FlowBlock
          who="Taker"
          summary="Sees the order, agrees to the price, and fills it"
          steps={[
            "Browse the order book, click the price level you want",
            "Sign + submit a fill transaction — settles in one block",
            "Maker's SCENT moves to taker, taker's JPYC moves to maker, fee moves to treasury — all atomic, all in one tx",
            "If any leg fails (insufficient balance, allowance revoked, expiry passed), the whole transaction reverts. No partial state.",
          ]}
        />
      </div>
    </section>
  );
}

function Permit2Section() {
  return (
    <section>
      <SectionHeading kicker="03" title="What is Permit2?" />

      <p className="text-[16px] text-fg-dim leading-relaxed mb-6">
        Permit2 is a small contract built by Uniswap that solves a real
        annoyance: <strong className="text-fg">approving every dApp separately</strong>.
        Instead, you approve Permit2 once per token, and from then on every
        compatible dApp uses signed messages — not transactions — to ask
        permission for specific trades.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <SmallCard
          heading="Without Permit2"
          tone="bad"
          items={[
            "approve(Uniswap, MAX) — gas tx",
            "approve(SCENTDEX, MAX) — gas tx",
            "approve(some-other-DEX, MAX) — gas tx",
            "Each tx costs gas + a confirmation",
          ]}
        />
        <SmallCard
          heading="With Permit2"
          tone="good"
          items={[
            "approve(Permit2, MAX) — once, per token",
            "Sign a message for each trade (free, no tx)",
            "Permit2 routes the transfer atomically",
            "Same allowance shared across compatible dApps",
          ]}
        />
      </div>

      <p className="text-[15px] text-fg-faint leading-relaxed">
        SCENTDEX uses Permit2 because it lets the maker → taker → treasury
        legs of a fill happen in a single atomic transaction, with no
        per-trade approval overhead. The trade-off is that the security model
        moves from "approve a specific contract" to "trust the message my
        wallet shows me before I sign it." That's where phishing risk comes in
        — see the next section.
      </p>
    </section>
  );
}

function PhishingSafety() {
  return (
    <section>
      <SectionHeading kicker="04" title="How we keep you safe from phishing" />

      <p className="text-[16px] text-fg-dim leading-relaxed mb-6">
        In 2024, attackers stole roughly{" "}
        <strong className="text-fg">$314M from ~260,000 wallets</strong> using
        Permit2-style typed-data phishing. Most victims signed a message on a
        cloned site that looked legitimate, not realising the signature was a
        blank cheque.
      </p>
      <p className="text-[16px] text-fg-dim leading-relaxed mb-8">
        Before SCENTDEX asks your wallet to sign anything, we run{" "}
        <strong className="text-fg">four checks in front of you</strong>. If any
        fails, the Sign button is replaced with a red warning and a 3-second
        hold-to-confirm — never a blind click.
      </p>

      <div className="space-y-3">
        <RuleCard
          n="1"
          title="Domain check"
          body="The contract you're signing for must match the official SCENTDEX V5 deploy on the network you're connected to. A cloned site signing for a different contract address fails this check."
        />
        <RuleCard
          n="2"
          title="Self check"
          body="The maker address inside the order must match your connected wallet. If a phishing payload is asking you to sign on behalf of another address, this catches it."
        />
        <RuleCard
          n="3"
          title="Floor check"
          body="The taker amount must be above the per-token safety floor. A bait order ('sell 1M SCENT for 2 wei') fails this even if you didn't notice the numbers."
        />
        <RuleCard
          n="4"
          title="Ratio check"
          body="The price ratio must be within the configured cap. Extreme prices (giving away tokens at 1/1000th of market) fail this."
        />
      </div>

      <p className="text-[14px] text-fg-faint leading-relaxed mt-6">
        We also show every signature request as a{" "}
        <strong className="text-fg-dim">plain-language summary</strong>: "You
        give X, you receive at least Y after Z fee, expires on D." If that
        sentence doesn't match what you intended, don't sign.
      </p>
    </section>
  );
}

function AuditPosture() {
  return (
    <section>
      <SectionHeading kicker="05" title="Audit & operations" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AuditRow
          status="done"
          label="Internal red team review"
          detail="6 specialised UST agents covered threat intel, contract design, red team strategy, exploit engineering, static audit, and governance"
        />
        <AuditRow
          status="done"
          label="4 rounds of /ultrareview (Anthropic)"
          detail="Round 4 returned 0 findings on the source-only review branch"
        />
        <AuditRow
          status="done"
          label="5-tools static analysis"
          detail="Slither, Mythril, Aderyn, Wake, 4naly3er — all clean on the V5 contract"
        />
        <AuditRow
          status="done"
          label="Secondary review (Codex tool)"
          detail="3 findings, 2 adopted into r6, 1 documented design choice"
        />
        <AuditRow
          status="pending"
          label="External formal audit"
          detail="To be commissioned ahead of any meaningful TVL ramp on mainnet"
        />
        <AuditRow
          status="pending"
          label="Bug bounty program"
          detail="Post-mainnet, via Immunefi or equivalent"
        />
      </div>

      <p className="text-[13px] text-fg-faint leading-relaxed mt-6">
        Source code lives at{" "}
        <a
          href="https://github.com/ust-scent/scentdex-v5"
          target="_blank"
          rel="noopener"
          className="text-accent hover:underline"
        >
          github.com/ust-scent/scentdex-v5
        </a>
        . Independent reviewers and security researchers are invited to read
        it. Found something? Email{" "}
        <a
          href="mailto:cs@scenttoken.com"
          className="text-accent hover:underline"
        >
          cs@scenttoken.com
        </a>
        .
      </p>
    </section>
  );
}

function FinalCTA() {
  return (
    <section className="text-center py-6">
      <h2 className="text-[28px] sm:text-[36px] font-medium tracking-tight mb-3">
        Ready to test?
      </h2>
      <p className="text-[15px] text-fg-dim max-w-[480px] mx-auto leading-relaxed mb-7">
        SCENTDEX is currently in <strong className="text-fg">testnet preview</strong> on Sepolia.
        Connect MetaMask, get test tokens from the in-app faucet, and try a
        signed order. No real funds at risk.
      </p>
      <Link
        href="/trade"
        className="inline-flex items-center justify-center px-7 py-3 rounded-md bg-accent text-bg font-medium text-[15px]"
      >
        Open the trade interface →
      </Link>
    </section>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-accent mb-2">
        {kicker}
      </div>
      <h2 className="text-[26px] sm:text-[32px] font-medium tracking-tight">
        {title}
      </h2>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="border border-line rounded-lg p-5 bg-white/[0.015]">
      <div className="font-medium text-[15px] mb-2">{title}</div>
      <p className="text-[14px] text-fg-dim leading-relaxed">{body}</p>
    </div>
  );
}

function FlowBlock({
  who,
  summary,
  steps,
}: {
  who: string;
  summary: string;
  steps: string[];
}) {
  return (
    <div className="border border-line rounded-lg p-5 bg-white/[0.015]">
      <div className="flex items-baseline gap-3 mb-1">
        <span className="text-[11px] font-mono uppercase tracking-[0.14em] text-accent">
          {who}
        </span>
        <span className="text-[14px] text-fg">{summary}</span>
      </div>
      <ol className="list-decimal list-inside space-y-1.5 mt-4 text-[14px] text-fg-dim leading-relaxed marker:text-fg-faint">
        {steps.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ol>
    </div>
  );
}

function SmallCard({
  heading,
  tone,
  items,
}: {
  heading: string;
  tone: "good" | "bad";
  items: string[];
}) {
  const accent = tone === "good" ? "border-buy/30 bg-buy/[0.03]" : "border-sell/30 bg-sell/[0.03]";
  const dot = tone === "good" ? "bg-buy" : "bg-sell";
  return (
    <div className={`border ${accent} rounded-lg p-4`}>
      <div className="font-medium text-[14px] mb-3">{heading}</div>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px] text-fg-dim">
            <span
              className={`mt-1.5 w-1 h-1 rounded-full ${dot} shrink-0`}
              aria-hidden="true"
            />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RuleCard({
  n,
  title,
  body,
}: {
  n: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 p-4 border border-line rounded-lg bg-white/[0.015]">
      <div
        className="shrink-0 w-8 h-8 rounded-full bg-accent text-bg flex items-center justify-center font-mono font-bold text-[14px]"
        aria-hidden="true"
      >
        {n}
      </div>
      <div>
        <div className="font-medium text-[15px] mb-1">{title}</div>
        <p className="text-[14px] text-fg-dim leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function AuditRow({
  status,
  label,
  detail,
}: {
  status: "done" | "pending";
  label: string;
  detail: string;
}) {
  const isDone = status === "done";
  return (
    <div className="border border-line rounded-lg p-4 bg-white/[0.015]">
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 mt-0.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono ${
            isDone ? "bg-buy/20 text-buy" : "bg-fg-faint/20 text-fg-faint"
          }`}
          aria-hidden="true"
        >
          {isDone ? "✓" : "·"}
        </span>
        <div>
          <div className="font-medium text-[14px] mb-1">{label}</div>
          <p className="text-[13px] text-fg-dim leading-relaxed">{detail}</p>
        </div>
      </div>
    </div>
  );
}
