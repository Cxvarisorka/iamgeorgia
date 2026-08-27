import type { Metadata } from "next";

import { CheckoutForm } from "@/components/booking/CheckoutForm";
import { BookingSteps } from "@/components/booking/BookingSteps";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return {
    title: t.booking.checkout.metaTitle,
    // A checkout is one person's transient state, and every URL under it is
    // scoped to a hold that has already expired by the time a crawler arrives.
    robots: { index: false, follow: false },
  };
}

/**
 * Checkout.
 *
 * The hold token is the only thing in the URL, which is what makes a refresh
 * resume the same hold rather than take a second one off the same room. The
 * form itself is a Client Component: it reads the summary out of the tab's own
 * session storage, counts the hold down and posts the confirmation.
 */
export default async function CheckoutPage(props: PageProps<"/[locale]/booking/checkout">) {
  const searchParams = await props.searchParams;
  const { t, path } = await getI18n();

  const requested = searchParams.hold;
  const holdToken = Array.isArray(requested) ? requested[0] : (requested ?? null);

  return (
    <>
      <Container className="pt-8 pb-2">
        <Breadcrumbs
          items={[
            { label: t.common.home, href: path("/") },
            { label: t.nav.hotels, href: path("/hotels") },
            { label: t.booking.checkout.crumb },
          ]}
        />
        <h1 className="type-h1 mt-6">{t.booking.checkout.title}</h1>
        <div className="mt-8">
          <BookingSteps current="details" />
        </div>
      </Container>

      <CheckoutForm holdToken={holdToken} />
    </>
  );
}
