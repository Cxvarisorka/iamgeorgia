import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  /** `wide` for immersive sections, `prose` for long-form reading. */
  size?: "default" | "wide" | "prose";
  className?: string;
}

const sizes = {
  default: "max-w-(--container-page)",
  wide: "max-w-[96rem]",
  prose: "max-w-(--container-prose)",
} as const;

export function Container({ children, size = "default", className }: ContainerProps) {
  return (
    <div className={cn("mx-auto w-full px-5 sm:px-8 lg:px-12", sizes[size], className)}>
      {children}
    </div>
  );
}
