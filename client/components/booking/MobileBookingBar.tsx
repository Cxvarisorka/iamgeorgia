"use client";

import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/Button";

interface MobileBookingBarProps {
  /** Small line above the figure — "From", "Total". */
  caption: string;
  /** The figure itself, already formatted for the reader's locale. */
  price: string;
  /** Qualifier after the figure — "/ night", "per person". */
  note?: string;
  href: string;
  action: string;
}

/**
 * The fixed price-and-action strip on property, tour and transfer pages below
 * `lg`, where the sidebar panel has dropped under the content.
 *
 * It publishes its own height as `--booking-bar-offset` so the cookie notice
 * can sit above it instead of covering the one button the page is built
 * around. Measured rather than assumed: a long price or a two-line label in
 * Georgian makes the bar taller, and at `lg` it is `display: none` and the
 * offset falls back to zero on its own.
 *
 * The bottom padding clears the home indicator on devices that report a safe
 * area inset.
 */
export function MobileBookingBar({ caption, price, note, href, action }: MobileBookingBarProps) {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const root = document.documentElement;
    const sync = () => root.style.setProperty("--booking-bar-offset", `${bar.offsetHeight}px`);

    sync();
    const observer = new ResizeObserver(sync);
    observer.observe(bar);

    return () => {
      observer.disconnect();
      root.style.removeProperty("--booking-bar-offset");
    };
  }, []);

  return (
    <div
      ref={barRef}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <div className="flex items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <p>
          <span className="type-caption block text-muted">{caption}</span>
          <span className="type-h4 tabular-nums">
            {price}
            {note && <span className="type-caption font-normal text-muted"> {note}</span>}
          </span>
        </p>

        <Button href={href}>{action}</Button>
      </div>
    </div>
  );
}
