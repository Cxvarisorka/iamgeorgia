import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { getI18n } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return pageMetadata({
    path: "/terms",
    title: t.legal.terms.metaTitle,
    description: t.legal.terms.metaDescription,
  });
}

export default function TermsPage() {
  return <LegalDocument document="terms" />;
}
