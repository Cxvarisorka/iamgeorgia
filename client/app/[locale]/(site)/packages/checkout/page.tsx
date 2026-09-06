import type { Metadata } from "next";

import { BookingSteps } from "@/components/booking/BookingSteps";
import { OrderCheckoutForm } from "@/components/packages/OrderCheckoutForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return {
    title: t.orders.checkout.metaTitle,
    // One person's transient state, scoped to holds that have expired by the
    // time a crawler arrives.
    robots: { index: false, follow: false },
  };
}

/**
 * Package checkout.
 *
 * Its own route rather than a mode of the hotel or tour checkout: this one
 * commits four bookings in a single call and has to render a refusal that
 * names individual slots, which neither of the others has any concept of.
 *
 * Nothing is in the URL — the composite offer and its holds live in the tab's
 * draft. See the note on `OrderCheckoutForm`.
 */
export default async function PackageCheckoutPage() {
  const { t, path } = await getI18n();

  return (
    <>
      <Container className="pt-8 pb-2">
        <Breadcrumbs
          items={[
            { label: t.common.home, href: path("/") },
            { label: t.nav.packages, href: path("/packages") },
            { label: t.orders.checkout.crumb },
          ]}
        />
        <h1 className="type-h1 mt-6">{t.orders.checkout.title}</h1>
        <div className="mt-8">
          <BookingSteps current="details" labels={t.orders.checkout.steps} />
        </div>
      </Container>

      <OrderCheckoutForm />
    </>
  );
}
