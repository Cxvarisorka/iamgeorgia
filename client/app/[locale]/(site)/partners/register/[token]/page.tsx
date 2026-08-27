import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MailWarning, ShieldCheck } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { PartnerRegistrationWizard } from "@/components/partners/PartnerRegistrationWizard";
import { ApiError } from "@/lib/api/client";
import { getInvitationPreview } from "@/lib/api/partners";
import { getI18n } from "@/lib/i18n/server";
import type { InvitationPreview } from "@/types";

export const metadata: Metadata = {
  title: "Complete your partner registration",
  // An invitation link is private. It must never end up in an index.
  robots: { index: false, follow: false },
};

/**
 * The one page an invited partner reaches without an account.
 *
 * The token in the URL is the entire credential, so the server is asked to
 * validate it before anything is rendered — and it answers with the *reason*
 * a link is unusable, not just that it is. Expired, withdrawn and
 * already-used are three different conversations to have with the person
 * holding it, so they get three different screens.
 */
export default async function PartnerRegisterPage({
  params,
}: PageProps<"/[locale]/partners/register/[token]">) {
  const { token } = await params;
  const { path } = await getI18n();

  let invitation: InvitationPreview;

  try {
    invitation = await getInvitationPreview(token);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;

    const expired = error.status === 410;
    const used = error.status === 409;

    return (
      <Container className="py-16 sm:py-24">
        <div className="mx-auto max-w-xl text-center">
          <span
            className={`inline-flex size-12 items-center justify-center rounded-full ${
              used ? "bg-success/12 text-success" : "bg-warning/15 text-warning-text"
            }`}
          >
            {used ? <ShieldCheck size={24} aria-hidden /> : expired ? <Clock size={24} aria-hidden /> : <MailWarning size={24} aria-hidden />}
          </span>

          <h1 className="mt-6 font-display text-[1.75rem] leading-tight text-ink sm:text-[2rem]">
            {used
              ? "This invitation has already been used"
              : expired
                ? "This link has expired"
                : "This link is not valid"}
          </h1>

          <p className="mt-4 text-[1rem] leading-relaxed text-muted">
            {used
              ? "Your registration is already with us. Sign in to see where the application has got to."
              : expired
                ? "Registration links are deliberately short-lived. Ask your contact at I am Georgia to send a new one — it takes them a moment."
                : "Check that you copied the whole link from the email. If it still does not work, ask your contact at I am Georgia to send a new one."}
          </p>

          {used && (
            <Link
              href={path("/portal")}
              className="mt-8 inline-flex h-12 items-center rounded-sm bg-brand px-6 text-[0.9375rem] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              Sign in
            </Link>
          )}
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-[0.8125rem] font-medium tracking-[0.12em] text-brand-text uppercase">
          Partner registration
        </p>
        <h1 className="mt-3 font-display text-[2rem] leading-tight text-ink sm:text-[2.5rem]">
          {invitation.company?.name
            ? `Register ${invitation.company.name}`
            : "Register your company"}
        </h1>
        <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-muted">
          Tell us about the business, who we should speak to, and where payments
          should go. Your application goes to our partnerships team for review as
          soon as you submit it.
        </p>

        <PartnerRegistrationWizard token={token} invitation={invitation} />
      </div>
    </Container>
  );
}
