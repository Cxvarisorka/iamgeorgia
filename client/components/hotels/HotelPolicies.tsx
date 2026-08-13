import { Baby, CreditCard, Dog, LogIn, LogOut, ShieldAlert } from "lucide-react";

import type { HotelPolicies as Policies } from "@/types";

interface HotelPoliciesProps {
  policies: Policies;
}

export function HotelPolicies({ policies }: HotelPoliciesProps) {
  const rows = [
    { icon: LogIn, label: "Check-in", value: policies.checkIn },
    { icon: LogOut, label: "Check-out", value: policies.checkOut },
    { icon: ShieldAlert, label: "Cancellation", value: policies.cancellation },
    { icon: Baby, label: "Children & beds", value: policies.children },
    { icon: Dog, label: "Pets", value: policies.pets },
    { icon: CreditCard, label: "Payment", value: policies.payment },
  ];

  return (
    <div className="border border-line bg-surface">
      <dl className="divide-y divide-line">
        {rows.map((row) => (
          <div key={row.label} className="grid gap-2 p-6 sm:grid-cols-[12rem_1fr] sm:gap-6">
            <dt className="type-body-sm flex items-center gap-2.5 font-medium text-ink">
              <row.icon size={15} className="shrink-0 text-muted" aria-hidden />
              {row.label}
            </dt>
            <dd className="type-body-sm text-body">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="border-t border-line bg-surface-soft/60 p-6">
        <h3 className="type-caption text-muted">House rules</h3>
        <ul className="mt-3 space-y-2">
          {policies.rules.map((rule) => (
            <li key={rule} className="type-body-sm flex gap-3 text-body">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-brand" aria-hidden />
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
