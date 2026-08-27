import type { Metadata } from "next";
import { CalendarSearch } from "lucide-react";

import { StayResultCard } from "@/components/booking/StayResultCard";
import { StaySearchForm } from "@/components/booking/StaySearchForm";
import { HotelExplorer } from "@/components/hotels/HotelExplorer";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageHero } from "@/components/ui/PageHero";
import { listPublicHotels, getPublicDestinations, searchHotels } from "@/lib/api/search";
import { stayWindowIssue } from "@/lib/booking/errors";
import { adaptHotelSummary } from "@/lib/site/hotelAdapter";
import { nightsBetween, stayFromParams, stayToParams } from "@/lib/booking/stay";
import { formatStayDate } from "@/lib/booking/stay";
import { plural } from "@/lib/i18n/plural";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Hotels",
  description:
    "Boutique houses, mountain lodges and vineyard retreats across Georgia, chosen one by one.",
};

/**
 * Two pages behind one route, and the difference is dates.
 *
 * Without them this browses the catalogue: what exists, at indicative prices,
 * filtered client-side. With them it becomes a real search — `/api/search`
 * returns only properties that can actually be sold for those exact dates and
 * that exact party, and every price on the page is a total somebody could be
 * charged. Conflating the two is how a site advertises rooms it cannot sell,
 * so the URL decides which one the visitor is looking at.
 *
 * Either way the API decides the channel from the session cookie: an anonymous
 * visitor sees B2C properties at the platform markup, a signed-in partner sees
 * the whole ACTIVE catalogue at their own rates.
 */
export default async function HotelsPage(props: PageProps<"/[locale]/hotels">) {
  const searchParams = await props.searchParams;
  const { t, locale, intlLocale, fill, path } = await getI18n();

  const stay = stayFromParams(searchParams);
  const requested = searchParams.destinationSlug;
  const destinationSlug = Array.isArray(requested) ? requested[0] : requested;

  const { data: destinationTree } = await getPublicDestinations();
  const flatDestinations = destinationTree.flatMap((root) => [root, ...root.children]);

  const hero = (
    <>
      <PageHero
        eyebrow={t.nav.hotels}
        title={t.hotels.heroTitle}
        description={t.hotels.heroDescription}
        image="/images/hotels/property-1.jpg"
        imageAlt={t.hotels.heroImageAlt}
      />
      <Container className="relative z-20 -mt-10 lg:-mt-14">
        <StaySearchForm
          value={stay}
          action="/hotels"
          destinations={flatDestinations.map((node) => ({ slug: node.slug, name: node.name }))}
          destinationSlug={destinationSlug}
        />
        {!stay && (
          <p className="type-caption mt-3 flex items-center gap-2 text-muted">
            <CalendarSearch size={14} className="shrink-0 text-brand-text" aria-hidden />
            {t.booking.search.datesRequired}
          </p>
        )}
      </Container>
    </>
  );

  // --- dated search -------------------------------------------------------
  if (stay) {
    /*
     * The server refuses some stays outright — a check-in already past, a date
     * beyond the booking horizon, a stay over the night cap. Those are answers,
     * not failures, and each wants different advice: "try a nearer date" is
     * useless for a stay that is merely full, and "shift it by a night" is
     * useless for one we do not sell that far out.
     */
    let page: Awaited<ReturnType<typeof searchHotels>>;

    try {
      page = await searchHotels({
        ...stayToParams(stay),
        destinationSlug,
        locale,
        pageSize: 24,
      });
    } catch (error) {
      const issue = stayWindowIssue(error);
      if (!issue) throw error;

      return (
        <>
          {hero}
          <Container className="pt-12 pb-24 lg:pt-16 lg:pb-32">
            <EmptyState
              iconName="calendarSearch"
              title={t.booking.window.title}
              description={fill(t.booking.window[issue.key], { limit: issue.limit })}
              action={{ label: t.booking.results.browseCatalogue, href: path("/hotels") }}
            />
          </Container>
        </>
      );
    }

    const { data: results, total } = page;

    const nights = nightsBetween(stay.checkIn, stay.checkOut);
    const party = [
      plural(locale, stay.adults, t.units.adult),
      (stay.childAges?.length ?? 0) > 0
        ? plural(locale, stay.childAges!.length, t.units.child)
        : null,
      plural(locale, stay.rooms ?? 1, t.units.room),
    ]
      .filter(Boolean)
      .join(" · ");

    return (
      <>
        {hero}

        <Container className="pt-12 pb-24 lg:pt-16 lg:pb-32">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-line pb-5">
            <h2 className="type-h3">
              {fill(t.booking.results.heading, {
                count: plural(locale, total, t.units.property),
              })}
            </h2>
            <p className="type-body-sm text-muted">
              {fill(t.booking.results.subheading, {
                stay: `${formatStayDate(stay.checkIn, intlLocale)} – ${formatStayDate(stay.checkOut, intlLocale)} · ${plural(locale, nights, t.units.night)}`,
                party,
              })}
            </p>
          </div>

          {results.length > 0 ? (
            <div className="mt-6 flex flex-col gap-5">
              {results.map((result) => (
                <StayResultCard
                  key={result.id}
                  result={result}
                  stay={stay}
                  nights={nights}
                />
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState
                iconName="calendarSearch"
                title={t.booking.results.emptyTitle}
                description={t.booking.results.emptyBody}
                action={{ label: t.booking.results.browseCatalogue, href: path("/hotels") }}
              />
            </div>
          )}
        </Container>
      </>
    );
  }

  // --- catalogue ----------------------------------------------------------
  const { data: apiHotels } = await listPublicHotels({ destinationSlug, pageSize: 50 });
  const hotels = apiHotels.map(adaptHotelSummary);

  return (
    <>
      {hero}
      <HotelExplorer hotels={hotels} />
    </>
  );
}
