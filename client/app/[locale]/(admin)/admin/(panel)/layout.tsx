import { AdminShell } from "@/components/admin/AdminShell";
import { countByStatus, pendingPartnerCount } from "@/lib/admin/metrics";

/**
 * The panel shell — sidebar, top bar and working area.
 *
 * The queue counts are resolved here rather than inside the sidebar, so the
 * navigation stays presentational and the numbers come from one place.
 * Swapping the mock arrays for a real query later touches only this file.
 */
export default function PanelLayout({ children }: { children: React.ReactNode }) {
  const badges = {
    pendingBookings: countByStatus("pending"),
    pendingPartners: pendingPartnerCount(),
  };

  return <AdminShell badges={badges}>{children}</AdminShell>;
}
