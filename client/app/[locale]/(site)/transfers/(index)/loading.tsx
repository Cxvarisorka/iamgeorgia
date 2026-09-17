import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

/** Mirrors the landing hero and the search panel that overlaps it. */
export default function TransfersLoading() {
  return (
    <>
      <Skeleton className="h-[68svh] w-full rounded-none" />
      {/* Offsets must match the real hero overlap in page.tsx, or the search
          panel jumps when the skeleton is replaced. */}
      <Container className="relative z-20 -mt-10 lg:-mt-12">
        <Skeleton className="h-40 w-full" />
      </Container>
      <Container className="py-20">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-5 h-10 w-2/3 max-w-xl" />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-32 w-full" />
          ))}
        </div>
      </Container>
    </>
  );
}
