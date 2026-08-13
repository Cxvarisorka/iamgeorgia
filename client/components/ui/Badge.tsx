import { cn } from "@/lib/utils";

type Tone = "neutral" | "brand" | "light" | "nature" | "outline";

/**
 * Tones are named for what they mean, not what they look like. `nature` uses
 * the green accent rather than the success colour on purpose: a category label
 * is not a status, and reusing the semantic green there would make "mountain"
 * and "breakfast included" read as the same kind of information.
 */
const tones: Record<Tone, string> = {
  neutral: "bg-surface-soft text-body",
  brand: "bg-brand text-on-dark",
  light: "bg-background/90 text-ink backdrop-blur-sm",
  nature: "bg-accent-green text-on-dark",
  outline: "border border-line text-body",
};

interface BadgeProps {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}

export function Badge({ children, tone = "neutral", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.6875rem] font-semibold tracking-[0.12em] uppercase",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
