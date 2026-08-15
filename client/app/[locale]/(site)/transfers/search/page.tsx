import type { Metadata } from "next";
import { Suspense } from "react";

import { TransferResults } from "@/components/transfers/TransferResults";
import { TransferSteps } from "@/components/transfers/TransferSteps";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { TransferCardSkeleton } from "@/components/ui/Skeleton";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.transfers.results.metaTitle,
    description: t.transfers.results.metaDescription,
    // A result set is specific to one traveller's query and has nothing to
    // offer an index — the landing page is the page worth ranking.
    robots: { index: false, follow: true },
  };
}

export default async function TransferSearchPage() {
  const { t, path } = await getI18n();

  return (
    <>
      <Container className="pt-8">
        <Breadcrumbs
          items={[
            { label: t.common.home, href: path("/") },
            { label: t.nav.transfers, href: path("/transfers") },
            { label: t.transfers.results.title },
          ]}
        />
        <h1 className="type-h1 mt-6">{t.transfers.results.title}</h1>
        <TransferSteps current={2} className="mt-6" />
      </Container>

      {/* `TransferResults` reads the journey from the URL, so it has to sit
          behind a boundary for this route to prerender. */}
      <Suspense fallback={<ResultsFallback />}>
        <TransferResults />
      </Suspense>
    </>
  );
}

function ResultsFallback() {
  return (
    <Container className="pt-8 pb-24 lg:pb-32">
      <div className="flex flex-col gap-5">
        {Array.from({ length: 4 }, (_, index) => (
          <TransferCardSkeleton key={index} />
        ))}
      </div>
    </Container>
  );
}
