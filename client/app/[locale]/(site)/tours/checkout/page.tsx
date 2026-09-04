import type { Metadata } from "next";

import { BookingSteps } from "@/components/booking/BookingSteps";
import { TourCheckoutForm } from "@/components/tours/TourCheckoutForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return {
    title: t.tours.checkout.metaTitle,
    // One person's transient state, scoped to a hold that has expired by the
    // time a crawler arrives.
    robots: { index: false, follow: false },
  };
}

/**
 * Tour checkout.
 *
 * Its own route rather than a mode of the hotel checkout: a tour hold is a
 * different record on a different endpoint, and the form asks for different
 * things (passports and dietary needs, not room requests). The hold token is
 * the only thing in the URL, so a refresh resumes the same hold.
 */
export default async function TourCheckoutPage(props: PageProps<"/[locale]/tours/checkout">) {
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
            { label: t.nav.tours, href: path("/tours") },
            { label: t.tours.checkout.crumb },
          ]}
        />
        <h1 className="type-h1 mt-6">{t.tours.checkout.title}</h1>
        <div className="mt-8">
          <BookingSteps current="details" labels={t.tours.checkout.steps} />
        </div>
      </Container>

      <TourCheckoutForm holdToken={holdToken} />
    </>
  );
}
