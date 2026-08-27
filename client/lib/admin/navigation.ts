import {
  BedDouble,
  CalendarCheck,
  CarFront,
  Coins,
  ClipboardCheck,
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
      // Siblings rather than a parent and a child: `isAdminPathActive` matches
      // on a path prefix, so a Transfers entry at /admin/transfers would stay
      // lit while the fleet page was open and two items would look selected.
      { label: "Transfer routes", href: "/admin/transfers/routes", icon: Route },
      { label: "Transfer fleet", href: "/admin/transfers/vehicles", icon: CarFront },
      { label: "Pick-up points", href: "/admin/transfers/points", icon: MapPin },
      { label: "Transfer extras", href: "/admin/transfers/extras", icon: Coins },
      { label: "Tours", href: "/admin/tours", icon: Map },
    ],
  },
  {
    title: "Network",
    items: [
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
