import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TransferConfirmation } from "@/components/transfers/TransferConfirmation";
import { Container } from "@/components/ui/Container";
import { EmptyState } from "@/components/ui/EmptyState";
import { ApiError } from "@/lib/api/client";
import { getTransferBooking } from "@/lib/api/transfers";
import { getI18n } from "@/lib/i18n/server";
import type { TransferBooking } from "@/types/transfer";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return {
    title: t.transfers.confirmation.metaTitle,
    robots: { index: false, follow: false },
  };
}

/**
 * The voucher.
 *
 * A real record, read by reference. The `email` in the query string is not
 * decoration and not a nicety: references come from a sequence and are
 * trivially enumerable, so the server requires the address the booking was made
 * under before it will return anything to an anonymous reader. A signed-in
 * partner or admin needs no such proof and the parameter is ignored for them.
 *
 * This replaces a screen assembled from a query string and a `sessionStorage`
 * draft, which would happily render a confirmation for a booking that had never
 * been made.
 */
export default async function TransferConfirmationPage(
  props: PageProps<"/[locale]/transfers/confirmation/[reference]">,
) {
  const [{ reference }, searchParams, { t, path }] = await Promise.all([
    props.params,
    props.searchParams,
    getI18n(),
  ]);

  const emailParam = searchParams.email;
  const email = typeof emailParam === "string" ? emailParam : undefined;

  let booking: TransferBooking | null = null;

  try {
    booking = await getTransferBooking(reference, email);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    if (error.status === 400) notFound();
    if (error.status !== 404) throw error;
  }

  // 404 covers "no such booking" and "not yours" alike — the server does not
  // distinguish them, and neither should this page.
  if (!booking) {
    return (
      <Container className="py-24">
        <EmptyState
          title={t.transfers.confirmation.nothingTitle}
          description={t.transfers.confirmation.nothingBody}
          action={{
            label: t.transfers.booking.searchTransfers,
            href: path("/transfers"),
          }}
        />
      </Container>
    );
  }

  return <TransferConfirmation booking={booking} />;
}
