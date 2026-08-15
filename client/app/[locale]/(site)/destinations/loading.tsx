import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DestinationsLoading() {
  return (
    <>
      <Skeleton className="h-[52svh] w-full rounded-none" />
      <Container className="py-20">
        <div className="flex flex-col gap-24">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="grid items-center gap-8 lg:grid-cols-12 lg:gap-16">
              <Skeleton className="aspect-16/11 lg:col-span-7" />
              <div className="flex flex-col gap-4 lg:col-span-5">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-12 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </Container>
    </>
  );
}
