import { DriverShell } from "@/components/driver/DriverShell";
import { requireDriverSession } from "@/lib/auth/session";

/**
 * Everything a signed-in driver sees.
 *
 * A DRIVER account whose profile has not been linked yet gets an explanation
 * rather than a redirect loop: the fix is on the operations side, and the
 * driver can do nothing but wait for it.
 */
export default async function DriverPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireDriverSession();

  return (
    <DriverShell session={session}>
      {session.driver ? (
        children
      ) : (
        <div className="rounded-sm border border-warning/40 bg-warning/5 p-5">
          <h1 className="text-[1.0625rem] font-semibold text-ink">Your account is not linked to a driver profile yet</h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-body">
            Operations will connect your login to your profile. Until then there is nothing to show
            here — please contact dispatch if this takes longer than expected.
          </p>
        </div>
      )}
    </DriverShell>
  );
}
