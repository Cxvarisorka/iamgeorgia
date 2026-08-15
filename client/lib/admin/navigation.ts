import {
  BedDouble,
  CalendarCheck,
  Handshake,
  LayoutDashboard,
  Map,
  type LucideIcon,
} from "lucide-react";

/**
 * Admin navigation.
 *
 * Grouped rather than flat: the operator's day splits into things that need a
 * decision (bookings, partner applications) and things that are catalogue
 * maintenance (hotels, tours). Keeping those apart is most of what makes a
 * back office navigable.
 */

export interface AdminNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Shown as a count pill — the number of records awaiting a decision. */
  badgeKey?: "pendingBookings" | "pendingPartners";
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

export const adminNavigation: AdminNavGroup[] = [
  {
    title: "Operations",
    items: [
      { label: "Overview", href: "/admin", icon: LayoutDashboard },
      {
        label: "Bookings",
        href: "/admin/bookings",
        icon: CalendarCheck,
        badgeKey: "pendingBookings",
      },
    ],
  },
  {
    title: "Inventory",
    items: [
      { label: "Hotels", href: "/admin/hotels", icon: BedDouble },
      { label: "Tours", href: "/admin/tours", icon: Map },
    ],
  },
  {
    title: "Network",
    items: [
      {
        label: "Partners",
        href: "/admin/partners",
        icon: Handshake,
        badgeKey: "pendingPartners",
      },
    ],
  },
];

/**
 * Marks a nav item active, including its detail pages, so opening one booking
 * keeps "Bookings" highlighted. `/admin` only matches exactly — otherwise the
 * overview would stay lit on every screen.
 *
 * The pathname arrives locale-prefixed on non-English URLs, so callers pass the
 * canonical path.
 */
export function isAdminPathActive(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
