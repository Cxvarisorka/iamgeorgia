import type { Metadata } from "next";
import { Suspense } from "react";

import { TransferResults } from "@/components/transfers/TransferResults";
import { TransferSteps } from "@/components/transfers/TransferSteps";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { TransferCardSkeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api/client";
import { quoteTransfers } from "@/lib/api/transfers";
import { getI18n } from "@/lib/i18n/server";
import { paramsFromSearchParams, parseTransferQuery } from "@/lib/transfers/query";
import type { TransferQuoteResult } from "@/types/transfer";

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

/**
 * The results page.
 *
 * The quote runs here rather than in the browser, which is the whole point of
 * moving pricing to the server: the fares are computed once, against the live
 * catalogue, and arrive with the HTML. `TransferResults` still owns filtering
 * and sorting, because those act on results already in hand.
 *
 * The server has several ways of declining to quote and none of them is an
 * error page — a party too large, a pick-up too soon, a place we do not serve.
 * Each comes back with a `reason`, and each is turned into a sentence.
 */
export default async function TransferSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { t, path, locale } = await getI18n();
  const params = await searchParams;
  const query = parseTransferQuery(paramsFromSearchParams(params));

  let result: TransferQuoteResult | null = null;
  let unavailableReason: string | null = null;

  if (query.from && query.to && query.from !== query.to && query.date && query.time) {
    try {
      result = await quoteTransfers({
        from: query.from,
        to: query.to,
        date: query.date,
        time: query.time,
        tripType: query.type === "return" ? "RETURN" : "ONE_WAY",
        returnDate: query.type === "return" ? query.returnDate : undefined,
        returnTime: query.type === "return" ? query.returnTime : undefined,
        adults: query.adults,
        children: query.children,
        luggage: query.luggage,
        cabinBags: query.cabinBags,
        locale,
      });
    } catch (error) {
      if (error instanceof ApiError) {
        const reason = (error.details as { reason?: string } | undefined)?.reason;

        unavailableReason =
          reason && reason in t.transfers.results.unavailable
            ? t.transfers.results.unavailable[
                reason as keyof typeof t.transfers.results.unavailable
              ]
            : error.message;
      } else {
        throw error;
      }
    }
  }

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
        <TransferResults result={result} unavailableReason={unavailableReason} />
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
