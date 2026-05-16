import fs from "node:fs/promises";
import type { Metadata } from "next";
import path from "node:path";

import { LegalDocLayout } from "@/app/components/LegalDocLayout";
import { getRequestLocale } from "@/lib/locale-server";
import { toLegalLocale, type LegalLocale } from "@/lib/legal-locale";

export const metadata: Metadata = {
  title: "Terms of Service — SCENT DEX",
  description:
    "The terms governing your use of the SCENT DEX interface operated by Universal Scent Technology Pte. Ltd.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

async function readTerms(locale: LegalLocale): Promise<string> {
  const file = path.join(process.cwd(), "content/legal", `terms-${locale}.md`);
  return fs.readFile(file, "utf-8");
}

export default async function TermsPage() {
  const uiLocale = await getRequestLocale();
  const legalLocale = toLegalLocale(uiLocale);
  const markdown = await readTerms(legalLocale);

  return (
    <LegalDocLayout
      uiLocale={uiLocale}
      legalLocale={legalLocale}
      markdown={markdown}
    />
  );
}
