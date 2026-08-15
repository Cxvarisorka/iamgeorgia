import type { Metadata } from "next";
import { Suspense } from "react";

import { TransferConfirmation } from "@/components/transfers/TransferConfirmation";
import { Container } from "@/components/ui/Container";
import { Skeleton } from "@/components/ui/Skeleton";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.transfers.confirmation.metaTitle,
    robots: { index: false, follow: false },
  };
}

export default function TransferConfirmationPage() {
  return (
    <Suspense fallback={<ConfirmationFallback />}>
      <TransferConfirmation />
    </Suspense>
  );
}

function ConfirmationFallback() {
  return (
    <Container className="pt-8 pb-24">
      <Skeleton className="h-8 w-full max-w-xl" />
      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Skeleton className="size-14 rounded-full" />
          <Skeleton className="mt-6 h-12 w-3/4" />
          <Skeleton className="mt-4 h-16 w-full" />
          <Skeleton className="mt-8 h-20 w-full" />
        </div>
        <div className="lg:col-span-5">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </Container>
  );
}
