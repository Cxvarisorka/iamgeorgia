import Link from "next/link";

import { getI18n } from "@/lib/i18n/server";

export default async function DriverNotFound() {
  const { path } = await getI18n();

  return (
    <div className="rounded-sm border border-line bg-surface p-6 text-center">
      <h1 className="text-[1.125rem] font-semibold text-ink">That job is not yours to see</h1>
      <p className="mt-2 text-[0.9375rem] text-muted">It may have been reassigned, or the link is wrong.</p>
      <Link href={path("/driver")} className="mt-4 inline-block text-brand-text underline-offset-4 hover:underline">
        Back to today
      </Link>
    </div>
  );
}
