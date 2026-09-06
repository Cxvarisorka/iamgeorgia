import type { Metadata } from "next";

import { site } from "@/constants/site";
import { localeMeta, locales, type Locale } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { localeAlternates } from "@/lib/seo/urls";

/**
 * One page's search metadata.
 *
 * Every indexable page in the `(site)` tree goes through here, and that is the
 * point: a self-referencing canonical and a reciprocal hreflang set are the two
 * things a four-language site under one domain cannot get wrong, and neither is
 * something to retype per route.
 *
 * The `[locale]` layout deliberately sets no `alternates` of its own. Next
 * inherits metadata down the segment tree, so a layout-level canonical would
 * quietly claim every deep page as a duplicate of the home page — which is
 * worse than emitting nothing at all.
 */

/** OG wants `en_GB`; the locale table already holds `en-GB`. */
const ogLocale = (locale: Locale) => localeMeta[locale].intlLocale.replace("-", "_");

/**
 * Google truncates a description around 155 characters, and a sentence cut
 * mid-word in a result reads as neglect. Operator prose — a property summary,
 * a route description — has no length discipline, so it is trimmed at the last
 * word boundary that fits rather than at the character.
 *
 * An empty description is worse than a generic one: a page with none at all
 * gets whatever fragment the crawler picks off the page.
 */
const LIMIT = 155;

function clamp(text: string): string {
  const value = text.trim() || site.description;
  if (value.length <= LIMIT) return value;

  const cut = value.slice(0, LIMIT - 1);
  const boundary = cut.lastIndexOf(" ");

  return `${(boundary > LIMIT / 2 ? cut.slice(0, boundary) : cut).replace(/[.,;:\s]+$/, "")}…`;
}

export interface PageMetadataInput {
  /**
   * The canonical, unprefixed route — `/tours`, `/hotels/kazbegi-lodge`.
   * Never the requested URL: a filtered or dated listing canonicalises to the
   * clean page, so what is passed here carries no query string.
   */
  path: string;
  title: string;
  description: string;
  /**
   * Card image. A path under /public or an absolute URL from the media bucket;
   * falls back to the brand image when the record has none.
   */
  image?: string | null;
  imageAlt?: string;
  /** Opts out of the `%s — I'am Georgia` template, for the home page. */
  absoluteTitle?: boolean;
  /**
   * `false` keeps the page out of the index while still following its links —
   * a search result, a checkout step, a lookup form. A noindex page gets no
   * canonical and no hreflang: pointing an alternates set at a page search
   * engines are told to drop is a contradiction they resolve by ignoring both.
   */
  index?: boolean;
  type?: "website" | "article";
}

export async function pageMetadata({
  path,
  title,
  description,
  image,
  imageAlt,
  absoluteTitle = false,
  index = true,
  type = "website",
}: PageMetadataInput): Promise<Metadata> {
  const locale = await getLocale();
  const alternates = localeAlternates(locale, path);
  const summary = clamp(description);

  const card = {
    url: image || site.seo.image,
    alt: imageAlt ?? site.seo.imageAlt,
    ...(image ? {} : { width: site.seo.imageWidth, height: site.seo.imageHeight }),
  };

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: summary,
    ...(index ? { alternates } : { robots: { index: false, follow: true } }),
    openGraph: {
      type,
      siteName: site.name,
      title,
      description: summary,
      ...(index ? { url: alternates.canonical } : {}),
      locale: ogLocale(locale),
      /** Tells the crawler the same page exists in the other three. */
      alternateLocale: locales.filter((code) => code !== locale).map(ogLocale),
      images: [card],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: summary,
      images: [card],
    },
  };
}
