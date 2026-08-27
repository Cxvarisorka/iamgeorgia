import { AdminShell } from "@/components/admin/AdminShell";
import { listPartners } from "@/lib/api/partners";
import { requireAdminSession } from "@/lib/auth/session";
import { countActive } from "@/lib/admin/metrics";

/**
 * The panel shell — sidebar, top bar and working area.
 *
 * This is also where the panel stops being readable to someone who has not
 * signed in as an admin. It is a redirect for the sake of the visitor, not a
 * security boundary: every endpoint behind it re-checks the session and the
 * role, so a viewer who reached this markup some other way would still see an
 * empty page full of 401s.
 *
 * The queue counts are resolved here rather than in the sidebar, so the
 * navigation stays presentational and the numbers come from one place.
 */
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();

  // The counts are decoration on the sidebar and must never take the panel
  // down: an operator who cannot see "3 pending" can still open the queue and
  // count. A failure here is logged and shown as zeros rather than thrown.
  let badges = { pendingBookings: 0, pendingPartners: 0 };

  try {
    // Both counts are requests now that bookings are real records, so they go
    // out together rather than one waiting on the other.
    const [applications, activeBookings] = await Promise.all([
      // The two states waiting on the admin: an application that has been
      // submitted, and one somebody is partway through filling in.
      listPartners({ status: ["PENDING_APPROVAL", "REGISTRATION_IN_PROGRESS"], pageSize: 1 }),
      countActive(),
    ]);

    badges = {
      pendingBookings: activeBookings,
      pendingPartners: applications.total,
    };
  } catch (error) {
    console.error("Admin queue counts failed:", error);
  }

  return (
    <AdminShell badges={badges} user={session.user}>
      {children}
    </AdminShell>
  );
}
