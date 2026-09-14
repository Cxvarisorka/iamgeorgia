import type { MetadataRoute } from "next";

import { locales } from "@/lib/i18n/config";
import { languageUrls, localeUrl } from "@/lib/seo/urls";
import { listPublicHotelsAnonymous } from "@/lib/api/search";
import { listPublicToursAnonymous } from "@/lib/api/tours";
import { listTransferRoutesForBuild } from "@/lib/api/transfers";
import type { RequestOptions } from "@/lib/api/client";
import type { Paginated } from "@/types/partner";

/**
 * `/sitemap.xml`, generated from the catalogue.
 *
 * Everything here is a real record read from the API — a hand-maintained list
 * goes stale within a week of the operator adding a property, and a sitemap
 * that names URLs which 404 is worse than none at all. The retired
 * `/destinations` and `/experiences` trees are absent for that reason: both
 * routes answer 404 today.
 *
 * The reads are deliberately **anonymous**. `serverFetch` would forward the
 * requesting session, and a partner opening this URL would otherwise publish
 * the B2B-only catalogue as indexable addresses.
 *
 * Cached for an hour. The catalogue does not change by the minute, and a
 * sitemap that re-reads three endpoints on every crawler hit is a denial of
 * service someone else gets to schedule.
 */
export const revalidate = 3600;

/**
 * `lib/api/client` sends `cache: "no-store"` by default — right for a panel
 * showing live records, and the reason the segment `revalidate` above would
 * otherwise never bite: one uncached fetch makes the whole route dynamic and
 * every crawler hit becomes three round trips to the API. These three reads
 * opt back into the segment's own hour.
 */
const CACHE: RequestOptions = { cache: "force-cache", next: { revalidate } };

/**
 * 50 is the public hotel catalogue's cap on `pageSize` — the lowest of the
 * three endpoints, and the one they therefore all page at.
 *
 * The page ceiling is a runaway guard, but also the point at which this file
 * has outgrown itself: 50 pages × 50 rows × 3 sections × 4 locales is 30,000
 * URLs, and a single sitemap may hold 50,000. A catalogue that ever reaches
 * the ceiling needs a sitemap index (`generateSitemaps`), not a bigger number.
 */
const MAX_PAGES = 50;
const PAGE_SIZE = 50;

async function collect<T>(load: (page: number) => Promise<Paginated<T>>): Promise<T[]> {
  const rows: T[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const result = await load(page);
    rows.push(...result.data);

    if (page >= result.totalPages) break;
  }

  return rows;
}

/**
 * A section of the catalogue, or nothing.
 *
 * A sitemap missing the hotels is a recoverable problem; a sitemap that 500s
 * because one endpoint was slow is not — the crawler drops the whole file,
 * including the sections that were fine.
 */
async function section<T>(
  name: string,
  load: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`[sitemap] skipping ${name}:`, error);
    return [];
  }
}

/**
 * One canonical path as four `<url>` entries — one per locale, each carrying
 * the complete alternate set including itself and `x-default`.
 *
 * Not one entry with four alternates: Google's rule is that every language
 * version needs its own entry naming every version, and a set that names a URL
 * which never appears as an entry of its own is the half-built case it ignores.
 */
function entries(path: string, lastModified?: Date): MetadataRoute.Sitemap {
  const languages = languageUrls(path);

  return locales.map((locale) => ({
    url: localeUrl(locale, path),
    ...(lastModified ? { lastModified } : {}),
    alternates: { languages: { ...languages, "x-default": languages.en } },
  }));
}

/**
 * The pages that exist regardless of what is in the catalogue. Listed by hand
 * because they are routes, not records — there is nothing to read them from.
 */
const STATIC_PATHS = [
  "/",
  "/tours",
  "/hotels",
  "/packages",
  "/transfers",
  "/about",
  "/contact",
  "/privacy",
  "/terms",
  "/cookies",
];

const modified = (value: string | undefined): Date | undefined => {
  if (!value) return undefined;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
};

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [hotels, tours, routes] = await Promise.all([
    section("hotels", () =>
      collect((page) => listPublicHotelsAnonymous({ page, pageSize: PAGE_SIZE }, CACHE)),
    ),
    section("tours", () =>
      collect((page) => listPublicToursAnonymous({ page, pageSize: PAGE_SIZE }, CACHE)),
    ),
    section("transfer routes", () =>
      collect((page) => listTransferRoutesForBuild({ page, pageSize: PAGE_SIZE }, CACHE)),
    ),
  ]);

  return [
    ...STATIC_PATHS.flatMap((path) => entries(path)),
    ...hotels.flatMap((hotel) => entries(`/hotels/${hotel.slug}`, modified(hotel.updatedAt))),
    ...tours.flatMap((tour) => entries(`/tours/${tour.slug}`, modified(tour.updatedAt))),
    ...routes.flatMap((route) =>
      entries(`/transfers/routes/${route.slug}`, modified(route.updatedAt)),
    ),
  ];
}
