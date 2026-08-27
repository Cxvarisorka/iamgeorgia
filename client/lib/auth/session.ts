import { cache } from "react";
import { redirect } from "next/navigation";

import { serverFetchOptional } from "@/lib/api/client";
import { localePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { ADMIN_ROLES, type Session } from "@/types/auth";

/**
 * Who the viewer is, during a server render.
 *
 * Wrapped in React's `cache` so a layout, a page and a component in the same
 * render share one call to `/api/auth/me` instead of making three. An
 * unauthenticated viewer resolves to null rather than throwing — being signed
 * out is an ordinary state, not an error.
 */
export const getSession = cache(async (): Promise<Session | null> =>
  serverFetchOptional<Session>("/api/auth/me"),
);

/**
 * Guards the admin panel.
 *
 * A convenience for layouts, not a security boundary — every admin endpoint
 * checks the role again on the server. This exists so a signed-out visitor gets
 * a sign-in screen instead of a page full of failed requests.
 */
export async function requireAdminSession(): Promise<Session> {
  const session = await getSession();
  const locale = await getLocale();

  if (!session) {
    redirect(localePath(locale, "/admin/sign-in"));
  }

  if (!ADMIN_ROLES.includes(session.user.role)) {
    // Signed in, but as a partner. Their own portal is where they belong.
    redirect(localePath(locale, "/portal"));
  }

  return session;
}

/** Guards the partner portal, in any partner status. */
export async function requirePartnerSession(): Promise<Session> {
  const session = await getSession();
  const locale = await getLocale();

  if (!session) {
    redirect(localePath(locale, "/portal/sign-in"));
  }

  if (!session.partner) {
    redirect(localePath(locale, ADMIN_ROLES.includes(session.user.role) ? "/admin" : "/"));
  }

  return session;
}
