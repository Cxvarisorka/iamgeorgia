import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { getI18n } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return pageMetadata({
    path: "/privacy",
    title: t.legal.privacy.metaTitle,
    description: t.legal.privacy.metaDescription,
  });
}

export default function PrivacyPage() {
  return <LegalDocument document="privacy" />;
}
