import { cn } from "@/lib/utils";

/**
 * The I'am Georgia mark: the brand orange tile from the logo carrying a
 * warm-white Caucasus ridge and sun.
 *
 * Inlined as a component rather than loaded from /public as an SVG file — it
 * costs no extra request, scales without a raster step, and next/image refuses
 * to optimise SVG without `dangerouslyAllowSVG`. The colours are literal here
 * on purpose: this is the logo artwork, so it must not shift if a UI token is
 * ever retuned. `app/icon.svg` carries the same shapes for the browser tab.
 *
 * Decorative by default — the adjacent wordmark supplies the accessible name.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("shrink-0", className)}
      role="presentation"
      aria-hidden
      focusable="false"
    >
      <rect width="32" height="32" rx="7" fill="#EB6830" />
      <circle cx="25.5" cy="7" r="3" fill="#FFF9F3" />
      {/* The ridge runs off all three edges rather than floating inside the
          tile — inset, it read as the generic photo-placeholder glyph. */}
      <path d="M0 32 L10.5 10 L17.5 20.5 L22.5 14 L32 30 L32 32 Z" fill="#FFF9F3" />
    </svg>
  );
}
