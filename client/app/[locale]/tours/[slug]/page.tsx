import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, Clock, Gauge, MapPin, Minus, Users } from "lucide-react";

import { Reveal } from "@/components/motion/Reveal";
import { TourCard } from "@/components/tours/TourCard";
import { TourPlanningCard } from "@/components/tours/TourPlanningCard";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { MediaGallery } from "@/components/ui/MediaGallery";
import { Rating } from "@/components/ui/Rating";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { ShareSave } from "@/components/ui/ShareSave";
import { getTourBySlug, tours } from "@/data/tours";
import { relatedBySlug } from "@/lib/utils";
import type { TourCategory } from "@/types";

/**
 * Landscape-led tours carry the green accent instead of the brand orange, so
 * the category chip reads as terrain rather than as a promotion.
 */
const NATURE_CATEGORIES = new Set<TourCategory>(["nature", "adventure"]);

export function generateStaticParams() {
  return tours.map((tour) => ({ slug: tour.slug }));
}

export async function generateMetadata(props: PageProps<"/[locale]/tours/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const tour = getTourBySlug(slug);
  if (!tour) return { title: "Tour not found" };

  return {
    title: tour.title,
    description: tour.summary,
    openGraph: {
      title: tour.title,
      description: tour.summary,
      images: [{ url: tour.image }],
    },
  };
}

export default async function TourDetailPage(props: PageProps<"/[locale]/tours/[slug]">) {
  const { slug } = await props.params;
  const tour = getTourBySlug(slug);
  if (!tour) notFound();

  const related = relatedBySlug(
    tours.filter((item) => item.category === tour.category || item.destinationSlug === tour.destinationSlug),
    tour.slug,
    3,
  );

  const facts = [
    { icon: Clock, label: "Duration", value: tour.durationLabel },
    { icon: Users, label: "Group size", value: tour.groupSize },
    { icon: Gauge, label: "Difficulty", value: tour.difficulty },
    { icon: MapPin, label: "Region", value: tour.location },
  ];

  return (
    <>
      <Container className="pt-8 pb-6">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Tours", href: "/tours" },
            { label: tour.title },
          ]}
        />

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Badge tone={NATURE_CATEGORIES.has(tour.category) ? "nature" : "brand"}>
                {tour.category}
              </Badge>
              <Rating value={tour.rating} reviewCount={tour.reviewCount} size="md" />
            </div>
            <h1 className="type-h1 mt-4 max-w-3xl text-balance">{tour.title}</h1>
            <p className="type-body mt-3 flex items-center gap-2 text-muted">
              <MapPin size={15} aria-hidden />
              {tour.location}
            </p>
          </div>

          <ShareSave title={tour.title} className="shrink-0" />
        </div>
      </Container>

      <Container>
        <MediaGallery images={tour.gallery} label={tour.title} priority />
      </Container>

      <Container className="pt-14 pb-24 lg:pt-16 lg:pb-32">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-7 xl:col-span-8">
            <dl className="grid grid-cols-2 gap-6 border-y border-line py-7 sm:grid-cols-4">
              {facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="type-caption flex items-center gap-1.5 text-muted">
                    <fact.icon size={14} aria-hidden />
                    {fact.label}
                  </dt>
                  <dd className="type-h4 mt-2">{fact.value}</dd>
                </div>
              ))}
            </dl>

            <section className="pt-12">
              <h2 className="type-h2">About this journey</h2>
              <div className="mt-6 space-y-5">
                {tour.description.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)} className="type-body-lg text-body">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>

            <section className="pt-14">
              <h2 className="type-h3">Highlights</h2>
              <ul className="mt-6 grid gap-3.5 sm:grid-cols-2">
                {tour.highlights.map((highlight) => (
                  <li key={highlight} className="flex gap-3">
                    <Check size={17} className="mt-0.5 shrink-0 text-brand-text" aria-hidden />
                    <span className="type-body-sm text-body">{highlight}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="pt-14">
              <h2 className="type-h3">Itinerary</h2>
              <Accordion
                className="mt-6"
                items={tour.itinerary.map((day) => ({
                  id: `day-${day.day}`,
                  meta: tour.durationDays > 1 ? `Day ${day.day}` : "Itinerary",
                  title: day.title,
                  content: (
                    <div className="space-y-4">
                      <p className="type-body text-body">{day.description}</p>
                      <dl className="flex flex-wrap gap-x-10 gap-y-2">
                        {day.meals.length > 0 && (
                          <div>
                            <dt className="type-caption text-muted">Meals included</dt>
                            <dd className="type-body-sm mt-0.5">{day.meals.join(", ")}</dd>
                          </div>
                        )}
                        {day.accommodation !== "—" && (
                          <div>
                            <dt className="type-caption text-muted">Overnight</dt>
                            <dd className="type-body-sm mt-0.5">{day.accommodation}</dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  ),
                }))}
              />
            </section>

            <section className="grid gap-10 pt-14 sm:grid-cols-2">
              <div>
                <h2 className="type-h3">What&apos;s included</h2>
                <ul className="mt-5 space-y-3">
                  {tour.included.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Check size={16} className="mt-0.5 shrink-0 text-success" aria-hidden />
                      <span className="type-body-sm text-body">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="type-h3">Not included</h2>
                <ul className="mt-5 space-y-3">
                  {tour.excluded.map((item) => (
                    <li key={item} className="flex gap-3">
                      <Minus size={16} className="mt-0.5 shrink-0 text-subtle" aria-hidden />
                      <span className="type-body-sm text-muted">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="mt-14 border-t border-line pt-10">
              <h2 className="type-h3">Meeting point</h2>
              <p className="type-body mt-4 text-body">{tour.meetingPoint}</p>
            </section>

            <section className="mt-12 rounded-sm bg-surface-soft/70 p-7 lg:p-8">
              <h2 className="type-h3">Important information</h2>
              <ul className="mt-5 space-y-3">
                {tour.importantInfo.map((item) => (
                  <li key={item} className="type-body-sm flex gap-3 text-body">
                    <span className="mt-2 size-1 shrink-0 rounded-full bg-brand" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-28">
              <TourPlanningCard tour={tour} />
            </div>
          </aside>
        </div>
      </Container>

      {related.length > 0 && (
        <section className="border-t border-line bg-surface-earth/60 py-20 lg:py-24">
          <Container>
            <Reveal>
              <SectionHeading
                eyebrow="You may also like"
                title="Related journeys"
                action={{ label: "All tours", href: "/tours" }}
              />
            </Reveal>
            <div className="mt-12 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <TourCard key={item.id} tour={item} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
