import type { Metadata } from "next";
import Link from "next/link";

import { AssignmentCard } from "@/components/driver/AssignmentCard";
import { listDriverAssignments, listDriverNotifications } from "@/lib/api/driverPanel";
import { Bell } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Today" };

/**
 * Today: offers waiting for an answer first, then the day's jobs in order.
 */
export default async function DriverTodayPage() {
  const [{ locale, path }, today, upcoming, notices] = await Promise.all([
    getI18n(),
    listDriverAssignments({ scope: "today", pageSize: 50 }),
    listDriverAssignments({ scope: "upcoming", pageSize: 50 }),
    listDriverNotifications({ unread: "true", pageSize: 1 }),
  ]);

  const offers = upcoming.data.filter((assignment) => assignment.status === "OFFERED");
  const todays = today.data.filter((assignment) => assignment.status === "ACCEPTED");

  return (
    <div className="space-y-8">
      {notices.unreadCount > 0 && (
        <Link
          href={path("/driver/notifications")}
          className="flex items-center gap-3 rounded-sm border border-brand bg-brand-soft px-4 py-3 text-[0.9375rem] text-ink"
        >
          <Bell size={18} className="text-brand-text" aria-hidden />
          {notices.unreadCount === 1 ? "1 new notification" : `${notices.unreadCount} new notifications`}
        </Link>
      )}

      {offers.length > 0 && (
        <section aria-labelledby="driver-offers">
          <h1 id="driver-offers" className="text-[1.125rem] font-semibold text-ink">
            Waiting for your answer
          </h1>
          <ul className="mt-3 space-y-3">
            {offers.map((assignment) => (
              <li key={assignment.id}>
                <AssignmentCard assignment={assignment} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="driver-today">
        <h2 id="driver-today" className="text-[1.125rem] font-semibold text-ink">
          Today
        </h2>
        {todays.length === 0 ? (
          <p className="mt-3 rounded-sm border border-dashed border-line p-6 text-center text-[0.9375rem] text-muted">
            No jobs today.{" "}
            <Link href={path("/driver/upcoming")} className="text-brand-text underline-offset-4 hover:underline">
              See what is coming up
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {todays.map((assignment) => (
              <li key={assignment.id}>
                <AssignmentCard assignment={assignment} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
