import { permanentRedirect } from "next/navigation";

/**
 * One address per record.
 *
 * The API resolves a detail request by id *or* slug, and lowercases the slug
 * it is given, so `/hotels/8f1c…-uuid` and `/hotels/Vera-House` both answer
 * with the same property as `/hotels/vera-house`. A canonical tag tells a
 * search engine which one counts, but a visitor who shares the odd one still
 * spreads it, and a database id in a public URL is something to keep out of
 * circulation. A permanent redirect closes the gap: the record's own slug is
 * the only address that renders.
 *
 * The query string travels with the redirect — a dated hotel URL with the
 * wrong slug case should land on the dated page, not the brochure.
 */
type SearchParams = Record<string, string | string[] | undefined>;

export function redirectToCanonicalSlug(
  requested: string,
  canonical: string,
  href: string,
  searchParams?: SearchParams,
): void {
  if (requested === canonical) return;

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) query.append(key, entry);
  }
  const suffix = query.toString();

  permanentRedirect(suffix ? `${href}?${suffix}` : href);
}
