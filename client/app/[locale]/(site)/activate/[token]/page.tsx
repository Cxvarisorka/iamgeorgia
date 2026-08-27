import type { Metadata } from "next";
import { Clock, MailWarning, ShieldCheck } from "lucide-react";

import { Container } from "@/components/ui/Container";
import { ActivationForm } from "@/components/partners/ActivationForm";
import { ApiError, serverFetch } from "@/lib/api/client";

export const metadata: Metadata = {
  title: "Activate your account",
  robots: { index: false, follow: false },
};

interface ActivationPreview {
  email: string;
  firstName: string;
  lastName: string;
  companyName: string | null;
  expiresAt: string;
}

/**
 * The landing page for an account-activation link.
 *
 * Used by the flow where an admin creates the partner outright: the record
 * already exists, and all that is missing is a password. Like the invitation
 * page, it asks the server why a link is unusable rather than presenting one
 * error for every kind of failure.
 */
export default async function ActivateAccountPage({
  params,
}: PageProps<"/[locale]/activate/[token]">) {
  const { token } = await params;

  let account: ActivationPreview;

  try {
    account = await serverFetch<ActivationPreview>(`/api/auth/activation/${token}`);
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
            {used ? (
              <ShieldCheck size={24} aria-hidden />
            ) : expired ? (
              <Clock size={24} aria-hidden />
            ) : (
              <MailWarning size={24} aria-hidden />
            )}
          </span>

          <h1 className="mt-6 font-display text-[1.75rem] leading-tight text-ink sm:text-[2rem]">
            {used
              ? "This link has already been used"
              : expired
                ? "This link has expired"
                : "This link is not valid"}
          </h1>

          <p className="mt-4 text-[1rem] leading-relaxed text-muted">
            {used
              ? "Your password is already set. Sign in with it, or reset it if you have forgotten it."
              : expired
                ? "Password links are deliberately short-lived. Ask your contact at I am Georgia to send a new one."
                : "Check that you copied the whole link from the email. If it still does not work, ask your contact at I am Georgia to send a new one."}
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container className="py-16 sm:py-24">
      <div className="mx-auto max-w-md">
        <p className="text-[0.8125rem] font-medium tracking-[0.12em] text-brand-text uppercase">
          Account activation
        </p>
        <h1 className="mt-3 font-display text-[2rem] leading-tight text-ink">
          Welcome, {account.firstName}
        </h1>
        <p className="mt-4 text-[1rem] leading-relaxed text-muted">
          {account.companyName
            ? `An account has been created for you on behalf of ${account.companyName}.`
            : "An account has been created for you."}{" "}
          Choose a password to activate it. You will sign in with{" "}
          <span className="text-ink">{account.email}</span>.
        </p>

        <ActivationForm token={token} />
      </div>
    </Container>
  );
}
