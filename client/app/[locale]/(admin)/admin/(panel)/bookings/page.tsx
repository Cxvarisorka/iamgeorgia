import type { Metadata } from "next";
import { Download, Plus } from "lucide-react";

import { AdminContainer, AdminPageHeader } from "@/components/admin/AdminPage";
import { BookingsBrowser } from "@/components/admin/BookingsBrowser";
import { bookings } from "@/data/admin/bookings";
import type { BookingStatus } from "@/types";

export const metadata: Metadata = { title: "Bookings" };

const validStatuses: BookingStatus[] = ["pending", "confirmed", "completed", "cancelled"];

export default async function AdminBookingsPage(
  props: PageProps<"/[locale]/admin/bookings">,
) {
  const searchParams = await props.searchParams;
  const raw = typeof searchParams.status === "string" ? searchParams.status : "";
  const initialStatus = validStatuses.includes(raw as BookingStatus)
    ? (raw as BookingStatus)
    : "all";

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Bookings"
        description="Every reservation across hotels, tours and transfers."
        actions={
          <>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-sm border border-ink/20 px-4 text-[0.8125rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
            >
              <Download size={15} aria-hidden />
              Export
            </button>
            <button
              type="button"
              className="inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-hover"
            >
              <Plus size={15} aria-hidden />
              New booking
            </button>
          </>
        }
      />

      <BookingsBrowser bookings={bookings} initialStatus={initialStatus} />
    </AdminContainer>
  );
}
