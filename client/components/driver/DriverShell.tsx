"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, History, LogOut, Sun, UserRound } from "lucide-react";

import { signOut } from "@/lib/api/partners";
import { forgetViewer } from "@/lib/auth/useViewer";
import { useLocalePath } from "@/lib/i18n/provider";
import { stripLocale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import type { Session } from "@/types/auth";

/**
 * The driver panel's chrome.
 *
 * Built for a phone in one hand at a kerb: a thin top bar and a fixed bottom
 * tab bar with four big targets, safe-area padded. On a wider screen the same
 * four tabs move into the top bar and the bottom bar goes away.
 */
const TABS = [
  { label: "Today", href: "/driver", icon: Sun, exact: true },
  { label: "Upcoming", href: "/driver/upcoming", icon: CalendarDays },
  { label: "History", href: "/driver/history", icon: History },
  { label: "Me", href: "/driver/me", icon: UserRound },
];

export function DriverShell({ session, children }: { session: Session; children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const path = useLocalePath();
  const current = stripLocale(pathname);

  const isActive = (tab: (typeof TABS)[number]) =>
    tab.exact ? current === tab.href : current === tab.href || current.startsWith(`${tab.href}/`);

  const handleSignOut = async () => {
    try {
      await signOut();
    } finally {
      forgetViewer();
      router.replace(path("/driver/sign-in"));
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <a
        href="#driver-main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-200 focus:rounded-sm focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:text-on-dark"
      >
        Skip to content
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <Link href={path("/driver")} className="font-display text-[1rem] text-ink">
            I am Georgia
            <span className="ms-2 text-[0.6875rem] tracking-[0.12em] text-muted uppercase">Drivers</span>
          </Link>

          <nav aria-label="Driver panel" className="ms-6 hidden items-center gap-1 md:flex">
            {TABS.map((tab) => (
              <Link
                key={tab.href}
                href={path(tab.href)}
                aria-current={isActive(tab) ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-sm px-3 text-[0.8125rem] transition-colors",
                  isActive(tab) ? "bg-surface-soft font-medium text-ink" : "text-muted hover:bg-surface-soft hover:text-ink",
                )}
              >
                <tab.icon size={15} aria-hidden />
                {tab.label}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-3">
            <span className="hidden text-end sm:block">
              <span className="block text-[0.8125rem] font-medium text-ink">{session.user.fullName}</span>
              {session.driver?.provider && (
                <span className="block text-[0.6875rem] text-muted">{session.driver.provider.name}</span>
              )}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              aria-label="Sign out"
              className="inline-flex h-10 w-10 items-center justify-center rounded-sm border border-line text-body transition-colors hover:border-ink/40 hover:text-ink"
            >
              <LogOut size={16} className="rtl:-scale-x-100" aria-hidden />
            </button>
          </div>
        </div>
      </header>

      <main id="driver-main" className="mx-auto w-full max-w-3xl flex-1 px-4 pt-5 pb-24 md:pb-10">
        {children}
      </main>

      <nav
        aria-label="Driver panel"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="grid grid-cols-4">
          {TABS.map((tab) => (
            <li key={tab.href}>
              <Link
                href={path(tab.href)}
                aria-current={isActive(tab) ? "page" : undefined}
                className={cn(
                  "flex h-16 flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium transition-colors",
                  isActive(tab) ? "text-brand-text" : "text-muted",
                )}
              >
                <tab.icon size={22} aria-hidden />
                {tab.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
