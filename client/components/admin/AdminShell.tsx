"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { AdminSidebar } from "./AdminSidebar";
import { adminUser } from "@/data/admin/user";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

interface AdminShellProps {
  badges: { pendingBookings: number; pendingPartners: number };
  children: React.ReactNode;
}

/**
 * The chrome every admin screen sits inside: fixed sidebar on desktop, drawer
 * on mobile, and a top bar carrying search and the operator's account.
 *
 * A client component because the drawer and account menu are interactive, but
 * it takes its content as `children`, so each page underneath still renders on
 * the server.
 */
export function AdminShell({ badges, children }: AdminShellProps) {
  const pathname = usePathname();
  const path = useLocalePath();
  const accountRef = useRef<HTMLDivElement>(null);

  /**
   * Both overlays are stamped with the route they were opened on, so a
   * navigation closes them without an effect having to reach in and reset
   * anything — the drawer must never survive the page it was opened from.
   */
  const [overlay, setOverlay] = useState({
    route: pathname,
    nav: false,
    account: false,
  });
  const current = overlay.route === pathname ? overlay : { nav: false, account: false };
  const navOpen = current.nav;
  const accountOpen = current.account;

  // Stable across renders so the effects below can depend on them honestly.
  const setNavOpen = useCallback(
    (open: boolean) => setOverlay({ route: pathname, nav: open, account: false }),
    [pathname],
  );
  const setAccountOpen = useCallback(
    (open: boolean) => setOverlay({ route: pathname, nav: false, account: open }),
    [pathname],
  );

  useEffect(() => {
    if (!navOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [navOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen, setAccountOpen]);

  return (
    <div className="flex min-h-svh w-full bg-background">
      <AdminSidebar badges={badges} open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col lg:ps-64">
        <header className="sticky top-0 z-60 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-background/90 px-4 backdrop-blur-md sm:px-6">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Open navigation"
            aria-expanded={navOpen}
            className="flex size-10 shrink-0 items-center justify-center rounded-sm text-ink transition-colors hover:bg-surface-soft lg:hidden"
          >
            <Menu size={20} aria-hidden />
          </button>

          {/* Presentational only — this prototype has no search index. */}
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Search
              size={16}
              className="pointer-events-none absolute top-1/2 start-3 -translate-y-1/2 text-subtle"
              aria-hidden
            />
            <input
              type="search"
              placeholder="Search bookings, partners…"
              aria-label="Search the admin panel"
              className="h-10 w-full rounded-sm border border-line bg-surface ps-9 pe-3 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
            />
          </div>

          <div className="ms-auto flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Notifications, ${badges.pendingBookings + badges.pendingPartners} awaiting review`}
              className="relative flex size-10 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-soft hover:text-ink"
            >
              <Bell size={18} aria-hidden />
              {badges.pendingBookings + badges.pendingPartners > 0 && (
                <span
                  className="absolute top-2 end-2 size-2 rounded-full bg-brand ring-2 ring-background"
                  aria-hidden
                />
              )}
            </button>

            <div ref={accountRef} className="relative">
              <button
                type="button"
                onClick={() => setAccountOpen(!accountOpen)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex items-center gap-2 rounded-sm py-1.5 ps-1.5 pe-2 transition-colors hover:bg-surface-soft"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-ink text-[0.6875rem] font-semibold text-on-dark">
                  {adminUser.initials}
                </span>
                <span className="hidden text-start sm:block">
                  <span className="block text-[0.8125rem] font-medium text-ink">
                    {adminUser.name}
                  </span>
                  <span className="block text-[0.6875rem] text-muted">{adminUser.role}</span>
                </span>
                <ChevronDown
                  size={15}
                  className={cn(
                    "shrink-0 text-subtle transition-transform duration-200",
                    accountOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {accountOpen && (
                <div
                  role="menu"
                  className="absolute top-full end-0 z-70 mt-2 w-56 rounded-sm border border-line bg-surface p-1.5 shadow-lift"
                >
                  <p className="px-3 py-2">
                    <span className="block text-[0.8125rem] font-medium text-ink">
                      {adminUser.name}
                    </span>
                    <span className="block truncate text-[0.75rem] text-muted">
                      {adminUser.email}
                    </span>
                  </p>
                  <Link
                    href={path("/admin/sign-in")}
                    role="menuitem"
                    className="flex items-center gap-2.5 rounded-sm px-3 py-2 text-[0.8125rem] text-body transition-colors hover:bg-surface-soft hover:text-ink"
                  >
                    <LogOut size={15} className="text-subtle rtl:-scale-x-100" aria-hidden />
                    Sign out
                  </Link>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Standing reminder of what this is, so nobody mistakes it for live data. */}
        <p className="border-b border-brand/25 bg-brand-soft px-4 py-2 text-center text-[0.75rem] text-brand-text sm:px-6">
          Front-end prototype — every figure below is mock data. Nothing is saved,
          sent or charged.
        </p>

        <main id="admin-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
