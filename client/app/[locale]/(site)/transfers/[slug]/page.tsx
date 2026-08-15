import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Briefcase, Check, Clock, Info, MapPin, Route, Users, X } from "lucide-react";

import { featureIcons } from "@/components/transfers/featureIcons";
import { TransferBookingSummary } from "@/components/transfers/TransferBookingSummary";
import { TransferGallery } from "@/components/transfers/TransferGallery";
import { TransferJourneyBar } from "@/components/transfers/TransferJourneyBar";
import { TransferSteps } from "@/components/transfers/TransferSteps";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Rating } from "@/components/ui/Rating";
import { ShareSave } from "@/components/ui/ShareSave";
import { getTransferOfferBySlug } from "@/data/transfers";
import { getTransferLocation } from "@/data/transferLocations";
import { getI18n } from "@/lib/i18n/server";
import {
  formatDuration,
  getRouteMetrics,
  paramsFromSearchParams,
  parseTransferQuery,
  quoteFor,
  serializeTransferQuery,
  totalFor,
} from "@/lib/transfers/query";
import { formatPrice } from "@/lib/utils";

/**
 * A quote for one vehicle class on one journey.
 *
 * Deliberately not prerendered: the page reads the journey from the query
 * string, and a price for a specific route, date and party is not something to
 * serve from a cache built at deploy time.
 */

export async function generateMetadata(
  props: PageProps<"/[locale]/transfers/[slug]">,
): Promise<Metadata> {
  const [{ slug }, { t, locale, fill }] = await Promise.all([props.params, getI18n()]);
  const offer = getTransferOfferBySlug(slug, locale);
  if (!offer) return { title: t.transfers.detail.notFound };

  return {
    title: fill(t.transfers.detail.metaTitle, { name: offer.name }),
    description: offer.summary,
    robots: { index: false, follow: true },
  };
}

export default async function TransferDetailPage(
  props: PageProps<"/[locale]/transfers/[slug]">,
) {
  const [{ slug }, searchParams, { t, path, locale, intlLocale, fill }] = await Promise.all([
    props.params,
    props.searchParams,
    getI18n(),
  ]);

  const offer = getTransferOfferBySlug(slug, locale);
  if (!offer) notFound();

  const query = parseTransferQuery(paramsFromSearchParams(searchParams));
  const route = getRouteMetrics(query);
  const quote = route ? quoteFor(offer, route) : null;

  const from = getTransferLocation(query.from, locale);
  const to = getTransferLocation(query.to, locale);
  const passengers = Math.max(1, query.adults + query.children);

  const journeyQuery = serializeTransferQuery(query);
  const backHref = `${path("/transfers/search")}?${journeyQuery}&selected=${offer.slug}`;
  const continueHref = `${path("/transfers/booking")}?${journeyQuery}&offer=${offer.slug}`;

  const duration = quote
    ? formatDuration(quote.durationMinutes, {
        hour: t.common.hourShort,
        minute: t.common.minuteShort,
      })
    : null;

  /**
   * The heading names the journey when we know it, and the vehicle when we do
   * not — a traveller who arrived from a search wants to see their own route
   * confirmed, and one who landed here cold needs to know what the page is.
   */
  const title =
    from && to
      ? fill(t.transfers.detail.titleRoute, {
          kind:
            offer.kind === "private"
              ? t.transfers.detail.kindPrivate
              : t.transfers.detail.kindShared,
          from: from.name,
          to: to.name,
        })
      : fill(t.transfers.detail.titleFallback, {
          name: offer.name,
          kind:
            offer.kind === "private"
              ? t.transfers.detail.kindPrivateLower
              : t.transfers.detail.kindSharedLower,
        });

  const keyFacts = [
    {
      icon: MapPin,
      label: t.transfers.detail.pickUp,
      value: from?.name ?? t.transfers.detail.notSelected,
    },
    {
      icon: MapPin,
      label: t.transfers.detail.destination,
      value: to?.name ?? t.transfers.detail.notSelected,
    },
    {
      icon: Clock,
      label: t.transfers.detail.journeyTime,
      value: duration ? fill(t.common.approx, { value: duration }) : "—",
    },
    {
      icon: Route,
      label: t.transfers.detail.distance,
      value: quote ? fill(t.transfers.detail.kmByRoad, { count: quote.distanceKm }) : "—",
    },
    {
      icon: Users,
      label: t.transfers.detail.vehicle,
      value: `${t.transfers.vehicleClasses[offer.vehicleClass]} · ${offer.vehicleExample}`,
    },
    {
      icon: Users,
      label: t.transfers.detail.passengers,
      value: quote
        ? fill(t.transfers.detail.upToTravelling, {
            max: offer.maxPassengers,
            count: passengers,
          })
        : fill(t.transfers.detail.upTo, { max: offer.maxPassengers }),
    },
    {
      icon: Briefcase,
      label: t.transfers.detail.luggage,
      value: fill(t.transfers.detail.luggageValue, {
        large: offer.maxLuggage,
        cabin: offer.maxCabinBags,
      }),
    },
  ];

  return (
    <>
      <Container className="pt-8 pb-6">
        <Breadcrumbs
          items={[
            { label: t.common.home, href: path("/") },
            { label: t.nav.transfers, href: path("/transfers") },
            ...(quote ? [{ label: t.transfers.results.title, href: backHref }] : []),
            { label: offer.name },
          ]}
        />

        <TransferSteps current={2} className="mt-6" />

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={offer.kind === "private" ? "brand" : "neutral"}>
                {offer.kind === "private"
                  ? t.transfers.kinds.privateTransfer
                  : t.transfers.kinds.sharedTransfer}
              </Badge>
              <Badge tone="outline">{t.transfers.vehicleClasses[offer.vehicleClass]}</Badge>
            </div>
            <h1 className="type-h1 mt-4 text-balance">{title}</h1>
            <p className="type-body-sm mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
              <span className="font-medium text-ink">{offer.provider.name}</span>
              <Rating
                value={offer.provider.rating}
                reviewCount={offer.provider.reviewCount}
              />
              <span>·</span>
              <span>
                {fill(t.transfers.detail.yearsOperating, { count: offer.provider.yearsActive })}
              </span>
            </p>
          </div>

          <div className="shrink-0">
            <ShareSave title={offer.name} />
          </div>
        </div>
      </Container>

      {quote && (
        <Container className="pb-6">
          <TransferJourneyBar query={query} />
        </Container>
      )}

      <Container className="pb-28 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="min-w-0 lg:col-span-8">
            <TransferGallery offer={offer} from={from} to={to} />

            <section className="mt-12">
              <h2 className="type-h2">{t.transfers.detail.keyInformation}</h2>
              <dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
                {keyFacts.map((fact) => (
                  <div
                    key={fact.label}
                    className="flex gap-3 border-b border-line py-3.5"
                  >
                    <fact.icon
                      size={16}
                      className="mt-0.5 shrink-0 text-brand-text"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <dt className="type-caption text-muted">{fact.label}</dt>
                      <dd className="type-body-sm mt-0.5 font-medium text-ink">
                        {fact.value}
                      </dd>
                    </div>
                  </div>
                ))}
              </dl>
            </section>

            <section className="mt-14 border-t border-line pt-12">
              <h2 className="type-h2">{t.transfers.detail.about}</h2>
              <p className="type-body-lg mt-5 text-body">{offer.summary}</p>
              <div className="mt-5 space-y-5">
                {offer.description.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="type-body text-body">
                    {paragraph}
                  </p>
                ))}
              </div>

              <h3 className="type-h4 mt-10">{t.transfers.detail.onBoard}</h3>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {offer.features.map((feature) => {
                  const Icon = featureIcons[feature];
                  return (
                    <li key={feature} className="flex items-center gap-2.5">
                      <Icon size={16} className="shrink-0 text-brand-text" aria-hidden />
                      <span className="type-body-sm text-body">
                        {t.transfers.features[feature]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>

            <section className="mt-14 border-t border-line pt-12">
              <div className="grid gap-10 sm:grid-cols-2 sm:gap-12">
                <div>
                  <h2 className="type-h3">{t.transfers.detail.included}</h2>
                  <ul className="mt-5 space-y-3">
                    {offer.included.map((item) => (
                      <li key={item} className="flex gap-3">
                        <Check size={17} className="mt-0.5 shrink-0 text-success" aria-hidden />
                        <span className="type-body-sm text-body">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h2 className="type-h3">{t.transfers.detail.excluded}</h2>
                  <ul className="mt-5 space-y-3">
                    {offer.excluded.map((item) => (
                      <li key={item} className="flex gap-3">
                        <X size={17} className="mt-0.5 shrink-0 text-subtle" aria-hidden />
                        <span className="type-body-sm text-muted">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="mt-14 border-t border-line pt-12">
              <h2 className="type-h2">{t.transfers.detail.howPickupWorks}</h2>
              <p className="type-body mt-5 text-body">{offer.pickupProcedure}</p>

              <div className="mt-8 flex gap-3.5 rounded-sm bg-surface-soft p-5">
                <Info size={18} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
                <div>
                  <h3 className="type-h4">{t.transfers.detail.beforeTheDay}</h3>
                  <p className="type-body-sm mt-2 text-body">
                    {t.transfers.detail.beforeTheDayBody}
                  </p>
                </div>
              </div>

              <h3 className="type-h4 mt-10">{t.transfers.detail.cancellation}</h3>
              <p className="type-body-sm mt-3 text-body">{offer.cancellation}</p>
              <p className="type-caption mt-3 text-subtle">
                {fill(t.transfers.detail.cancellationNote, {
                  provider: offer.provider.name,
                })}
              </p>
            </section>
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-36">
              {quote ? (
                <>
                  <TransferBookingSummary quote={quote} query={query}>
                    <Button href={continueHref} size="lg" fullWidth>
                      {t.actions.continue}
                    </Button>
                    <Button href={backHref} variant="ghost" fullWidth className="mt-2">
                      {t.transfers.detail.backToResults}
                    </Button>
                  </TransferBookingSummary>
                  <p className="type-caption mt-4 text-center text-subtle">
                    {t.transfers.detail.noPaymentStep}
                  </p>
                </>
              ) : (
                <div className="border border-line bg-surface p-6 shadow-card">
                  <h2 className="type-h4">{t.transfers.detail.priceThis}</h2>
                  <p className="type-body-sm mt-3 text-muted">
                    {t.transfers.detail.priceThisBody}
                  </p>
                  <Button href={path("/transfers")} size="lg" fullWidth className="mt-6">
                    {t.transfers.detail.startSearch}
                  </Button>
                </div>
              )}
            </div>
          </aside>
        </div>
      </Container>

      {/* Mobile action bar — the same pattern as the hotel detail page. */}
      {quote && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 backdrop-blur-md lg:hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <p>
              <span className="type-caption block text-muted">{t.common.total}</span>
              <span className="type-h4 tabular-nums">
                {formatPrice(totalFor(quote, query), intlLocale)}
              </span>
            </p>
            <Button href={continueHref} size="md">
              {t.actions.continue}
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
