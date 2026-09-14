import type { Metadata } from "next";

import { LegalDocument } from "@/components/legal/LegalDocument";
import { getI18n } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return pageMetadata({
    path: "/cookies",
    title: t.legal.cookies.metaTitle,
    description: t.legal.cookies.metaDescription,
  });
}

export default function CookiesPage() {
  return <LegalDocument document="cookies" />;
}
