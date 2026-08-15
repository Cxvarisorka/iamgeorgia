import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Briefcase, Clock, Users } from "lucide-react";

import { TransferSearch } from "@/components/transfers/TransferSearch";
import { TrustRow } from "@/components/transfers/TrustRow";
import { VehicleIllustration } from "@/components/transfers/VehicleIllustration";
import { Reveal } from "@/components/motion/Reveal";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { transferOffers } from "@/data/transfers";
import { getTransferLocation } from "@/data/transferLocations";
import { plural } from "@/lib/i18n/plural";
import { getI18n } from "@/lib/i18n/server";
import {
  emptyQuery,
  formatDuration,
  getRouteMetrics,
  quoteFor,
  serializeTransferQuery,
} from "@/lib/transfers/query";
import { formatPrice } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.transfers.metaTitle,
    description: t.transfers.metaDescription,
  };
}

/**
 * Routes worth showing on the landing page. Each is priced live from the same
 * engine the results page uses, so the "from" figures can never drift out of
 * step with what a traveller actually sees after searching.
 *
 * The one-line note for each pair lives in `t.transfers.routes.notes`, keyed
 * `from>to`, so the copy travels with the route it describes rather than
 * needing a parallel list in every language.
 */
const popularRoutes = [
  { from: "tbs-airport", to: "tbilisi" },
  { from: "tbs-airport", to: "batumi" },
  { from: "tbs-airport", to: "gudauri" },
  { from: "kut-airport", to: "batumi" },
  { from: "tbilisi", to: "stepantsminda" },
  { from: "tbilisi", to: "sighnaghi" },
];

/** One representative class per size, cheapest-first, for the fleet section. */
const fleetSlugs = [
  "comfort-sedan-private-transfer",
  "premium-suv-private-transfer",
  "comfort-minivan-private-transfer",
  "group-van-private-transfer",
];

export default async function TransfersPage() {
  const { t, path, locale, intlLocale, fill } = await getI18n();

  const sampleQuery = { ...emptyQuery, adults: 2, children: 0, luggage: 2 };
  const sedan = transferOffers[0];

  const routes = popularRoutes
    .map((route) => {
      const query = { ...sampleQuery, from: route.from, to: route.to };
      const metrics = getRouteMetrics(query);
      if (!metrics) return null;
      const quote = quoteFor(sedan, metrics);
      const noteKey = `${route.from}>${route.to}` as keyof typeof t.transfers.routes.notes;
      return {
        ...route,
        note: t.transfers.routes.notes[noteKey],
        fromName: getTransferLocation(route.from, locale)?.name ?? route.from,
        toName: getTransferLocation(route.to, locale)?.name ?? route.to,
        quote,
        href: `${path("/transfers/search")}?${serializeTransferQuery(query)}`,
      };
    })
    .filter((route) => route !== null);

  const fleet = fleetSlugs
    .map((slug) => transferOffers.find((offer) => offer.slug === slug))
    .filter((offer) => offer !== undefined);

  return (
    <>
      <PageHero
        eyebrow={t.transfers.hero.eyebrow}
        title={t.transfers.hero.title}
        description={t.transfers.hero.description}
        image="/images/destinations/gudauri-2.jpg"
        imageAlt={t.transfers.hero.imageAlt}
        size="tall"
      />

      {/* The search widget overlaps the hero, matching the hotels index. The
          overlap has to stay inside the hero's own bottom padding (56px, 64px
          at lg) or it crops the last line of the description. */}
      <Container className="relative z-20 -mt-10 lg:-mt-12">
        <TransferSearch />
      </Container>

      <Container className="pt-16 pb-20 lg:pt-24 lg:pb-24">
        <Reveal>
          <SectionHeading
            eyebrow={t.transfers.intro.eyebrow}
            title={t.transfers.intro.title}
            description={t.transfers.intro.description}
          />
        </Reveal>
        <Reveal delay={0.1}>
          <TrustRow className="mt-12 lg:mt-14" />
        </Reveal>
      </Container>

      <section className="border-y border-line bg-surface-earth/50 py-20 lg:py-24">
        <Container>
          <Reveal>
            <SectionHeading
              eyebrow={t.transfers.routes.eyebrow}
              title={t.transfers.routes.title}
              description={t.transfers.routes.description}
            />
          </Reveal>

          <ul className="mt-12 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {routes.map((route, index) => (
              <li key={`${route.from}-${route.to}`}>
                <Reveal delay={Math.min(index, 3) * 0.06}>
                  <Link
                    href={route.href}
                    className="group flex h-full flex-col justify-between gap-5 border border-line bg-surface p-5 transition-[border-color,box-shadow] duration-300 ease-(--ease-out-soft) hover:border-subtle hover:shadow-card"
                  >
                    <div>
                      <p className="type-h4 flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span>{route.fromName}</span>
                        <ArrowRight
                          size={15}
                          className="shrink-0 text-brand-text rtl:-scale-x-100"
                          aria-hidden
                        />
                        <span className="sr-only"> {t.a11y.to} </span>
                        <span>{route.toName}</span>
                      </p>
                      <p className="type-caption mt-2 text-muted">{route.note}</p>
                    </div>

                    <div className="flex items-end justify-between gap-4 border-t border-line pt-4">
                      <p className="type-caption flex items-center gap-1.5 text-muted">
                        <Clock size={13} aria-hidden />
                        {fill(t.common.approx, {
                          value: formatDuration(route.quote.durationMinutes, {
                            hour: t.common.hourShort,
                            minute: t.common.minuteShort,
                          }),
                        })}
                      </p>
                      <p className="text-end">
                        <span className="type-caption block text-muted">{t.common.from}</span>
                        <span className="type-h4 tabular-nums">
                          {formatPrice(route.quote.price, intlLocale)}
                        </span>
                      </p>
                    </div>
                  </Link>
                </Reveal>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="py-20 lg:py-24">
        <Reveal>
          <SectionHeading
            eyebrow={t.transfers.fleet.eyebrow}
            title={t.transfers.fleet.title}
            description={t.transfers.fleet.description}
          />
        </Reveal>

        <ul className="mt-12 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {fleet.map((offer, index) => (
            <li key={offer.id}>
              <Reveal delay={Math.min(index, 3) * 0.06}>
                <div className="flex aspect-4/3 items-center justify-center rounded-sm bg-surface-earth/70 p-6 text-ink">
                  <VehicleIllustration
                    vehicleClass={offer.vehicleClass}
                    className="max-w-48"
                  />
                </div>
                <h3 className="type-h4 mt-5">{offer.name}</h3>
                <p className="type-caption mt-1 text-muted">
                  {t.transfers.vehicleClasses[offer.vehicleClass]} · {offer.vehicleExample}
                </p>
                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  <li className="type-caption flex items-center gap-1.5 text-body">
                    <Users size={13} className="text-subtle" aria-hidden />
                    {fill(t.transfers.fleet.upTo, {
                      count: plural(locale, offer.maxPassengers, t.units.passenger),
                    })}
                  </li>
                  <li className="type-caption flex items-center gap-1.5 text-body">
                    <Briefcase size={13} className="text-subtle" aria-hidden />
                    {plural(locale, offer.maxLuggage, t.units.largeBag)}
                  </li>
                </ul>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>

      <section className="border-t border-line bg-ink py-20 text-on-dark lg:py-24">
        <Container>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
            <Reveal>
              <h2 className="type-h2 text-on-dark text-balance">{t.transfers.how.title}</h2>
              <p className="type-body-lg mt-5 text-on-dark/75">{t.transfers.how.body}</p>
            </Reveal>

            <Reveal delay={0.1}>
              <ol className="space-y-8">
                {t.transfers.how.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-on-dark/25 text-sm font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <span>
                      <span className="type-h4 block text-on-dark">{step.title}</span>
                      <span className="type-body-sm mt-1.5 block text-on-dark/70">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>

          <p className="type-caption mt-16 border-t border-on-dark/15 pt-6 text-on-dark/50">
            {t.transfers.how.disclaimer}
          </p>
        </Container>
      </section>
    </>
  );
}
