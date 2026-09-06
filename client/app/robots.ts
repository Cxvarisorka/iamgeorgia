import type { MetadataRoute } from "next";

import { site } from "@/constants/site";
import { locales } from "@/lib/i18n/config";
import { absoluteUrl, localeUrl } from "@/lib/seo/urls";

/**
 * `/robots.txt`.
 *
 * Three private trees, each of which exists at four addresses because the
 * locale prefix sits above them — `/admin` and `/ka/admin` are the same panel.
 * They are listed explicitly rather than matched with a wildcard: `Disallow`
 * globbing is an extension, not part of the standard, and a crawler that does
 * not implement it would read `/*​/admin` as a literal path and index the lot.
 *
 * Everything else stays crawlable on purpose. A checkout or a booking lookup is
 * kept out of the index by its `noindex` meta, and a crawler has to be allowed
 * to fetch the page to see that meta at all — blocking it here would leave the
 * URL indexable from an inbound link with none of the page's own instructions.
 */
const PRIVATE_TREES = ["/admin", "/driver", "/portal"];

export default function robots(): MetadataRoute.Robots {
  const disallow = [
    ...PRIVATE_TREES.flatMap((tree) =>
      locales.map((locale) => new URL(localeUrl(locale, tree)).pathname),
    ),
    /** Nothing proxies the API through this origin today; a guard, not a fix. */
    "/api/",
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow }],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: site.url,
  };
}
