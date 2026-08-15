import Link from "next/link";
import { ArrowRight, CalendarCheck, Clock, Handshake, Wallet } from "lucide-react";

import {
  AdminContainer,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/AdminPage";
import { BookingsChart } from "@/components/admin/BookingsChart";
import { Cell, DataTable, EmptyRow, Row } from "@/components/admin/DataTable";
import { StatCard } from "@/components/admin/StatCard";
import {
  BookingStatusBadge,
  PartnerStatusBadge,
} from "@/components/admin/StatusBadge";
import { productKindLabels } from "@/data/admin/bookings";
import { partnerKindLabels, partnersAwaitingReview } from "@/data/admin/partners";
import { adminUser } from "@/data/admin/user";
import {
  actionQueue,
  activePartnerCount,
  formatAdminDate,
  formatCompactMoney,
  grossBookingValue,
  monthOnMonthChange,
  monthlyTotals,
  pendingPartnerCount,
  recentBookings,
} from "@/lib/admin/metrics";
import { getI18n } from "@/lib/i18n/server";
import { formatPrice } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const { path } = await getI18n();

  const totals = monthlyTotals();
  const thisMonth = totals[totals.length - 1];
  const queue = actionQueue();
  const applications = partnersAwaitingReview().slice(0, 4);
  const recent = recentBookings(6);

  return (
    <AdminContainer>
      <AdminPageHeader
        title={`Good morning, ${adminUser.name.split(" ")[0]}`}
        description="Everything waiting on a decision, and how the month is tracking."
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Bookings this month"
          value={String(thisMonth.total)}
          icon={CalendarCheck}
          change={monthOnMonthChange()}
        />
        <StatCard
          label="Gross booking value"
          value={formatCompactMoney(grossBookingValue())}
          icon={Wallet}
          hint="Across the current ledger, cancellations excluded"
        />
        <StatCard
          label="Bookings to confirm"
          value={String(queue.length)}
          icon={Clock}
          hint={queue.length > 0 ? "Oldest travels first — see the queue below" : "Queue is clear"}
        />
        <StatCard
          label="Partner applications"
          value={String(pendingPartnerCount())}
          icon={Handshake}
          hint={`${activePartnerCount()} partners active`}
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AdminPanel
          title="Bookings by month"
          description="Volume across the last twelve months, split by what was booked."
          className="xl:col-span-2"
        >
          <BookingsChart />
        </AdminPanel>

        <AdminPanel
          title="Needs your decision"
          description={
            queue.length > 0
              ? `${queue.length} bookings are unconfirmed.`
              : "Nothing is waiting."
          }
          action={
            <Link
              href={path("/admin/bookings?status=pending")}
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-brand-text transition-colors hover:text-brand-hover"
            >
              View all
              <ArrowRight size={14} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          }
          bodyClassName="p-0"
        >
          {queue.length > 0 ? (
            <ul className="divide-y divide-line">
              {queue.slice(0, 5).map((booking) => (
                <li key={booking.id}>
                  <Link
                    href={path(`/admin/bookings/${booking.id}`)}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-soft/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.875rem] font-medium text-ink">
                        {booking.customer.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
                        {booking.productName}
                      </span>
                      <span className="mt-1.5 block text-[0.75rem] text-subtle">
                        Travels {formatAdminDate(booking.travelDate)}
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="block text-[0.875rem] font-semibold text-ink tabular-nums">
                        {formatPrice(booking.total)}
                      </span>
                      <span className="mt-1.5 block">
                        <BookingStatusBadge status={booking.status} />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-12 text-center text-[0.875rem] text-muted">
              Every booking is confirmed. Nothing to do here.
            </p>
          )}
        </AdminPanel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <AdminPanel
          title="Recent bookings"
          action={
            <Link
              href={path("/admin/bookings")}
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-brand-text transition-colors hover:text-brand-hover"
            >
              All bookings
              <ArrowRight size={14} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          }
          bodyClassName="p-0"
          className="xl:col-span-2"
        >
          <DataTable
            caption="The six most recently placed bookings"
            columns={[
              { label: "Reference" },
              { label: "Customer" },
              { label: "Product", hideBelow: "md" },
              { label: "Status" },
              { label: "Total", align: "end" },
            ]}
          >
            {recent.length === 0 ? (
              <EmptyRow colSpan={5} message="No bookings yet." />
            ) : (
              recent.map((booking) => (
                <Row key={booking.id}>
                  <Cell>
                    <Link
                      href={path(`/admin/bookings/${booking.id}`)}
                      className="font-medium text-ink tabular-nums underline-offset-4 hover:underline"
                    >
                      {booking.reference}
                    </Link>
                  </Cell>
                  <Cell>
                    <span className="block truncate font-medium text-ink">
                      {booking.customer.name}
                    </span>
                    <span className="block truncate text-[0.75rem] text-muted">
                      {booking.customer.country}
                    </span>
                  </Cell>
                  <Cell hideBelow="md">
                    <span className="block max-w-56 truncate">{booking.productName}</span>
                    <span className="block text-[0.75rem] text-subtle">
                      {productKindLabels[booking.kind]}
                    </span>
                  </Cell>
                  <Cell>
                    <BookingStatusBadge status={booking.status} />
                  </Cell>
                  <Cell align="end" className="font-medium text-ink tabular-nums">
                    {formatPrice(booking.total)}
                  </Cell>
                </Row>
              ))
            )}
          </DataTable>
        </AdminPanel>

        <AdminPanel
          title="Partner applications"
          description="Oldest first — the order they should be worked."
          action={
            <Link
              href={path("/admin/partners")}
              className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-brand-text transition-colors hover:text-brand-hover"
            >
              All partners
              <ArrowRight size={14} className="rtl:-scale-x-100" aria-hidden />
            </Link>
          }
          bodyClassName="p-0"
        >
          {applications.length > 0 ? (
            <ul className="divide-y divide-line">
              {applications.map((partner) => (
                <li key={partner.id}>
                  <Link
                    href={path(`/admin/partners/${partner.id}`)}
                    className="flex items-start justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-surface-soft/60"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[0.875rem] font-medium text-ink">
                        {partner.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[0.75rem] text-muted">
                        {partnerKindLabels[partner.kind]} · {partner.city}
                      </span>
                      <span className="mt-1.5 block text-[0.75rem] text-subtle">
                        Applied {formatAdminDate(partner.appliedOn)}
                      </span>
                    </span>
                    <PartnerStatusBadge status={partner.status} className="shrink-0" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-12 text-center text-[0.875rem] text-muted">
              No applications waiting.
            </p>
          )}
        </AdminPanel>
      </div>
    </AdminContainer>
  );
}
