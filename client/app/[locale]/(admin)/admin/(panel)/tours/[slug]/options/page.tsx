import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AdminBreadcrumbs, AdminContainer, AdminPageHeader } from "@/components/admin/AdminPage";
import { TourOptionsManager } from "@/components/admin/TourOptionsManager";
import { getTour, listTourCancellationPolicies } from "@/lib/api/tours";
import { ApiError } from "@/lib/api/client";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Options & prices" };

/**
 * Options and their price sheets, for one tour.
 *
 * The admin detail carries every option with its seasons and tiers in one
 * request; the cancellation templates ride alongside so the option form can
 * always offer terms, even on an empty tour.
 */
export default async function TourOptionsPage({ params }: PageProps<"/[locale]/admin/tours/[slug]/options">) {
  const { slug } = await params;
  const { path } = await getI18n();

  let tour;

  try {
    tour = await getTour(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const policies = await listTourCancellationPolicies();

  return (
    <AdminContainer>
      <AdminBreadcrumbs
        items={[
          { label: "Tours", href: path("/admin/tours") },
          { label: tour.title, href: path(`/admin/tours/${tour.id}`) },
          { label: "Options & prices" },
        ]}
      />
      <AdminPageHeader
        title="Options & prices"
        description="What the tour is sold as — a shared seat, a private car — and what each costs by season and party size. Selling prices are derived from the buyer's markup unless a tier fixes one."
      />

      <div className="mt-8">
        <TourOptionsManager tour={tour} policies={policies.data} />
      </div>
    </AdminContainer>
  );
}
