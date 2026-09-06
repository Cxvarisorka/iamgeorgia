import { notFound } from "next/navigation";
import type { Metadata } from "next";

import {
  AdminBreadcrumbs,
  AdminContainer,
  AdminPageHeader,
  AdminPanel,
} from "@/components/admin/AdminPage";
import { PackageComponentsBuilder } from "@/components/admin/PackageComponentsBuilder";
import { ApiError } from "@/lib/api/client";
import { getPackage } from "@/lib/api/packages";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Package parts" };

/**
 * The slots a package is assembled from.
 *
 * Ids are typed rather than picked from a dropdown. That is a deliberate
 * limitation for this release and not an oversight: a picker for each of the
 * four product types is four searchable lists, and the quote preview one
 * screen over tells an operator immediately whether an id resolves — which is
 * the same feedback a picker would give, one click later.
 */
export default async function AdminPackageComponentsPage({
  params,
}: PageProps<"/[locale]/admin/packages/[slug]/components">) {
  const { slug } = await params;
  const { path } = await getI18n();

  let pkg;

  try {
    pkg = await getPackage(slug);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  return (
    <AdminContainer>
      <AdminBreadcrumbs
        items={[
          { label: "Packages", href: path("/admin/packages") },
          { label: pkg.name, href: path(`/admin/packages/${pkg.id}`) },
          { label: "Parts" },
        ]}
      />

      <AdminPageHeader
        title="Parts"
        description={`The ${pkg.nights}-night trip, slot by slot. Each slot is filled at quote time by the product's own engine, within the bounds set here.`}
      />

      <div className="mt-8">
        <AdminPanel
          title="Slots"
          description="Saved whole: the set is replaced and re-validated together, because a slot is only correct relative to its neighbours."
        >
          <PackageComponentsBuilder pkg={pkg} />
        </AdminPanel>
      </div>
    </AdminContainer>
  );
}
