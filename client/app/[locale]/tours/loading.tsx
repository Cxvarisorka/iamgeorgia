import { Container } from "@/components/ui/Container";
import { GridSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function ToursLoading() {
  return (
    <>
      <Skeleton className="h-[52svh] w-full rounded-none" />
      <Container className="py-16">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-10 w-2/3 max-w-xl" />
        <div className="mt-12">
          <GridSkeleton count={6} />
        </div>
      </Container>
    </>
  );
}
