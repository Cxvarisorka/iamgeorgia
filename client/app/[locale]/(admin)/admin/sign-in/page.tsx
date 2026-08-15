import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SignInForm } from "@/components/admin/SignInForm";
import { Logo } from "@/components/layout/Logo";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default async function AdminSignInPage() {
  const { path } = await getI18n();

  return (
    <div className="flex min-h-svh flex-col bg-ink text-on-dark">
      <div className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <span className="flex items-center gap-3">
            <Logo className="size-9" />
            <span>
              <span className="block font-display text-lg leading-none tracking-[0.06em]">
                I&apos;AM GEORGIA
              </span>
              <span className="mt-1 block text-[0.6875rem] leading-none tracking-[0.16em] text-on-dark/45 uppercase">
                Admin
              </span>
            </span>
          </span>

          <h1 className="type-h2 mt-10 text-on-dark">Sign in</h1>
          <p className="type-body-sm mt-3 text-on-dark/60">
            The back office for bookings, inventory and partners.
          </p>

          <SignInForm />

          <Link
            href={path("/")}
            className="mt-10 inline-flex items-center gap-2 text-[0.8125rem] text-on-dark/50 transition-colors hover:text-on-dark"
          >
            <ArrowLeft size={15} className="rtl:-scale-x-100" aria-hidden />
            Back to the public site
          </Link>
        </div>
      </div>
    </div>
  );
}
