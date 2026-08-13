"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

import { LanguageMenu } from "./LanguageMenu";
import { Logo } from "./Logo";
import { MobileNavigation } from "./MobileNavigation";
import { Button } from "@/components/ui/Button";
import { site } from "@/constants/site";
import { stripLocale } from "@/lib/i18n/config";
import { useI18n, useLocalePath } from "@/lib/i18n/provider";
import { isActivePath, navLabel, primaryNavigation } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Routes that open with a full-bleed dark hero, where the header starts
 * transparent and settles into a solid surface on scroll.
 *
 * Tour and hotel detail pages are excluded on purpose: both open with a
 * breadcrumb and gallery on a light background, so the header must be solid
 * from the top or the wordmark would sit warm-white on warm-white.
 *
 * Takes the canonical path — `/ka/about` has to read as `/about` here, or
 * every non-English page would render the solid header over its dark hero.
 */
function hasImmersiveHero(pathname: string): boolean {
  const path = stripLocale(pathname);
  if (path === "/" || path === "/about") return true;
  if (["/tours", "/destinations", "/experiences", "/hotels"].includes(path)) return true;
  return /^\/(destinations|experiences)\/[^/]+$/.test(path);
}

export function Header() {
  const pathname = usePathname();
  const { t } = useI18n();
  const path = useLocalePath();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const immersive = hasImmersiveHero(pathname);
  const overImagery = immersive && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ease-(--ease-out-soft)",
          overImagery
            ? "bg-transparent"
            : "border-b border-line/70 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/75",
        )}
      >
        <div className="mx-auto flex h-18 w-full max-w-(--container-page) items-center justify-between gap-6 px-5 sm:px-8 lg:h-20 lg:px-12">
          <Link href={path("/")} className="flex items-center gap-2.5 focus-visible:outline-offset-4">
            <Logo className="size-8 lg:size-9" />
            <span
              className={cn(
                "font-display text-lg leading-none font-medium tracking-[0.06em] transition-colors lg:text-xl",
                overImagery ? "text-on-dark" : "text-ink",
              )}
            >
              {site.wordmark}
            </span>
          </Link>

          <nav aria-label={t.a11y.primaryNav} className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {primaryNavigation.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.key}>
                    <Link
                      href={path(item.href)}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative py-2 text-sm font-medium transition-colors",
                        // A single hairline in brand orange is the whole active
                        // indicator — no orange pills or filled backgrounds in the nav.
                        "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-[inline-start] after:scale-x-0 after:bg-brand after:transition-transform after:duration-300 after:ease-(--ease-out-soft) hover:after:scale-x-100",
                        // Over photography the logo orange reads cleanly (5.8:1 on
                        // charcoal); on warm white it needs the darker shade for AA.
                        overImagery
                          ? "text-on-dark/85 hover:text-brand"
                          : "text-ink hover:text-brand-text",
                        active && "after:scale-x-100",
                        active && (overImagery ? "text-brand" : "text-brand-text"),
                      )}
                    >
                      {navLabel(t, item.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2 lg:gap-4">
            <LanguageMenu tone={overImagery ? "light" : "dark"} />

            <Button
              href={path("/contact")}
              size="sm"
              variant={overImagery ? "light" : "primary"}
              className="hidden sm:inline-flex"
            >
              {t.actions.planYourTrip}
            </Button>

            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={t.a11y.openMenu}
              aria-expanded={menuOpen}
              className={cn(
                "flex size-10 items-center justify-center rounded-sm transition-colors lg:hidden",
                overImagery ? "text-on-dark hover:bg-on-dark/15" : "text-ink hover:bg-surface-soft",
              )}
            >
              <Menu size={22} aria-hidden />
            </button>
          </div>
        </div>
      </header>

      {/* Pages without a full-bleed hero start below the fixed header. */}
      {!immersive && <div className="h-18 lg:h-20" aria-hidden />}

      <MobileNavigation open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
