import { Container } from "@/components/ui/Container";
import { GridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function ExperiencesLoading() {
  return (
    <>
      <Skeleton className="h-[52svh] w-full rounded-none" />
      <Container className="py-16">
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-9 w-28 rounded-full" />
          ))}
        </div>
        <div className="mt-12">
          <GridSkeleton count={6} />
        </div>
      </Container>
    </>
  );
}
