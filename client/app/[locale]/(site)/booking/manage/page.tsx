import type { Metadata } from "next";

import { BookingLookupForm } from "@/components/booking/BookingLookupForm";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();

  return { title: t.booking.manage.metaTitle, description: t.booking.manage.description };
}

/**
 * Finding a booking without an account.
 *
 * There is no guest login on this site and there does not need to be: a
 * reference plus the email it was booked with is the credential, which is the
 * same pair the confirmation email carries.
 */
export default async function BookingLookupPage() {
  const { t, path } = await getI18n();

  return (
    <Container className="pt-8 pb-24 lg:pb-32">
      <Breadcrumbs
        items={[
          { label: t.common.home, href: path("/") },
          { label: t.booking.manage.crumb },
        ]}
      />

      <h1 className="type-h1 mt-6">{t.booking.manage.title}</h1>
      <p className="type-body-lg mt-4 max-w-2xl text-muted">{t.booking.manage.description}</p>

      <div className="mt-10">
        <BookingLookupForm />
      </div>
    </Container>
  );
}
