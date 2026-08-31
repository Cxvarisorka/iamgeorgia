import {
  BedDouble,
  Bus,
  CalendarCheck,
  CarFront,
  Coins,
  ClipboardCheck,
  Globe2,
  Handshake,
  LayoutDashboard,
  Map,
  MapPin,
  Route,
  type LucideIcon,
} from "lucide-react";

/**
 * Admin navigation.
 *
 * Three levels, and each one earns its place. **Groups** split the operator's
 * day into things that need a decision (bookings, partner applications) and
 * things that are catalogue maintenance. **Sections** collect the screens of a
 * single vertical that is too big to sit flat — transfers alone owns four
 * catalogue screens, and left unnested they crowded out every other kind of
 * inventory in the sidebar. **Items** are the screens themselves.
 *
 * A vertical stays flat until it has more than one catalogue screen: hotels,
 * destinations and tours each have exactly one way in, and wrapping a single
 * link in a disclosure would be a control that hides one thing.
 */

export type AdminBadgeKey = "pendingBookings" | "pendingPartners";

export type AdminBadges = Record<AdminBadgeKey, number>;

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown as a count pill — the number of records awaiting a decision. */
  badgeKey?: AdminBadgeKey;
}

/** A collapsible run of items belonging to one vertical. */
export interface AdminNavSection {
  label: string;
  icon: LucideIcon;
  items: AdminNavItem[];
}

export type AdminNavEntry = AdminNavItem | AdminNavSection;

export interface AdminNavGroup {
  title: string;
  entries: AdminNavEntry[];
}

export function isAdminNavSection(entry: AdminNavEntry): entry is AdminNavSection {
  return "items" in entry;
}

export const adminNavigation: AdminNavGroup[] = [
  {
    title: "Operations",
    entries: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      // Two registers rather than one, because a TRF reference is not a BKG
      // one and the two lists share no identifier space. Both are named for
      // what they hold: "Bookings" on its own stopped being unambiguous the
      // moment the second register appeared in the sidebar.
      {
        label: "Hotel bookings",
        href: "/admin/bookings",
        icon: CalendarCheck,
        badgeKey: "pendingBookings",
      },
      { label: "Transfer bookings", href: "/admin/transfers/bookings", icon: CarFront },
    ],
  },
  {
    title: "Inventory",
    entries: [
      // First in the group, because everything under it is filed inside one:
      // a property, a tour or a pick-up point cannot be created until the place
      // it belongs to exists.
      { label: "Destinations", href: "/admin/destinations", icon: Globe2 },
      { label: "Hotels", href: "/admin/hotels", icon: BedDouble },
      {
        // A section rather than an item at /admin/transfers: that path only
        // redirects, and a disclosure that is also a link is a control whose
        // click does two different things depending on where it lands.
        //
        // Its active state is computed from the children, never from the
        // /admin/transfers prefix — Transfer bookings lives under that prefix
        // too and must not light up the catalogue section.
        label: "Transfers",
        icon: CarFront,
        items: [
          { label: "Routes", href: "/admin/transfers/routes", icon: Route },
          { label: "Fleet", href: "/admin/transfers/vehicles", icon: Bus },
          { label: "Pick-up points", href: "/admin/transfers/points", icon: MapPin },
          { label: "Extras", href: "/admin/transfers/extras", icon: Coins },
        ],
      },
      { label: "Tours", href: "/admin/tours", icon: Map },
    ],
  },
  {
    title: "Network",
    entries: [
      { label: "Partners", href: "/admin/partners", icon: Handshake },
      {
        // The review queue, badged with what is waiting. It sits beside the
        // register rather than inside it because it is the screen an operator
        // opens first, and a saved filter cannot carry a count in the sidebar.
        label: "Applications",
        href: "/admin/partners/applications",
        icon: ClipboardCheck,
        badgeKey: "pendingPartners",
      },
    ],
  },
];

/**
 * Marks a nav item active, including its detail pages, so opening one booking
 * keeps "Hotel bookings" highlighted. `/admin` only matches exactly — otherwise
 * the overview would stay lit on every screen.
 *
 * The pathname arrives locale-prefixed on non-English URLs, so callers pass the
 * canonical path.
 */
export function isAdminPathActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A section is active when one of its screens is — deliberately not a prefix
 * test on a shared parent path, which would light up Transfers whenever the
 * transfer *bookings* register was open.
 */
export function isAdminSectionActive(pathname: string, section: AdminNavSection): boolean {
  return section.items.some((item) => isAdminPathActive(pathname, item.href));
}

/**
 * What a collapsed section is hiding. A queue that needs attention must still
 * announce itself from a folded-away row, or collapsing the sidebar would be a
 * way to lose work.
 */
export function adminSectionBadgeCount(
  section: AdminNavSection,
  badges: AdminBadges,
): number {
  return section.items.reduce(
    (total, item) => total + (item.badgeKey ? badges[item.badgeKey] : 0),
    0,
  );
}
