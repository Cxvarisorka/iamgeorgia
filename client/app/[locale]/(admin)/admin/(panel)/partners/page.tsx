import type { Metadata } from "next";
import Link from "next/link";
import { UserPlus } from "lucide-react";

import { AdminContainer, AdminPageHeader } from "@/components/admin/AdminPage";
import { PartnersBrowser } from "@/components/admin/PartnersBrowser";
import { StatCard } from "@/components/admin/StatCard";
import { Handshake, FileWarning, Wallet } from "lucide-react";
import { partners } from "@/data/admin/partners";
import { activePartnerCount, formatCompactMoney, pendingPartnerCount } from "@/lib/admin/metrics";
import { getI18n } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Partners" };

export default async function AdminPartnersPage() {
  const { path } = await getI18n();

  const outstandingDocs = partners.filter((partner) =>
    partner.documents.some((doc) => !doc.received),
  ).length;

  const partnerRevenue = partners.reduce((sum, partner) => sum + partner.revenue, 0);

  return (
    <AdminContainer>
      <AdminPageHeader
        title="Partners"
        description="Hotels, operators and transport companies that supply what we sell."
        actions={
          <Link
            href={path("/admin/partners/new")}
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            <UserPlus size={15} aria-hidden />
            Register a partner
          </Link>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active partners"
          value={String(activePartnerCount())}
          icon={Handshake}
          hint="Currently supplying live listings"
        />
        <StatCard
          label="Awaiting review"
          value={String(pendingPartnerCount())}
          icon={UserPlus}
          hint="Applications in the queue"
        />
        <StatCard
          label="Paperwork outstanding"
          value={String(outstandingDocs)}
          icon={FileWarning}
          hint="Partners missing at least one document"
        />
        <StatCard
          label="Partner revenue"
          value={formatCompactMoney(partnerRevenue)}
          icon={Wallet}
          hint="Lifetime gross booking value"
        />
      </div>

      <PartnersBrowser partners={partners} />
    </AdminContainer>
  );
}
