import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BedDouble, CalendarRange, CarFront, Compass, ConciergeBell, Layers, MapPin, Moon } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { KosherPanel } from "@/components/packages/KosherPanel";
import { PackageBuilder } from "@/components/packages/PackageBuilder";
import { PackageSearchForm } from "@/components/packages/PackageSearchForm";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { ShareSave } from "@/components/ui/ShareSave";
import { ApiError } from "@/lib/api/client";
import { getPublicPackage, quotePackage } from "@/lib/api/packages";
import { formatStayDate } from "@/lib/booking/stay";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/money";
import {
  packageImageUrl,
  packageQuoteQuery,
  packageSearchFromParams,
  type PackageSearch,
} from "@/lib/packages/query";
import { pageMetadata } from "@/lib/seo/metadata";
import type { GalleryImage } from "@/types/common";
import type { PackageComponent, PackageDetail, PackageQuote } from "@/types/package";

const SLOT_ICONS: Record<PackageComponent["componentType"], LucideIcon> = {
  HOTEL_STAY: BedDouble,
  TRANSFER: CarFront,
  TOUR: Compass,
  SERVICE: ConciergeBell,
};

/**
 * Live from the API, which decides the channel: a trade-only package is a 404
 * for an anonymous visitor and a normal page for a signed-in partner. No
 * static params — the catalogue changes under this route.
 */
const loadPackage = async (slug: string, locale: string): Promise<PackageDetail | null> => {
  try {
    return await getPublicPackage(slug, { locale });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
};

/**
 * The trip priced for the party in the URL.
 *
 * A quote the server refuses outright — a start date in the past, a party
 * beyond the package's own limits — comes back as null and the page shows the
 * brochure with its picker, rather than an error. A quote it can answer but
 * cannot sell arrives with `available: false` and its reasons, which the
 * builder renders per slot.
 */
const loadQuote = async (
  slug: string,
  search: PackageSearch,
  locale: string,
): Promise<PackageQuote | null> => {
  try {
    return await quotePackage(slug, packageQuoteQuery(search, locale));
  } catch (error) {
    if (error instanceof ApiError && [400, 404, 409, 422].includes(error.status)) return null;
    throw error;
  }
};

const galleryOf = (pkg: PackageDetail): GalleryImage[] =>
  pkg.images.length > 0
    ? pkg.images.map((image) => ({ src: image.url, alt: image.altText ?? pkg.name }))
    : pkg.gallery;

export async function generateMetadata(
  props: PageProps<"/[locale]/packages/[slug]">,
): Promise<Metadata> {
  const [{ slug }, { t, locale }] = await Promise.all([props.params, getI18n()]);
  const pkg = await loadPackage(slug, locale);

  if (!pkg) return { title: t.packages.notFound, robots: { index: false, follow: true } };

  const image = galleryOf(pkg)[0]?.src ?? packageImageUrl(pkg) ?? undefined;

  // The canonical is the clean package URL: the dated variants a buyer arrives
  // with consolidate onto one address instead of splitting across a calendar.
  return pageMetadata({
    path: `/packages/${pkg.slug}`,
    title: pkg.name,
    description: pkg.summary ?? t.packages.metaDescription,
    image,
    imageAlt: pkg.destination ? `${pkg.name}, ${pkg.destination.name}` : pkg.name,
  });
}

export default async function PackageDetailPage(props: PageProps<"/[locale]/packages/[slug]">) {
  const [{ slug }, searchParams, { t, path, locale, intlLocale, fill }] = await Promise.all([
    props.params,
    props.searchParams,
    getI18n(),
  ]);

  const search = packageSearchFromParams(searchParams);
  const [pkg, quote] = await Promise.all([
    loadPackage(slug, locale),
    search ? loadQuote(slug, search, locale) : null,
  ]);

  if (!pkg) notFound();

  const gallery = galleryOf(pkg);
  const crumbs = [
    { label: t.common.home, href: path("/") },
    { label: t.packages.crumb, href: path("/packages") },
    { label: pkg.name },
  ];

  /** Slots grouped by the day they fall on, for the brochure itinerary. */
  const byDay = pkg.components.reduce<Map<number, PackageComponent[]>>((days, component) => {
    const list = days.get(component.dayOffset) ?? [];
    list.push(component);
    days.set(component.dayOffset, list);

    return days;
  }, new Map());
  const days = [...byDay.entries()].sort(([a], [b]) => a - b);

  return (
    <>
      <Container className="pt-8">
        <Breadcrumbs items={crumbs} />
      </Container>

      <Container className="pt-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="type-caption flex flex-wrap items-center gap-x-3 gap-y-1 text-muted">
              {pkg.destination && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={13} aria-hidden />
                  {pkg.destination.name}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Moon size={13} aria-hidden />
                {fill(t.packages.nights, { count: pkg.nights })}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers size={13} aria-hidden />
                {fill(t.packages.componentCount, { count: pkg.componentCount })}
              </span>
              {pkg.kosher && <Badge tone="nature">{t.packages.kosher.badge}</Badge>}
            </div>

            <h1 className="type-h1 mt-3 text-ink">{pkg.name}</h1>
            {pkg.summary && <p className="type-body mt-3 text-body">{pkg.summary}</p>}

            {(pkg.validFrom || pkg.validUntil) && (
              <p className="type-caption mt-3 inline-flex items-center gap-1.5 text-muted">
                <CalendarRange size={13} aria-hidden />
                {fill(t.packages.validFor, {
                  from: pkg.validFrom ? formatStayDate(pkg.validFrom, intlLocale) : "—",
                  until: pkg.validUntil ? formatStayDate(pkg.validUntil, intlLocale) : "—",
                })}
              </p>
            )}
          </div>

          <ShareSave title={pkg.name} />
        </div>
      </Container>

      {gallery.length > 0 && (
        <Container className="mt-8">
          <MediaGallery images={gallery} label={pkg.name} />
        </Container>
      )}

      <Container className="pt-10">
        <PackageSearchForm
          value={search}
          action={`/packages/${pkg.slug}`}
          party={pkg.party}
        />
      </Container>

      <Container className="pt-12 pb-24 lg:pt-16 lg:pb-32">
        {/* --- priced, or the brochure ------------------------------------- */}
        {search && quote ? (
          <PackageBuilder slug={pkg.slug} name={pkg.name} search={search} quote={quote} />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[1fr_22rem] lg:gap-12">
            <div>
              {pkg.description.length > 0 && (
                <section>
                  <h2 className="type-h4">{t.packages.overview}</h2>
                  <div className="mt-4 flex flex-col gap-4">
                    {pkg.description.map((paragraph, index) => (
                      // Editorial prose: order is the identity.
                      <p key={index} className="type-body text-body">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>
              )}

              <section className={pkg.description.length > 0 ? "mt-12" : undefined}>
                <h2 className="type-h4">{t.packages.itinerary}</h2>
                <ol className="mt-5 flex flex-col gap-5">
                  {days.map(([dayOffset, components]) => (
                    <li key={dayOffset} className="border-s-2 border-line ps-5">
                      <p className="type-caption font-semibold tracking-wide text-brand-text uppercase">
                        {dayOffset === 0
                          ? t.packages.arrivalDay
                          : fill(t.packages.day, { n: dayOffset + 1 })}
                      </p>
                      <ul className="mt-2 flex flex-col gap-2.5">
                        {components.map((component) => {
                          const Icon = SLOT_ICONS[component.componentType];

                          return (
                            <li key={component.slotIndex} className="flex items-start gap-2.5">
                              <Icon
                                size={15}
                                className="mt-0.5 shrink-0 text-muted"
                                aria-hidden
                              />
                              <span className="min-w-0">
                                <span className="type-body-sm block text-ink">
                                  {component.label}
                                </span>
                                <span className="type-caption block text-muted">
                                  {component.hotel?.name ??
                                    component.tour?.title ??
                                    component.service?.name ??
                                    (component.fromPoint && component.toPoint
                                      ? `${component.fromPoint.name} → ${component.toPoint.name}`
                                      : t.orders.componentTypes[component.componentType])}
                                  {component.required ? "" : ` · ${t.packages.optional}`}
                                </span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ol>
              </section>
            </div>

            <aside className="lg:sticky lg:top-24 lg:self-start">
              <div className="border border-line bg-surface p-5 shadow-card">
                {pkg.priceFrom && (
                  <>
                    <p className="type-caption text-muted">{t.packages.from}</p>
                    <p className="type-h3 mt-1 text-ink">
                      {formatMoney(
                        pkg.priceFrom.amountCents,
                        pkg.priceFrom.currency,
                        intlLocale,
                      )}
                    </p>
                    <p className="type-caption mt-1 text-muted">
                      {t.packages.priceIndicative}
                    </p>
                  </>
                )}

                <p className="type-body-sm mt-4 text-body">
                  {pkg.party.maxPax
                    ? fill(t.packages.partyRulesMax, {
                        min: pkg.party.minAdults,
                        max: pkg.party.maxPax,
                      })
                    : fill(t.packages.partyRules, { min: pkg.party.minAdults })}
                </p>

                {pkg.kosherProfile && (
                  <KosherPanel profile={pkg.kosherProfile} className="mt-5" />
                )}
              </div>
            </aside>
          </div>
        )}

        {search && !quote && (
          <EmptyState
            iconName="calendarSearch"
            title={t.packages.quote.unavailableTitle}
            description={t.packages.quote.unavailable.COMPONENT_UNAVAILABLE}
            action={{ label: t.packages.crumb, href: path("/packages") }}
          />
        )}
      </Container>
    </>
  );
}
