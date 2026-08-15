import Link from "next/link";
import { FileQuestion } from "lucide-react";

import { AdminContainer } from "@/components/admin/AdminPage";
import { getI18n } from "@/lib/i18n/server";

/**
 * Rendered when a record id in the URL matches nothing — a stale bookmark, a
 * deleted booking, a hand-typed partner id. Kept inside the panel shell so the
 * operator still has the navigation and can carry on working.
 */
export default async function AdminNotFound() {
  const { path } = await getI18n();

  return (
    <AdminContainer>
      <div className="flex flex-col items-center justify-center rounded-sm border border-dashed border-line bg-surface-soft/40 px-6 py-24 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-background text-brand-text">
          <FileQuestion size={24} aria-hidden />
        </span>

        <h1 className="mt-6 font-display text-2xl text-ink">Record not found</h1>
        <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
          Nothing in the register matches that address. It may have been removed, or
          the link may be out of date.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={path("/admin")}
            className="inline-flex h-11 items-center rounded-sm bg-brand px-5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Back to overview
          </Link>
          <Link
            href={path("/admin/bookings")}
            className="inline-flex h-11 items-center rounded-sm border border-ink/20 px-5 text-[0.875rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
          >
            All bookings
          </Link>
        </div>
      </div>
    </AdminContainer>
  );
}
