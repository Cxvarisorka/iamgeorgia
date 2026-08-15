import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** Base shimmer block. Animation is disabled by the global reduced-motion rule. */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn("animate-pulse rounded-sm bg-sand/70", className)} />;
}

/** Matches the proportions of TourCard / ExperienceCard so layout does not shift. */
export function CardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="aspect-4/3 w-full rounded-sm" />
      <div className="flex flex-col gap-2.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** Matches the horizontal HotelCard used on the hotels index. */
export function HotelCardSkeleton() {
  return (
    <div className="flex flex-col gap-5 border border-line bg-surface p-4 sm:flex-row">
      <Skeleton className="aspect-4/3 w-full shrink-0 sm:w-64" />
      <div className="flex flex-1 flex-col gap-3 py-1">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="mt-auto flex items-end justify-between pt-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}

/** Matches the horizontal TransferCard used on the transfer results page. */
export function TransferCardSkeleton() {
  return (
    <div className="flex flex-col gap-5 border border-line bg-surface p-4 sm:flex-row sm:p-5">
      <Skeleton className="h-28 w-full shrink-0 sm:w-48 lg:w-56" />
      <div className="flex flex-1 flex-col gap-3 py-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-2/3" />
        <div className="mt-auto flex items-end justify-between pt-4">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-11 w-32" />
        </div>
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}
