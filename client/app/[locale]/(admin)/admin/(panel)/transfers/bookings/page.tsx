import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, CarFront, Coins } from "lucide-react";

import { AdminContainer, AdminPageHeader } from "@/components/admin/AdminPage";
import { Cell, DataTable, EmptyRow, Row } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import { listAdminTransferBookings } from "@/lib/api/transfers";
import { getI18n } from "@/lib/i18n/server";
import { formatMoney, formatMoneyCompact } from "@/lib/money";

export const metadata: Metadata = { title: "Transfer bookings" };

const statusTone: Record<string, string> = {
  CONFIRMED: "border-success/40 bg-success/10 text-success",
  PENDING: "border-warning/40 bg-warning/10 text-warning-text",
  CANCELLED: "border-line bg-surface-soft text-muted",
  COMPLETED: "border-line bg-surface-soft text-muted",
  NO_SHOW: "border-error/40 bg-error/10 text-error-text",
};

/**
 * Transfer bookings.
 *
 * A separate register from the hotel one rather than a filter on it. The two
 * share no identifier space — a TRF reference is not a BKG one — and a single
 * list that had to work out which kind of thing each row was would be a worse
 * list than two that each know.
 *
 * Ordered by pick-up rather than by when it was booked: what an operator needs
 * from this screen is which cars go out next.
 */
export default async function AdminTransferBookingsPage({
  searchParams,
}: PageProps<"/[locale]/admin/transfers/bookings">) {
  const params = await searchParams;
  const { path } = await getI18n();

  const page = Number.parseInt(
    (Array.isArray(params.page) ? params.page[0] : params.page) ?? "1",
    10,
  );

  const [list, confirmed] = await Promise.all([
    listAdminTransferBookings({ page: Number.isFinite(page) && page > 0 ? page : 1, pageSize: 25 }),
    listAdminTransferBookings({ status: "CONFIRMED", pageSize: 100 }),
  ]);

  const revenue = confirmed.data.reduce((sum, booking) => sum + booking.totalCents, 0);
  const currency = confirmed.data[0]?.currency ?? "GEL";

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Transfer bookings"
        description="Every journey sold, soonest pick-up first."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Bookings" value={String(list.total)} icon={CalendarCheck} />
        <StatCard label="Confirmed" value={String(confirmed.total)} icon={CarFront} />
        <StatCard
          label="Confirmed value"
          value={formatMoneyCompact(revenue, currency)}
          icon={Coins}
          hint="Across the most recent 100"
        />
      </div>

      <div className="mt-10 rounded-sm border border-line bg-surface">
        <DataTable
          caption="Transfer bookings"
          columns={[
            { label: "Reference" },
            { label: "Passenger" },
            { label: "Journey", hideBelow: "lg" },
            { label: "Pick-up", hideBelow: "md" },
            { label: "Status" },
            { label: "Total", align: "end" },
          ]}
        >
          {list.data.length === 0 ? (
            <EmptyRow colSpan={6} message="No transfer bookings yet." />
          ) : (
            list.data.map((booking) => (
              <Row key={booking.reference}>
                <Cell>
                  <Link
                    href={path(`/admin/transfers/bookings/${booking.reference}`)}
                    className="font-medium text-ink tabular-nums underline-offset-4 hover:underline"
                  >
                    {booking.reference}
                  </Link>
                </Cell>
                <Cell>
                  <span className="text-ink">{booking.leadPassengerName}</span>
                  <span className="type-caption mt-0.5 block break-all text-subtle">
                    {booking.leadPassengerEmail}
                  </span>
                </Cell>
                <Cell hideBelow="lg">
                  {booking.from} → {booking.to}
                  <span className="type-caption mt-0.5 block text-subtle">
                    {booking.vehicleName}
                    {booking.tripType === "RETURN" ? " · return" : ""}
                  </span>
                </Cell>
                <Cell hideBelow="md" className="tabular-nums">
                  {new Date(booking.pickupAt).toISOString().slice(0, 16).replace("T", " ")}
                </Cell>
                <Cell>
                  <span
                    className={`inline-flex items-center rounded-sm border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase ${
                      statusTone[booking.status] ?? statusTone.PENDING
                    }`}
                  >
                    {booking.status.toLowerCase().replace("_", " ")}
                  </span>
                </Cell>
                <Cell align="end" className="tabular-nums">
                  {formatMoney(booking.totalCents, booking.currency)}
                </Cell>
              </Row>
            ))
          )}
        </DataTable>
      </div>

      {list.totalPages > 1 && (
        <p className="mt-5 text-[0.8125rem] text-muted tabular-nums">
          Page {list.page} of {list.totalPages} · {list.total} bookings
        </p>
      )}
    </AdminContainer>
  );
}
