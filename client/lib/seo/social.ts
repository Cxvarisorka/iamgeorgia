import { site } from "@/constants/site";
import type { ImageAsset } from "@/types/catalogue";

/**
 * The image a link preview shows.
 *
 * Facebook, WhatsApp, Telegram, LinkedIn and X each fetch `og:image` with
 * their own crawler, and those crawlers are pickier than a browser: several
 * still render nothing for WebP or AVIF, none execute JavaScript, and all of
 * them want a public, absolute, HTTPS address. This file is the one place the
 * choice is made, so the four entity pages cannot each drift into a different
 * rule.
 *
 * Preference order, first hit wins:
 *
 *   1. An uploaded asset's JPEG or PNG original — the uploader keeps the
 *      original bytes beside the WebP renditions precisely because some
 *      consumers cannot read the renditions.
 *   2. An uploaded asset's largest rendition, when the original is itself
 *      WebP or AVIF: a picture in a format some crawlers skip beats no picture.
 *   3. An editorial path under /public (`/images/tours/…`), which is JPEG.
 *   4. The platform card, a 1200×630 JPEG cut for exactly this purpose.
 *
 * Nothing is invented: a candidate that is null, empty, or has no usable
 * rendition is skipped rather than guessed at.
 */

export interface SocialImage {
  url: string;
  width?: number;
  height?: number;
}

type Candidate = ImageAsset | string | null | undefined;

const CRAWLER_SAFE = new Set(["image/jpeg", "image/png", "image/gif"]);

function fromAsset(asset: ImageAsset): SocialImage | null {
  const jpeg = asset.variants.find(
    (variant) => variant.format === "jpeg" && variant.variant === "gallery",
  );
  if (jpeg) return { url: jpeg.url, width: jpeg.width, height: jpeg.height };

  if (CRAWLER_SAFE.has(asset.mimeType) && asset.url) {
    return {
      url: asset.url,
      ...(asset.width && asset.height ? { width: asset.width, height: asset.height } : {}),
    };
  }

  const largest = [...asset.variants].sort((a, b) => b.width - a.width)[0];
  if (largest) return { url: largest.url, width: largest.width, height: largest.height };

  return asset.url ? { url: asset.url } : null;
}

/** The brand card, for pages with nothing better and as the final fallback. */
export function platformSocialImage(): SocialImage {
  return { url: site.seo.image, width: site.seo.imageWidth, height: site.seo.imageHeight };
}

/**
 * The first usable candidate, or the platform card.
 *
 * Callers list candidates in their own order of preference — typically the
 * explicit cover, then the gallery, then any editorial path.
 */
export function socialImage(candidates: Candidate[]): SocialImage {
  for (const candidate of candidates) {
    if (!candidate) continue;

    if (typeof candidate === "string") {
      if (candidate.trim()) return { url: candidate };
      continue;
    }

    const picked = fromAsset(candidate);
    if (picked) return picked;
  }

  return platformSocialImage();
}
