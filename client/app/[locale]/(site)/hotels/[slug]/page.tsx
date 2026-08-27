import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, MapPin, Navigation } from "lucide-react";

import { RoomOffers } from "@/components/booking/RoomOffers";
import { StayPanel } from "@/components/booking/StayPanel";
import { StaySearchForm } from "@/components/booking/StaySearchForm";
import { HotelAmenities } from "@/components/hotels/HotelAmenities";
import { HotelCard } from "@/components/hotels/HotelCard";
import { HotelPolicies } from "@/components/hotels/HotelPolicies";
import { HotelReviews } from "@/components/hotels/HotelReviews";
import { HotelSectionNav } from "@/components/hotels/HotelSectionNav";
import { Reveal } from "@/components/motion/Reveal";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { ScoreBadge, Stars } from "@/components/ui/Rating";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ShareSave } from "@/components/ui/ShareSave";
import { ApiError } from "@/lib/api/client";
import { getHotelAvailability, getPublicHotel, listPublicHotels } from "@/lib/api/search";
import {
  formatStayDate,
  nightsBetween,
  stayFromParams,
  stayToParams,
} from "@/lib/booking/stay";
import { getI18n } from "@/lib/i18n/server";
import { plural } from "@/lib/i18n/plural";
import { formatMoney } from "@/lib/money";
import { formatPrice } from "@/lib/utils";
import { adaptHotelDetail, adaptHotelSummary } from "@/lib/site/hotelAdapter";
import { stayWindowIssue, type StayWindowIssue } from "@/lib/booking/errors";
import type { HotelAvailability, Offer, StayQuery } from "@/types/booking";

/**
 * Live from the API, which decides the channel: a B2B-only property is a 404
 * on this page for an anonymous visitor and a normal page for a signed-in
 * partner. No static params — the catalogue changes under this route.
 */
const loadHotel = async (slug: string) => {
  try {
    return await getPublicHotel(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

/**
 * What can be sold here, on these dates, to this party.
 *
 * Three outcomes, and the page says something different for each. A property
 * that has simply sold out is an empty answer rather than an error — a normal
 * state on a busy weekend. A stay the platform refuses outright (past, beyond
 * the booking horizon, over the night cap) is a `refused` answer, because
 * "try a different date" is the wrong advice there. Anything else is a real
 * failure and is left to the error boundary.
 */
type AvailabilityResult =
  | { kind: "available"; availability: HotelAvailability }
  | { kind: "empty" }
  | { kind: "refused"; issue: NonNullable<StayWindowIssue> };

const loadAvailability = async (
  slug: string,
  stay: StayQuery,
  locale: string,
): Promise<AvailabilityResult> => {
  try {
    return {
      kind: "available",
      availability: await getHotelAvailability(slug, { ...stayToParams(stay), locale }),
    };
  } catch (error) {
    const issue = stayWindowIssue(error);
    if (issue) return { kind: "refused", issue };

    if (error instanceof ApiError && (error.status === 404 || error.status === 409)) {
      return { kind: "empty" };
    }
    throw error;
  }
};

/** The cheapest thing anyone could actually book, for the sidebar. */
const cheapestOffer = (availability: HotelAvailability | null): Offer | null =>
  availability?.roomTypes
    .flatMap((roomType) => roomType.offers)
    .reduce<Offer | null>(
      (best, offer) =>
        best === null || offer.quote.totals.totalCents < best.quote.totals.totalCents ? offer : best,
      null,
    ) ?? null;

export async function generateMetadata(props: PageProps<"/[locale]/hotels/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const api = await loadHotel(slug);
  if (!api) return { title: "Property not found" };

  const hotel = adaptHotelDetail(api);

  return {
    title: hotel.name,
    description: hotel.summary,
    openGraph: {
      title: `${hotel.name} — ${hotel.location}`,
      description: hotel.summary,
      images: hotel.image ? [{ url: hotel.image }] : [],
    },
  };
}

export default async function HotelDetailPage(props: PageProps<"/[locale]/hotels/[slug]">) {
  const { slug } = await props.params;
  const searchParams = await props.searchParams;
  const { t, locale, intlLocale, fill, path } = await getI18n();

  // The dates the visitor arrived with, if any. Everything bookable on this
  // page hangs off them; without them the page is a brochure, and says so.
  // Availability depends only on the slug and the stay, not on the hotel
  // response, so the two requests run in parallel; a missing property answers
  // "empty" on the availability side and 404s here regardless.
  const stay = stayFromParams(searchParams);
  const [api, result] = await Promise.all([
    loadHotel(slug),
    stay ? loadAvailability(slug, stay, locale) : null,
  ]);
  if (!api) notFound();

  const hotel = adaptHotelDetail(api);
  const destination = api.destination
    ? { slug: api.destination.slug, name: api.destination.name }
    : null;
  const availability = result?.kind === "available" ? result.availability : null;
  const refused = result?.kind === "refused" ? result.issue : null;
  const bookableRooms = availability?.roomTypes.filter((room) => room.offers.length > 0) ?? [];
  const cheapest = cheapestOffer(availability);
  const nights = stay ? nightsBetween(stay.checkIn, stay.checkOut) : 0;
  const stayRange = stay
    ? `${formatStayDate(stay.checkIn, intlLocale)} – ${formatStayDate(stay.checkOut, intlLocale)} · ${plural(locale, nights, t.units.night)}`
    : "";

  // Other properties the viewer may actually buy, same place first. The API
  // applies the channel, so a B2B-only neighbour never appears here either.
  //
  // Guarded, because the rail is a suggestion and not the page: the property
  // itself has loaded by now, and a visitor must not lose it because a second
  // query fell over. An empty list simply renders no rail.
  let related: ReturnType<typeof adaptHotelSummary>[] = [];

  try {
    const { data: others } = await listPublicHotels({
      destinationSlug: destination?.slug,
      pageSize: 4,
    });
    related = others
      .filter((candidate) => candidate.slug !== hotel.slug)
      .slice(0, 3)
      .map(adaptHotelSummary);
  } catch (error) {
    console.error("Related properties failed:", error);
  }

  return (
    <>
      <Container className="pt-8 pb-6">
        <Breadcrumbs
          items={[
            { label: t.common.home, href: path("/") },
            { label: t.nav.hotels, href: path("/hotels") },
            ...(destination
              ? [{ label: destination.name, href: path(`/destinations/${destination.slug}`) }]
              : []),
            { label: hotel.name },
          ]}
        />

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone="outline">{hotel.propertyType}</Badge>
              <Stars count={hotel.starRating} />
            </div>
            <h1 className="type-h1 mt-4 text-balance">{hotel.name}</h1>
            <p className="type-body-sm mt-3 flex items-center gap-2 text-muted">
              <MapPin size={15} aria-hidden />
              {hotel.address}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-6">
            <ScoreBadge score={hotel.guestScore} reviewCount={hotel.reviewCount} />
            <ShareSave title={hotel.name} />
          </div>
        </div>
      </Container>

      <Container>
        <MediaGallery images={hotel.gallery} label={hotel.name} priority />
      </Container>

      {/* The control the whole page hangs off. It sits above the fold of the
          content, not buried in the sidebar, because on a property page the
          first question is "can I have it on my dates". */}
      <Container className="pt-8">
        <div id="stay-search" className="scroll-mt-36">
          <StaySearchForm value={stay} action={`/hotels/${hotel.slug}`} />
        </div>
      </Container>

      <Container className="pt-8">
        <HotelSectionNav />
      </Container>

      <Container className="pt-12 pb-28 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-12 xl:gap-16">
          <div className="min-w-0 lg:col-span-8">
            <section id="overview" className="scroll-mt-36">
              <h2 className="type-h2">{t.hotels.about}</h2>
              <p className="type-body-lg mt-5 text-body">{hotel.summary}</p>
              <div className="mt-5 space-y-5">
                {hotel.description.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="type-body text-body">
                    {paragraph}
                  </p>
                ))}
              </div>

              <ul className="mt-8 grid gap-3.5 sm:grid-cols-2">
                {hotel.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <Check size={17} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
                    <span className="type-body-sm text-body">{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section id="amenities" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">{t.hotels.facilities}</h2>
              <div className="mt-8">
                <HotelAmenities amenities={hotel.amenities} />
              </div>
            </section>

            <section id="location" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">{t.hotels.location}</h2>
              <p className="type-body mt-4 flex items-center gap-2 text-body">
                <MapPin size={16} className="shrink-0 text-brand-text" aria-hidden />
                {hotel.address}
              </p>

              {/* Deliberately not a live map — this prototype integrates no map service. */}
              <div className="mt-6 flex items-center justify-center rounded-sm border border-dashed border-line bg-surface-earth/50 px-6 py-14 text-center">
                <div>
                  <span className="mx-auto flex size-11 items-center justify-center rounded-full bg-background text-brand-text">
                    <Navigation size={18} aria-hidden />
                  </span>
                  <p className="type-body-sm mt-4 text-muted">{t.hotels.mapPlaceholder}</p>
                </div>
              </div>

              <h3 className="type-h4 mt-10">{t.hotels.whatsNearby}</h3>
              <dl className="mt-4 divide-y divide-line border-y border-line">
                {hotel.nearby.map((place) => (
                  <div key={place.name} className="flex items-baseline justify-between gap-6 py-3.5">
                    <dt className="type-body-sm text-body">
                      {place.name}
                      <span className="type-caption ms-2 text-subtle">{place.type}</span>
                    </dt>
                    <dd className="type-body-sm shrink-0 font-medium tabular-nums">
                      {place.distance}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            {/* --- the bookable part ------------------------------------- */}
            <section id="rooms" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">{t.booking.availability.heading}</h2>

              {stay ? (
                <>
                  {!refused && (
                    <p className="type-body mt-3 text-muted">
                      {fill(t.booking.availability.ratesFor, { stay: stayRange })}
                    </p>
                  )}

                  <div className="mt-8">
                    {bookableRooms.length > 0 ? (
                      <RoomOffers
                        hotelSlug={hotel.slug}
                        hotelName={hotel.name}
                        stay={stay}
                        roomTypes={bookableRooms}
                      />
                    ) : (
                      <EmptyState
                        iconName="calendarSearch"
                        title={
                          refused ? t.booking.window.title : t.booking.availability.emptyTitle
                        }
                        description={
                          refused
                            ? fill(t.booking.window[refused.key], { limit: refused.limit })
                            : t.booking.availability.emptyBody
                        }
                        action={{ label: t.booking.results.browseCatalogue, href: path("/hotels") }}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-8">
                  <EmptyState
                    iconName="calendarSearch"
                    title={t.booking.availability.noDatesTitle}
                    description={t.booking.availability.noDatesBody}
                  />
                </div>
              )}
            </section>

            <section id="reviews" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">{t.hotels.guestReviews}</h2>
              <div className="mt-8">
                <HotelReviews
                  guestScore={hotel.guestScore}
                  reviewCount={hotel.reviewCount}
                  categoryScores={hotel.categoryScores}
                  reviews={hotel.reviews}
                />
              </div>
            </section>

            <section id="policies" className="mt-16 scroll-mt-36 border-t border-line pt-12">
              <h2 className="type-h2">{t.hotels.policies}</h2>
              <div className="mt-8">
                <HotelPolicies policies={hotel.policies} />
              </div>
            </section>
          </div>

          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-36">
              <StayPanel
                guestScore={hotel.guestScore}
                reviewCount={hotel.reviewCount}
                priceFrom={hotel.priceFrom}
                stay={stay}
                cheapest={cheapest}
                refused={refused}
              />
            </div>
          </aside>
        </div>
      </Container>

      {/* Mobile booking bar — the pattern travellers expect on a phone. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 backdrop-blur-md lg:hidden">
        <div className="flex items-center justify-between gap-4 px-5 py-3">
          <p>
            <span className="type-caption block text-muted">{t.common.from}</span>
            <span className="type-h4 tabular-nums">
              {cheapest
                ? formatMoney(cheapest.quote.totals.totalCents, cheapest.quote.currency, intlLocale)
                : formatPrice(hotel.priceFrom, intlLocale)}
              <span className="type-caption font-normal text-muted">
                {" "}
                {cheapest
                  ? `· ${plural(locale, nights, t.units.night)}`
                  : t.common.perNightShort}
              </span>
            </span>
          </p>

          <Link
            href={stay ? "#rooms" : "#stay-search"}
            className="inline-flex h-11 items-center justify-center rounded-sm bg-brand px-6 text-[0.9375rem] font-medium text-on-dark transition-colors hover:bg-brand-hover"
          >
            {stay ? t.hotels.seeRooms : t.booking.availability.selectDates}
          </Link>
        </div>
      </div>

      {related.length > 0 && (
        <section className="border-t border-line bg-surface-earth/50 py-20 pb-32 lg:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow={t.hotels.relatedEyebrow}
                title={t.hotels.relatedTitle}
                action={{ label: t.actions.allHotels, href: path("/hotels") }}
              />
            </Reveal>
            <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <HotelCard key={item.id} hotel={item} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
