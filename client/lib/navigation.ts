/**
 * Single source of truth for site navigation — header, mobile menu and footer.
 *
 * Items carry a dictionary *key* rather than a label: the words come from the
 * active locale at render time. `href` is always the canonical, unprefixed
 * path — components run it through `localePath` to add the locale segment.
 */

import { CarFront } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { stripLocale } from "@/lib/i18n/config";
import type { UiDictionary } from "@/lib/i18n/ui/en";

export type NavKey =
  | "tours"
  | "destinations"
  | "hotels"
  | "transfers"
  | "experiences"
  | "about";

export interface NavItem {
  key: NavKey;
  href: string;
  /**
   * Optional glyph. The nav is otherwise deliberately text-only — an icon here
   * marks an item as a different *kind* of thing rather than another editorial
   * section. Transfers is a point-to-point transport service sitting among
   * inspiration-led sections, and the car reads that distinction instantly.
   * The label always accompanies it; the icon never carries meaning alone.
   */
  icon?: LucideIcon;
}

export const primaryNavigation: NavItem[] = [
  { key: "tours", href: "/tours" },
  { key: "destinations", href: "/destinations" },
  { key: "hotels", href: "/hotels" },
  { key: "transfers", href: "/transfers", icon: CarFront },
  { key: "experiences", href: "/experiences" },
  { key: "about", href: "/about" },
];

export function navLabel(t: UiDictionary, key: NavKey): string {
  return t.nav[key];
}

export function navDescription(t: UiDictionary, key: NavKey): string {
  return t.nav.descriptions[key];
}

export interface FooterGroup {
  title: string;
  items: { label: string; href: string }[];
}

/** Built per-locale because both the group titles and the labels are translated. */
export function footerNavigation(t: UiDictionary): FooterGroup[] {
  return [
    {
      title: t.nav.groups.explore,
      items: [
        { label: t.nav.tours, href: "/tours" },
        { label: t.nav.destinations, href: "/destinations" },
        { label: t.nav.hotels, href: "/hotels" },
        { label: t.nav.transfers, href: "/transfers" },
        { label: t.nav.experiences, href: "/experiences" },
      ],
    },
    {
      title: t.nav.groups.company,
      items: [
        { label: t.nav.about, href: "/about" },
        { label: t.nav.contact, href: "/contact" },
        { label: t.nav.planTrip, href: "/contact" },
      ],
    },
  ];
}

/**
 * Marks a nav item active for the current pathname, including its detail pages
 * (`/tours/kazbegi-…` keeps "Tours" highlighted). "/" only matches exactly.
 *
 * The pathname arrives locale-prefixed (`/ka/tours`), so it is normalised back
 * to the canonical path before comparing — otherwise nothing would ever match
 * outside English.
 */
export function isActivePath(pathname: string, href: string): boolean {
  const path = stripLocale(pathname);
  if (href === "/") return path === "/";
  return path === href || path.startsWith(`${href}/`);
}
