import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s — I'am Georgia Admin",
  },
  // An internal tool has no business in an index.
  robots: { index: false, follow: false },
};

/**
 * Everything under `/admin` shares this metadata but not its chrome: the panel
 * shell lives one level down in `(panel)/layout.tsx`, so the sign-in screen —
 * which must not show a navigation sidebar to someone who has not signed in —
 * can sit alongside it without the shell having to special-case a route.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
