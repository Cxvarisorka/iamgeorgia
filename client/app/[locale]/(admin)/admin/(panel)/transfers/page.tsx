import { redirect } from "next/navigation";

import { getI18n } from "@/lib/i18n/server";

/**
 * There is no Transfers landing screen, on purpose.
 *
 * Routes and the fleet are unrelated jobs and both have their own nav entry, so
 * a hub here would be a page whose only content is two links. This exists only
 * to catch a hand-typed or bookmarked `/admin/transfers`.
 */
export default async function AdminTransfersIndex() {
  const { path } = await getI18n();

  redirect(path("/admin/transfers/routes"));
}
