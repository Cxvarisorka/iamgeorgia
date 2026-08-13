import type { Metadata } from "next";

import { CTASection } from "@/components/home/CTASection";
import { CultureStory } from "@/components/home/CultureStory";
import { FeaturedExperiences } from "@/components/home/FeaturedExperiences";
import { FeaturedHotels } from "@/components/home/FeaturedHotels";
import { Hero } from "@/components/home/Hero";
import { PopularDestinations } from "@/components/home/PopularDestinations";
import { SignatureTours } from "@/components/home/SignatureTours";
import { Statement } from "@/components/home/Statement";
import { TravelInspiration } from "@/components/home/TravelInspiration";
import { WhyIamGeorgia } from "@/components/home/WhyIamGeorgia";
import { site } from "@/constants/site";
import { getI18n } from "@/lib/i18n/server";

/**
 * `absolute` opts out of the root `%s — I'am Georgia` template: the home tab
 * should read as the brand plus its tagline, not "Home — I'am Georgia".
 */
export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: { absolute: `${site.name} — ${t.meta.tagline}` },
    description: t.meta.description,
  };
}

/**
 * Section order is deliberate: immersive → quiet → editorial → cards → immersive
 * → cards → quiet → editorial → immersive. No two neighbouring sections share a
 * layout, which is what keeps a long homepage from feeling like a template.
 */
export default function HomePage() {
  return (
    <>
      <Hero />
      <Statement />
      <PopularDestinations />
      <SignatureTours />
      <CultureStory />
      <FeaturedExperiences />
      <FeaturedHotels />
      <WhyIamGeorgia />
      <TravelInspiration />
      <CTASection />
    </>
  );
}
