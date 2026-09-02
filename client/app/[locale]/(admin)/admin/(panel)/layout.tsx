import { AdminShell } from "@/components/admin/AdminShell";
import { listPartners } from "@/lib/api/partners";
import { requireAdminSession } from "@/lib/auth/session";
import { countActive } from "@/lib/admin/metrics";
import { listDispatchLegs } from "@/lib/api/dispatch";
import { defaultWindow } from "@/lib/admin/dispatch";
import { isAdmin } from "@/types/auth";

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
  let badges = { pendingBookings: 0, pendingPartners: 0, unassignedLegs: 0 };

  try {
    // The counts go out together rather than one waiting on the other. A
    // dispatcher cannot read the partner queue or the hotel bookings, so
    // those two are not even asked for on their behalf.
    const admin = isAdmin(session);
    const window = defaultWindow(30);

    const [applications, activeBookings, unassigned] = await Promise.all([
      // The two states waiting on the admin: an application that has been
      // submitted, and one somebody is partway through filling in.
      admin ? listPartners({ status: ["PENDING_APPROVAL", "REGISTRATION_IN_PROGRESS"], pageSize: 1 }) : null,
      admin ? countActive() : 0,
      listDispatchLegs({ from: window.from, to: window.to, legStatus: "UNASSIGNED", pageSize: 1 }),
    ]);

    badges = {
      pendingBookings: activeBookings,
      pendingPartners: applications?.total ?? 0,
      unassignedLegs: unassigned.total,
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
