import type { Metadata } from "next";
import { CalendarSearch } from "lucide-react";

import { Reveal } from "@/components/motion/Reveal";
import { TourCard } from "@/components/tours/TourCard";
import { TourExplorer } from "@/components/tours/TourExplorer";
import { TourResultCard } from "@/components/tours/TourResultCard";
import { TourSearchForm } from "@/components/tours/TourSearchForm";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/ui/PageHero";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { listPublicTours, searchTours } from "@/lib/api/tours";
import { formatStayDate } from "@/lib/booking/stay";
import { plural } from "@/lib/i18n/plural";
import { getI18n } from "@/lib/i18n/server";
import { tourStayFromParams } from "@/lib/tours/query";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.tours.metaTitle, description: t.tours.metaDescription };
}

/**
 * Two pages behind one route, and the difference is a date.
 *
 * Without one this browses the catalogue: what exists, at indicative prices,
 * filtered in the browser. With one it becomes a real search — `/api/search/tours`
 * returns only journeys with a departure that day for that party, and every
 * price on the page is a total somebody could be charged.
 *
 * Either way the API decides the channel from the session cookie: an anonymous
 * visitor sees B2C tours and public options, a signed-in partner the whole
 * ACTIVE programme at their own rates.
 */
export default async function ToursPage(props: PageProps<"/[locale]/tours">) {
  const searchParams = await props.searchParams;
  const { t, locale, intlLocale, fill, path } = await getI18n();
  const stay = tourStayFromParams(searchParams);

  const hero = (
    <>
      <PageHero
        eyebrow={t.tours.heroEyebrow}
        title={t.tours.heroTitle}
        description={t.tours.heroDescription}
        image="/images/tours/chaukhi.jpg"
        imageAlt={t.tours.heroImageAlt}
      />
      <Container className="relative z-20 -mt-10 lg:-mt-14">
        <TourSearchForm value={stay} action="/tours" />
        {!stay && (
          <p className="type-caption mt-3 flex items-center gap-2 text-muted">
            <CalendarSearch size={14} className="shrink-0 text-brand-text" aria-hidden />
            {t.tours.search.datesRequired}
          </p>
        )}
      </Container>
    </>
  );

  // --- dated search -------------------------------------------------------
  if (stay) {
    const { data: results, total } = await searchTours({
      date: stay.date,
      adults: stay.adults,
      childAges: stay.childAges,
      locale,
      pageSize: 50,
    });

    const party = [
      plural(locale, stay.adults, t.units.adult),
      stay.childAges.length > 0 ? plural(locale, stay.childAges.length, t.units.child) : null,
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <>
        {hero}

        <Container className="pt-12 pb-24 lg:pt-16 lg:pb-32">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-5">
            <h2 className="type-h3">
              {fill(t.tours.results.heading, { count: plural(locale, total, t.units.journey) })}
            </h2>
            <p className="type-body-sm text-muted">
              {fill(t.tours.results.subheading, {
                date: formatStayDate(stay.date, intlLocale),
                party,
              })}
            </p>
          </div>

          {results.length > 0 ? (
            <div className="mt-6 flex flex-col gap-5">
              {results.map((result) => (
                <TourResultCard key={result.id} result={result} stay={stay} />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                iconName="calendarSearch"
                title={t.tours.results.emptyTitle}
                description={t.tours.results.emptyBody}
                action={{ label: t.tours.results.browseCatalogue, href: path("/tours") }}
              />
            </div>
          )}
        </Container>
      </>
    );
  }

  // --- catalogue ----------------------------------------------------------
  const { data: tours } = await listPublicTours({ locale, pageSize: 100 });
  // Regions come off the translated records, so the filter reads in the same
  // language as the cards it filters.
  const regions = [...new Set(tours.map((tour) => tour.location))].sort();
  const spotlight = tours.find((tour) => tour.featured) ?? tours[0] ?? null;

  return (
    <>
      {hero}

      {spotlight && (
        <section className="border-b border-line py-16 lg:py-20">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow={t.tours.spotlightEyebrow}
                title={t.tours.spotlightTitle}
                description={t.tours.spotlightDescription}
              />
            </Reveal>
            <Reveal className="mt-12">
              <TourCard tour={spotlight} variant="feature" />
            </Reveal>
          </Container>
        </section>
      )}

      <TourExplorer tours={tours} regions={regions} />
    </>
  );
}
