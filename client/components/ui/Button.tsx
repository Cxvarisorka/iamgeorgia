import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "outlineBrand"
  | "outlineLight"
  | "ghost"
  | "light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-sm font-sans font-semibold whitespace-nowrap " +
  "transition-[background-color,color,border-color,transform] duration-200 ease-(--ease-out-soft) " +
  "active:translate-y-px disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  // The brand signature. Every booking, reserve and plan-a-trip action.
  primary: "bg-brand text-white hover:bg-brand-hover",
  secondary: "bg-ink text-on-dark hover:bg-ink-soft",
  outline: "border border-ink/25 bg-transparent text-ink hover:border-ink hover:bg-surface-soft",
  // Orange outline — used sparingly, and with the darker orange so the label
  // clears AA on a light surface.
  outlineBrand:
    "border border-brand bg-transparent text-brand-text hover:bg-brand-soft hover:border-brand-hover",
  ghost: "bg-transparent text-ink hover:bg-surface-soft",
  // The two variants below are for dark surfaces and photography. They exist as
  // real variants rather than className overrides, because two competing colour
  // utilities on one element resolve by stylesheet order, not by author order.
  outlineLight:
    "border border-on-dark/40 bg-transparent text-on-dark hover:border-on-dark hover:bg-on-dark/10",
  light: "bg-background/95 text-ink backdrop-blur-sm hover:bg-background",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-[0.8125rem]",
  md: "h-11 px-6 text-[0.9375rem]",
  lg: "h-13 px-8 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Button attributes are listed explicitly rather than spread. It keeps the API
 * small and readable, and it means presentational props can never leak onto the
 * DOM element.
 */
type ButtonProps = CommonProps & {
  href?: undefined;
  /** Defaults to "button" — pass "submit" inside a form. */
  type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  onClick?: () => void;
  disabled?: boolean;
  "aria-label"?: string;
};

type LinkProps = CommonProps & {
  href: string;
  /** Set for links leaving the site. */
  external?: boolean;
  /** Useful for links that also need to dismiss a menu or dialog. */
  onClick?: () => void;
};

/**
 * Renders a `<Link>` when given `href`, otherwise a `<button>`.
 * Every call-to-action in the product goes through this component so heights,
 * radii and motion stay identical everywhere.
 */
export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", fullWidth, className, children } = props;
  const classes = cn(base, variants[variant], sizes[size], fullWidth && "w-full", className);

  if ("href" in props && props.href !== undefined) {
    const { href, external, onClick } = props;
    if (external) {
      return (
        <a
          href={href}
          className={classes}
          onClick={onClick}
          target="_blank"
          rel="noreferrer noopener"
        >
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {children}
      </Link>
    );
  }

  const { type = "button", onClick, disabled } = props;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={props["aria-label"]}
      className={classes}
    >
      {children}
    </button>
  );
}
