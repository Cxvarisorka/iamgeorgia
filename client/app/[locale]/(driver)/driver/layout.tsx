import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Driver panel",
    template: "%s — I am Georgia Drivers",
  },
  robots: { index: false, follow: false },
};

/**
 * The driver panel. The sign-in page sits here, outside the authenticated
 * shell; everything else lives under `(panel)`, which checks the session.
 */
export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
