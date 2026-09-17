import { site } from "@/constants/site";
import { localeMeta, type Locale } from "@/lib/i18n/config";
import { toMajorUnits } from "@/lib/money";
import { absoluteUrl, localeUrl } from "@/lib/seo/urls";

/**
 * Structured data.
 *
 * Two rules govern everything below, and both are enforced by shape rather
 * than by discipline: **only what the visitor can see gets marked up**, and
 * **every price comes from the same integer-cent value the page renders**,
 * divided once by `toMajorUnits`. An invented rating or a price the page
 * contradicts is a manual-action risk, so each builder takes the already
 * displayed figures and omits any block it was given nothing for.
 */

/**
 * `<` is escaped because a JSON string containing `</script>` would otherwise
 * close this tag early. The payloads here are built from typed catalogue
 * fields, but those fields are operator-authored prose.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

// --- site-wide --------------------------------------------------------------

/** Stable node ids, so page-level graphs can reference rather than repeat. */
export const ORGANIZATION_ID = `${site.url}/#organization`;
export const WEBSITE_ID = `${site.url}/#website`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "TravelAgency",
    "@id": ORGANIZATION_ID,
    name: site.name,
    legalName: site.seo.legalName,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.svg"),
    image: absoluteUrl(site.seo.image),
    description: site.description,
    foundingDate: String(site.founded),
    email: site.contact.email,
    telephone: site.contact.phone,
    address: {
      "@type": "PostalAddress",
      streetAddress: site.seo.streetAddress,
      addressLocality: site.seo.addressLocality,
      postalCode: site.seo.postalCode,
      addressCountry: site.seo.addressCountry,
    },
    areaServed: { "@type": "Country", name: "Georgia" },
    sameAs: site.social.map((profile) => profile.href),
  };
}

export function webSiteSchema(locale: Locale) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: site.name,
    url: localeUrl(locale, "/"),
    description: site.description,
    inLanguage: localeMeta[locale].htmlLang,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

// --- per page ---------------------------------------------------------------

export interface Crumb {
  name: string;
  /** A locale-prefixed path from `path()`, or omitted for the current page. */
  href?: string;
}

/**
 * The trail the page already shows. Built from the same array the visible
 * `<Breadcrumbs>` renders, so the two cannot drift apart.
 */
export function breadcrumbSchema(items: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.href ? { item: absoluteUrl(crumb.href) } : {}),
    })),
  };
}

/**
 * What can be bought here.
 *
 * `availability` is omitted rather than guessed: an undated catalogue page does
 * not know whether anything is free, and a hardcoded `InStock` on a sold-out
 * property is exactly the claim that gets rich results pulled. It is only set
 * when the page ran a dated availability check and can answer honestly.
 */
export interface OfferInput {
  /** The same integer minor units the page formats for display. */
  priceCents: number;
  currency: string;
  url: string;
  available?: boolean;
  /** ISO date the quoted price is good until, when the page knows one. */
  validThrough?: string;
}

const offerSchema = ({ priceCents, currency, url, available, validThrough }: OfferInput) => ({
  "@type": "Offer",
  price: toMajorUnits(priceCents, currency),
  priceCurrency: currency,
  url: absoluteUrl(url),
  ...(available === undefined
    ? {}
    : {
        availability: available
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      }),
  ...(validThrough ? { priceValidUntil: validThrough } : {}),
});

export interface RatingInput {
  value: number;
  count: number;
  best: number;
}

const aggregateRatingSchema = ({ value, count, best }: RatingInput) => ({
  "@type": "AggregateRating",
  ratingValue: value,
  reviewCount: count,
  bestRating: best,
  worstRating: 1,
});

export interface ReviewInput {
  author: string;
  /** Already formatted for display; ISO 8601 is what schema.org wants. */
  datePublished: string;
  score: number;
  title: string;
  body: string;
}

const reviewSchema = (review: ReviewInput, best: number) => ({
  "@type": "Review",
  author: { "@type": "Person", name: review.author },
  datePublished: review.datePublished,
  name: review.title,
  reviewBody: review.body,
  reviewRating: {
    "@type": "Rating",
    ratingValue: review.score,
    bestRating: best,
    worstRating: 1,
  },
});

export interface HotelSchemaInput {
  name: string;
  description: string;
  url: string;
  images: string[];
  starRating: number | null;
  address: string | null;
  locality: string | null;
  latitude: number | null;
  longitude: number | null;
  telephone?: string | null;
  amenities: string[];
  checkIn?: string | null;
  checkOut?: string | null;
  /** Out of ten, as the page's score badge shows it. */
  rating: RatingInput | null;
  reviews: ReviewInput[];
  offer: OfferInput | null;
  locale: Locale;
}

export function hotelSchema(input: HotelSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Hotel",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.url),
    inLanguage: localeMeta[input.locale].htmlLang,
    ...(input.images.length > 0 ? { image: input.images.map(absoluteUrl) } : {}),
    /**
     * `starRating` is the official classification, not a guest score — the two
     * are different claims and conflating them is a misrepresentation.
     */
    ...(input.starRating
      ? { starRating: { "@type": "Rating", ratingValue: input.starRating, bestRating: 5 } }
      : {}),
    ...(input.address || input.locality
      ? {
          address: {
            "@type": "PostalAddress",
            ...(input.address ? { streetAddress: input.address } : {}),
            ...(input.locality ? { addressLocality: input.locality } : {}),
            addressCountry: site.seo.addressCountry,
          },
        }
      : {}),
    ...(input.latitude !== null && input.longitude !== null
      ? { geo: { "@type": "GeoCoordinates", latitude: input.latitude, longitude: input.longitude } }
      : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.amenities.length > 0
      ? {
          amenityFeature: input.amenities.map((name) => ({
            "@type": "LocationFeatureSpecification",
            name,
            value: true,
          })),
        }
      : {}),
    ...(input.checkIn ? { checkinTime: input.checkIn } : {}),
    ...(input.checkOut ? { checkoutTime: input.checkOut } : {}),
    ...(input.rating && input.rating.count > 0
      ? { aggregateRating: aggregateRatingSchema(input.rating) }
      : {}),
    ...(input.reviews.length > 0
      ? { review: input.reviews.map((review) => reviewSchema(review, input.rating?.best ?? 10)) }
      : {}),
    ...(input.offer ? { makesOffer: offerSchema(input.offer) } : {}),
  };
}

export interface TourSchemaInput {
  name: string;
  description: string;
  url: string;
  images: string[];
  /** Where the journey goes, as the page names it. */
  location: string | null;
  /** ISO 8601 duration — `P7D` for a seven-day tour. */
  durationDays: number;
  itinerary: { name: string; description: string }[];
  /** Out of five, as the page's star rating shows it. */
  rating: RatingInput | null;
  offer: OfferInput | null;
  locale: Locale;
}

export function tourSchema(input: TourSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.url),
    inLanguage: localeMeta[input.locale].htmlLang,
    ...(input.images.length > 0 ? { image: input.images.map(absoluteUrl) } : {}),
    ...(input.durationDays > 0 ? { duration: `P${input.durationDays}D` } : {}),
    ...(input.location
      ? { arrivalLocation: { "@type": "Place", name: input.location } }
      : {}),
    provider: { "@id": ORGANIZATION_ID },
    ...(input.itinerary.length > 0
      ? {
          itinerary: {
            "@type": "ItemList",
            numberOfItems: input.itinerary.length,
            itemListElement: input.itinerary.map((day, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: day.name,
              description: day.description,
            })),
          },
        }
      : {}),
    ...(input.rating && input.rating.count > 0
      ? { aggregateRating: aggregateRatingSchema(input.rating) }
      : {}),
    ...(input.offer ? { offers: offerSchema(input.offer) } : {}),
  };
}

export interface PackageSchemaInput {
  name: string;
  description: string;
  url: string;
  images: string[];
  /** Where the trip goes, as the page names it. */
  destination: string | null;
  /**
   * The day-by-day the brochure renders: one entry per day, its description
   * the slot labels shown under it.
   */
  itinerary: { name: string; description: string }[];
  /** The indicative "from" figure the brochure shows, or nothing. */
  offer: OfferInput | null;
  locale: Locale;
}

/**
 * A package is a multi-day trip assembled from stays, transfers and tours,
 * which is what `TouristTrip` describes. No `duration`: the record counts
 * nights, and a night count stated as days is a different number.
 */
export function packageSchema(input: PackageSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.url),
    inLanguage: localeMeta[input.locale].htmlLang,
    ...(input.images.length > 0 ? { image: input.images.map(absoluteUrl) } : {}),
    ...(input.destination
      ? { arrivalLocation: { "@type": "Place", name: input.destination } }
      : {}),
    provider: { "@id": ORGANIZATION_ID },
    ...(input.itinerary.length > 0
      ? {
          itinerary: {
            "@type": "ItemList",
            numberOfItems: input.itinerary.length,
            itemListElement: input.itinerary.map((day, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: day.name,
              description: day.description,
            })),
          },
        }
      : {}),
    ...(input.offer ? { offers: offerSchema(input.offer) } : {}),
  };
}

export interface TransferServiceSchemaInput {
  name: string;
  description: string;
  url: string;
  /** The operator the page names beside the vehicle, when it names one. */
  providerName: string | null;
  locale: Locale;
}

/**
 * A vehicle class is a service, not a product: what is sold is a journey on a
 * date, and the page prices nothing until it is given one. No `offers` — the
 * quote a visitor arrives with is for their own route and party, not a price
 * of the page.
 */
export function transferServiceSchema(input: TransferServiceSchemaInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    serviceType: "Airport and intercity transfer",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.url),
    inLanguage: localeMeta[input.locale].htmlLang,
    areaServed: { "@type": "Country", name: "Georgia" },
    provider: input.providerName
      ? { "@type": "Organization", name: input.providerName }
      : { "@id": ORGANIZATION_ID },
    broker: { "@id": ORGANIZATION_ID },
  };
}
