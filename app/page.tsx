import Image from "next/image";
import Link from "next/link";

import { DEFAULT_LOCALE, type SupportedLocale } from "@/lib/i18n";
import { getTranslator } from "@/lib/i18n-dictionary";
import { getRequestLocale } from "@/lib/locale-server";

/**
 * SCENTDEX home / explainer page.
 *
 * Locale comes from the visitor's `locale` cookie (or Accept-Language on the
 * very first visit) — the URL never contains it, matching the convention on
 * scentdays.com and hrz.co.jp. Switching language re-renders this same path
 * with a different cookie via `router.refresh()` from the Header switcher.
 */
export default async function HomePage() {
  const locale = await getRequestLocale();
  const t = getTranslator(locale);

  return (
    <div className="max-w-[960px] mx-auto px-6 sm:px-8 py-12 sm:py-16">
      <Hero
        line1={t("hero.title.line1")}
        line2={t("hero.title.line2")}
        tagline={t("hero.tagline")}
        ctaPrimary={t("hero.cta.primary")}
        ctaSecondary={t("hero.cta.secondary")}
        locale={locale}
      />
      <Divider />

      <section>
        <SectionHeading kicker={t("what.kicker")} title={t("what.title")} />
        <p className="text-[16px] text-fg-dim leading-relaxed mb-6 whitespace-pre-line">
          {t("what.body1")}
        </p>
        {t("what.body2") ? (
          <p className="text-[16px] text-fg-dim leading-relaxed mb-8 whitespace-pre-line">
            {t("what.body2")}
          </p>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FeatureCard title={t("what.card1.title")} body={t("what.card1.body")} />
          <FeatureCard title={t("what.card2.title")} body={t("what.card2.body")} />
          <FeatureCard title={t("what.card3.title")} body={t("what.card3.body")} />
        </div>
      </section>

      <Divider />

      <section>
        <SectionHeading kicker={t("how.kicker")} title={t("how.title")} />
        <div className="space-y-6">
          <FlowBlock
            who={t("how.maker.who")}
            summary={t("how.maker.summary")}
            steps={t("how.maker.steps")}
          />
          <FlowBlock
            who={t("how.taker.who")}
            summary={t("how.taker.summary")}
            steps={t("how.taker.steps")}
          />
        </div>
      </section>

      <Divider />

      <section>
        <SectionHeading kicker={t("permit.kicker")} title={t("permit.title")} />
        <p className="text-[16px] text-fg-dim leading-relaxed mb-6 whitespace-pre-line">
          {t("permit.body1")}
        </p>
        {t("permit.body2") ? (
          <p className="text-[16px] text-fg-dim leading-relaxed mb-6 whitespace-pre-line">
            {t("permit.body2")}
          </p>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <SmallCard
            heading={t("permit.without.heading")}
            tone="bad"
            items={t("permit.without.items")}
          />
          <SmallCard
            heading={t("permit.with.heading")}
            tone="good"
            items={t("permit.with.items")}
          />
        </div>
        <p className="text-[15px] text-fg-faint leading-relaxed">{t("permit.outro")}</p>
      </section>

      <Divider />

      <section>
        <SectionHeading kicker={t("phish.kicker")} title={t("phish.title")} />
        <p className="text-[16px] text-fg-dim leading-relaxed mb-6">{t("phish.body1")}</p>
        <p className="text-[16px] text-fg-dim leading-relaxed mb-8">{t("phish.body2")}</p>
        <div className="space-y-3">
          <RuleCard n="1" title={t("phish.rule1.title")} body={t("phish.rule1.body")} />
          <RuleCard n="2" title={t("phish.rule2.title")} body={t("phish.rule2.body")} />
          <RuleCard n="3" title={t("phish.rule3.title")} body={t("phish.rule3.body")} />
          <RuleCard n="4" title={t("phish.rule4.title")} body={t("phish.rule4.body")} />
        </div>
        <p className="text-[14px] text-fg-faint leading-relaxed mt-6">{t("phish.outro")}</p>
      </section>

      <Divider />

      <section>
        <SectionHeading kicker={t("audit.kicker")} title={t("audit.title")} />
        {t("audit.intro") ? (
          <p className="text-[15px] text-fg-dim leading-relaxed mb-6">{t("audit.intro")}</p>
        ) : null}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AuditRow status="done" label={t("audit.row1.label")} detail={t("audit.row1.detail")} />
          <AuditRow status="done" label={t("audit.row2.label")} detail={t("audit.row2.detail")} />
          <AuditRow status="done" label={t("audit.row3.label")} detail={t("audit.row3.detail")} />
          <AuditRow status="done" label={t("audit.row4.label")} detail={t("audit.row4.detail")} />
          <AuditRow
            status="pending"
            label={t("audit.row5.label")}
            detail={t("audit.row5.detail")}
          />
          <AuditRow
            status="pending"
            label={t("audit.row6.label")}
            detail={t("audit.row6.detail")}
          />
        </div>
        <p className="text-[13px] text-fg-faint leading-relaxed mt-6">
          {t("audit.outro.prefix")}{" "}
          <a
            href={`mailto:${t("audit.outro.contact")}`}
            className="text-accent hover:underline"
          >
            {t("audit.outro.contact")}
          </a>
          .
        </p>
      </section>

      <Divider />

      <section>
        <SectionHeading kicker={t("faq.kicker")} title={t("faq.title")} />
        <div className="space-y-3">
          <FaqItem question={t("faq.q1.q")} answer={t("faq.q1.a")} />
        </div>
      </section>

      <Divider />

      <section className="text-center py-6">
        <h2 className="text-[28px] sm:text-[36px] font-medium tracking-tight mb-3">
          {t("cta.title")}
        </h2>
        <p className="text-[15px] text-fg-dim max-w-[480px] mx-auto leading-relaxed mb-7">
          {t("cta.body")}
        </p>
        <Link
          href="/trade"
          className="inline-flex items-center justify-center px-7 py-3 rounded-md bg-accent text-bg font-medium text-[15px]"
        >
          {t("cta.button")}
        </Link>
      </section>
    </div>
  );
}

function Divider() {
  return <hr className="my-14 sm:my-20 border-line" />;
}

function Hero({
  line1,
  line2,
  tagline,
  ctaPrimary,
  ctaSecondary,
  locale,
}: {
  line1: string;
  line2: string;
  tagline: string;
  ctaPrimary: string;
  ctaSecondary: string;
  locale: SupportedLocale;
}) {
  void locale;
  void DEFAULT_LOCALE;
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
        {line1}
        <br />
        {line2}
      </h1>
      <p className="text-[17px] sm:text-[19px] text-fg-dim max-w-[560px] mx-auto leading-relaxed mb-9">
        {tagline}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/trade"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-accent text-bg font-medium text-[15px] hover:opacity-90 transition-opacity"
        >
          {ctaPrimary}
        </Link>
        <a
          href="https://github.com/ust-scent/scentdex-v5"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center justify-center px-6 py-3 rounded-md border border-line text-fg-dim hover:text-fg hover:border-line-strong text-[15px]"
        >
          {ctaSecondary}
        </a>
      </div>
    </section>
  );
}

function SectionHeading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] font-mono uppercase tracking-[0.16em] text-accent mb-2">
        {kicker}
      </div>
      <h2 className="text-[26px] sm:text-[32px] font-medium tracking-tight">{title}</h2>
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
  steps: readonly string[];
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
  items: readonly string[];
}) {
  const accent =
    tone === "good" ? "border-buy/30 bg-buy/[0.03]" : "border-sell/30 bg-sell/[0.03]";
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

function RuleCard({ n, title, body }: { n: string; title: string; body: string }) {
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

function FaqItem({ question, answer }: { question: string; answer: string }) {
  return (
    <details className="group border border-line rounded-lg bg-white/[0.015] open:bg-white/[0.025]">
      <summary className="cursor-pointer list-none px-5 py-4 flex items-start justify-between gap-3 text-[15px] font-medium text-fg">
        <span>{question}</span>
        <span
          aria-hidden="true"
          className="shrink-0 mt-1 text-fg-faint font-mono text-[14px] group-open:rotate-45 transition-transform"
        >
          +
        </span>
      </summary>
      <div className="px-5 pb-5 -mt-1 text-[14px] text-fg-dim leading-relaxed whitespace-pre-line">
        {answer}
      </div>
    </details>
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
