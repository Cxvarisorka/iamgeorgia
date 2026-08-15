import type { Metadata } from "next";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { TransferBookingForm } from "@/components/transfers/TransferBookingForm";
import { TransferBookingSummary } from "@/components/transfers/TransferBookingSummary";
import { TransferSteps } from "@/components/transfers/TransferSteps";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { getTransferOfferBySlug } from "@/data/transfers";
import { getI18n } from "@/lib/i18n/server";
import {
  getRouteMetrics,
  paramsFromSearchParams,
  parseTransferQuery,
  quoteFor,
  serializeTransferQuery,
  totalFor,
} from "@/lib/transfers/query";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.transfers.booking.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default async function TransferBookingPage(
  props: PageProps<"/[locale]/transfers/booking">,
) {
  const [searchParams, { t, path, locale, intlLocale }] = await Promise.all([
    props.searchParams,
    getI18n(),
  ]);

  const params = paramsFromSearchParams(searchParams);
  const query = parseTransferQuery(params);
  const offer = getTransferOfferBySlug(params.get("offer") ?? "", locale);
  const route = getRouteMetrics(query);
  const quote = offer && route ? quoteFor(offer, route) : null;

  /* Arriving here without a chosen transfer means a stale or hand-typed link. */
  if (!offer || !quote) {
    return (
      <Container className="py-24">
        <EmptyState
          title={t.transfers.booking.noTransferTitle}
          description={t.transfers.booking.noTransferBody}
          action={{
            label: t.transfers.booking.searchTransfers,
            href: path("/transfers"),
          }}
        />
      </Container>
    );
  }

  const detailHref = `${path(`/transfers/${offer.slug}`)}?${serializeTransferQuery(query)}`;

  return (
    <Container className="pt-8 pb-24 lg:pb-32">
      <Breadcrumbs
        items={[
          { label: t.common.home, href: path("/") },
          { label: t.nav.transfers, href: path("/transfers") },
          { label: offer.name, href: detailHref },
          { label: t.transfers.booking.breadcrumb },
        ]}
      />

      <TransferSteps current={3} className="mt-6" />

      <h1 className="type-h1 mt-6">{t.transfers.booking.title}</h1>
      <p className="type-body-lg mt-4 max-w-2xl text-body">{t.transfers.booking.intro}</p>

      {/* On a phone the summary sits above the form and collapses, so the
          traveller can confirm the total without scrolling past every field —
          and gets straight to typing once they have. Native `<details>`, so it
          works before hydration and is keyboard-operable for free. */}
      <details className="group mt-10 lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 border border-line bg-surface px-4 py-3.5">
          <span className="type-h4">{t.transfers.summary.transferSummary}</span>
          <span className="flex items-center gap-3">
            <span className="type-h4 tabular-nums">
              {formatPrice(totalFor(quote, query), intlLocale)}
            </span>
            <ChevronDown
              size={18}
              className="text-muted transition-transform duration-200 group-open:rotate-180"
              aria-hidden
            />
          </span>
        </summary>
        <TransferBookingSummary quote={quote} query={query} className="mt-2" />
      </details>

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">
        <div className="min-w-0 lg:col-span-7">
          <TransferBookingForm offer={offer} query={query} />

          <Button href={detailHref} variant="ghost" className="mt-6">
            <ArrowLeft size={16} className="rtl:-scale-x-100" aria-hidden />
            {t.transfers.booking.back}
          </Button>
        </div>

        <aside className="hidden lg:col-span-5 lg:block">
          <div className="lg:sticky lg:top-36">
            <h2 className="type-h4 mb-4">{t.transfers.summary.transferSummary}</h2>
            <TransferBookingSummary quote={quote} query={query} />
          </div>
        </aside>
      </div>
    </Container>
  );
}
