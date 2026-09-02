import type { Metadata } from "next";

import { AssignmentCard } from "@/components/driver/AssignmentCard";
import { listDriverAssignments } from "@/lib/api/driverPanel";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "History" };

export default async function DriverHistoryPage() {
  const [{ locale }, result] = await Promise.all([getI18n(), listDriverAssignments({ scope: "history", pageSize: 100 })]);

  return (
    <section aria-labelledby="driver-history">
      <h1 id="driver-history" className="text-[1.125rem] font-semibold text-ink">
        History
      </h1>
      {result.data.length === 0 ? (
        <p className="mt-3 rounded-sm border border-dashed border-line p-6 text-center text-[0.9375rem] text-muted">
          No past jobs yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {result.data.map((assignment) => (
            <li key={assignment.id}>
              <AssignmentCard assignment={assignment} locale={locale} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
