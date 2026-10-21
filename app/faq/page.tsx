import { MarkdownDoc } from "@/app/components/MarkdownDoc";
import { getTranslator } from "@/lib/i18n-dictionary";
import { getRequestLocale } from "@/lib/locale-server";

export default async function FaqPage() {
  const locale = await getRequestLocale();
  const t = getTranslator(locale);

  const entries = [
    {
      id: "order-not-filled",
      title: t("faq.notFilled.title"),
      body: t("faq.notFilled.body"),
    },
    {
      id: "how-it-works",
      title: t("faq.howItWorks.title"),
      body: t("faq.howItWorks.body"),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-6">
        {t("faq.page.title")}
      </h1>

      {entries.map((entry) => (
        <section
          key={entry.id}
          id={entry.id}
          className="mb-10 scroll-mt-20 border-t border-line pt-8 first:border-t-0 first:pt-0"
        >
          <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-4">
            {entry.title}
          </h2>
          <MarkdownDoc source={entry.body} />
        </section>
      ))}
    </div>
  );
}
