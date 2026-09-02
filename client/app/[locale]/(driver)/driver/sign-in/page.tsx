import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Container } from "@/components/ui/Container";
import { PortalSignInForm } from "@/components/partners/PortalSignInForm";
import { getSession } from "@/lib/auth/session";
import { localePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { homePathFor } from "@/types/auth";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default async function DriverSignInPage() {
  const session = await getSession();
  const locale = await getLocale();

  if (session) {
    redirect(localePath(locale, homePathFor(session)));
  }

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-sm">
        <h1 className="font-display text-[2rem] leading-tight text-ink">Driver sign in</h1>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted">
          Use the email address your activation link was sent to.
        </p>

        <PortalSignInForm redirectTo="/driver" />
      </div>
    </Container>
  );
}
