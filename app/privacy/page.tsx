import fs from "node:fs/promises";
import type { Metadata } from "next";
import path from "node:path";

import { LegalDocLayout } from "@/app/components/LegalDocLayout";
import { getRequestLocale } from "@/lib/locale-server";
import {
  isLegalLocale,
  toLegalLocale,
  type LegalLocale,
} from "@/lib/legal-locale";

export const metadata: Metadata = {
  title: "Privacy Policy — SCENT DEX",
  description:
    "How the SCENT DEX interface operated by Universal Scent Technology Pte. Ltd. handles your information.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

async function readPrivacy(locale: LegalLocale): Promise<string> {
  const file = path.join(
    process.cwd(),
    "content/legal",
    `privacy-${locale}.md`,
  );
  return fs.readFile(file, "utf-8");
}

export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const uiLocale = await getRequestLocale();
  const legalLocale: LegalLocale = isLegalLocale(params.lang)
    ? params.lang
    : toLegalLocale(uiLocale);

  const markdown = await readPrivacy(legalLocale);

  return (
    <LegalDocLayout
      uiLocale={uiLocale}
      legalLocale={legalLocale}
      basePath="/privacy"
      markdown={markdown}
    />
  );
}
