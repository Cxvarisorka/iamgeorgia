"use client";

import {
  CheckboxField,
  LineListInput,
  NumberInput,
  SelectInput,
  TextArea,
  TextInput,
} from "./FormControls";
import { flattenTree, indent } from "@/lib/admin/destinations";
import {
  confirmationModeLabels,
  serviceBasisHints,
  serviceBasisOptions,
  serviceCategoryOptions,
  serviceUnits,
} from "@/lib/admin/services";
import { timezoneOptions } from "@/lib/admin/geography";
import { formatMoney, toMajorUnits, toMinorUnits } from "@/lib/money";
import type { ServiceInput } from "@/lib/api/services";
import type { CancellationPolicy, DestinationNode } from "@/types/catalogue";
import type { PartnerSummary } from "@/types/partner";
import type { ConfirmationMode } from "@/types/tour";
import type { Service, ServiceBasis, ServiceCategory } from "@/types/service";

/**
 * The fields a service has, shared by the create form and the editor.
 *
 * Both screens ask for the same twenty things and differ only in the endpoint
 * they send them to, so the fields live here — the alternative is a service
 * growing a field you can set on the way in and never change afterwards.
 *
 * Grouped by the question each group answers, and the order is the order the
 * answers arrive in:
 *
 * **What it is** places the service and names it. **What a unit is** is the
 * group that gets a service mispriced, and carries the most explanation on the
 * screen for it. **How it is booked** is everything the booking path reads:
 * notice, quantity limits, who confirms, and the terms a cancellation is
 * settled under. **Kosher** and **the words** are last because getting them
 * wrong is embarrassing rather than expensive.
 */

/** Every field as the inputs hold it: money in major units, numbers as text. */
export interface ServiceValues {
  name: string;
  slug: string;
  category: ServiceCategory;
  destinationId: string;
  supplierId: string;
  basis: ServiceBasis;
  net: string;
  /** Blank means no fixed sell — the partner's markup decides the price. */
  sell: string;
  currency: string;
  timezone: string;
  cancellationPolicyId: string;
  confirmationMode: ConfirmationMode;
  noticeHours: string;
  minQuantity: string;
  maxQuantity: string;
  isKosher: boolean;
  kosherAuthority: string;
  summary: string;
  /** Paragraphs, a blank line apart, exactly as the tour editor holds them. */
  description: string;
  included: string[];
  b2cEnabled: boolean;
  sortOrder: string;
}

export const emptyServiceValues = (): ServiceValues => ({
  name: "",
  slug: "",
  category: "KOSHER_MEAL_DELIVERY",
  destinationId: "",
  supplierId: "",
  basis: "PER_PERSON",
  net: "",
  sell: "",
  currency: "GEL",
  timezone: "Asia/Tbilisi",
  cancellationPolicyId: "",
  confirmationMode: "INSTANT",
  noticeHours: "48",
  minQuantity: "1",
  maxQuantity: "",
  isKosher: false,
  kosherAuthority: "",
  summary: "",
  description: "",
  included: [],
  // Trade-only by default, exactly as hotels and vehicle classes are. Opening
  // a service to the public is a decision somebody makes, not one they forget
  // to undo.
  b2cEnabled: false,
  sortOrder: "0",
});

export const serviceValuesFrom = (service: Service): ServiceValues => ({
  name: service.name,
  slug: service.slug,
  category: service.category,
  destinationId: service.destination?.id ?? "",
  supplierId: service.supplierId ?? "",
  basis: service.basis,
  // `netCents` and `sellCents` are staff-only fields on the serialiser. This
  // screen is admin-only, so they are always present; the fallbacks are here
  // because the type cannot know that.
  net: toMajorUnits(service.netCents ?? 0, service.currency),
  sell: toMajorUnits(service.sellCents, service.currency),
  currency: service.currency,
  timezone: service.timezone,
  cancellationPolicyId: service.cancellation?.id ?? "",
  confirmationMode: service.confirmationMode,
  noticeHours: String(service.noticeHours),
  minQuantity: String(service.minQuantity),
  maxQuantity: service.maxQuantity === null ? "" : String(service.maxQuantity),
  isKosher: service.isKosher,
  kosherAuthority: service.kosherAuthority ?? "",
  summary: service.summary ?? "",
  description: service.description.join("\n\n"),
  included: service.included,
  b2cEnabled: service.b2cEnabled ?? false,
  sortOrder: String(service.sortOrder ?? 0),
});

/**
 * The rules worth checking before the server does.
 *
 * Each of these would come back as a zod issue on a field the operator can see,
 * but a fixed sell below the net is not one of them: the server takes it
 * happily, and the service then sells at a loss on every booking until somebody
 * notices. It is refused here because here is the only place it is refused.
 */
export const serviceValuesError = (values: ServiceValues): string | null => {
  const net = toMinorUnits(values.net, values.currency);

  if (net === null) return "Give the supplier's net price.";
  if (net < 0) return "The net price cannot be negative.";

  if (values.sell.trim() !== "") {
    const sell = toMinorUnits(values.sell, values.currency);

    if (sell === null) return "The fixed sell price is not a number.";
    if (sell < net) return "A fixed sell price below the net sells the service at a loss.";
  }

  const min = Number(values.minQuantity);
  const max = values.maxQuantity.trim() === "" ? null : Number(values.maxQuantity);

  if (max !== null && max < min) return "The largest quantity must be at least the smallest.";

  return null;
};

export const serviceValuesToBody = (values: ServiceValues): ServiceInput => ({
  slug: values.slug.trim(),
  name: values.name.trim(),
  category: values.category,
  basis: values.basis,
  netCents: toMinorUnits(values.net, values.currency) ?? 0,
  // Null, not undefined: a fixed sell that has been cleared has to be removed
  // on the server, and an absent key in a PATCH leaves the old one standing.
  sellCents: values.sell.trim() === "" ? null : toMinorUnits(values.sell, values.currency),
  currency: values.currency,
  timezone: values.timezone,
  destinationId: values.destinationId || null,
  supplierId: values.supplierId || null,
  cancellationPolicyId: values.cancellationPolicyId,
  noticeHours: Number(values.noticeHours) || 0,
  minQuantity: Number(values.minQuantity) || 1,
  maxQuantity: values.maxQuantity.trim() === "" ? null : Number(values.maxQuantity),
  confirmationMode: values.confirmationMode,
  isKosher: values.isKosher,
  kosherAuthority: values.isKosher ? values.kosherAuthority.trim() || null : null,
  summary: values.summary.trim(),
  description: values.description
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean),
  included: values.included,
  b2cEnabled: values.b2cEnabled,
  sortOrder: Number(values.sortOrder) || 0,
});

/**
 * The basis, worked through on a party of four over three days.
 *
 * A sentence rather than a table: the operator has just typed a price and the
 * only question they need answering is what the platform will multiply it by.
 * The example party is fixed so that changing the basis changes one number and
 * nothing else.
 */
function BasisExplainer({ values }: { values: ServiceValues }) {
  const units = serviceUnits(values.basis, 4, 3);
  const unitCents = toMinorUnits(values.net, values.currency);

  return (
    <p className="mt-4 rounded-sm bg-surface-soft/60 px-4 py-3 text-[0.8125rem] leading-relaxed text-body">
      {serviceBasisHints[values.basis]}{" "}
      <span className="text-muted">
        Four travellers over three days buy {units} {units === 1 ? "unit" : "units"}
        {unitCents !== null && unitCents > 0 && (
          <>
            {" "}
            — {formatMoney(unitCents * units, values.currency)} at the net price above
          </>
        )}
        .
      </span>
    </p>
  );
}

export function ServiceFields({
  values,
  onChange,
  destinations,
  suppliers,
  policies,
  fieldErrors = {},
}: {
  values: ServiceValues;
  onChange: <K extends keyof ServiceValues>(key: K, value: ServiceValues[K]) => void;
  destinations: DestinationNode[];
  suppliers: PartnerSummary[];
  /** Platform cancellation templates, shared with tours. */
  policies: CancellationPolicy[];
  fieldErrors?: Record<string, string>;
}) {
  const places = flattenTree(destinations);

  return (
    <>
      <fieldset>
        <legend className="sr-only">What this service is</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">What this service is</p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextInput
            id="service-name"
            label="Name"
            required
            value={values.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="Shabbat dinner, delivered"
            error={fieldErrors.name}
          />

          <TextInput
            id="service-slug"
            label="Slug"
            required
            mono
            value={values.slug}
            onChange={(event) => onChange("slug", event.target.value)}
            error={fieldErrors.slug}
            hint="Lowercase letters, numbers and single hyphens. Derived from the name until you edit it."
          />

          <SelectInput
            id="service-category"
            label="Category"
            value={values.category}
            onChange={(event) => onChange("category", event.target.value as ServiceCategory)}
            options={serviceCategoryOptions}
            error={fieldErrors.category}
          />

          <SelectInput
            id="service-destination"
            label="Destination"
            value={values.destinationId}
            onChange={(event) => onChange("destinationId", event.target.value)}
            options={[
              { value: "", label: "Anywhere" },
              ...places.map((place) => ({
                value: place.id,
                label: `${indent(place.depth)}${place.name}`,
              })),
            ]}
            error={fieldErrors.destinationId}
            hint="Where it can be delivered. Leave it open for something that travels with the party."
          />

          <SelectInput
            id="service-supplier"
            label="Supplier"
            value={values.supplierId}
            onChange={(event) => onChange("supplierId", event.target.value)}
            options={[
              { value: "", label: "Platform-operated" },
              ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
            ]}
            error={fieldErrors.supplierId}
            hint="Whoever provides it, and therefore whoever sees the net price."
          />

          <TextArea
            className="sm:col-span-2"
            id="service-summary"
            label="Summary"
            required
            rows={2}
            value={values.summary}
            onChange={(event) => onChange("summary", event.target.value)}
            error={fieldErrors.summary}
            hint="One line, shown wherever the service appears inside a package."
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">What a unit is, and what it costs</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">What a unit is, and what it costs</p>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          Both prices are for <strong>one unit</strong>, and the basis decides what a unit is.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <SelectInput
            className="sm:col-span-2"
            id="service-basis"
            label="Priced"
            value={values.basis}
            onChange={(event) => onChange("basis", event.target.value as ServiceBasis)}
            options={serviceBasisOptions}
            error={fieldErrors.basis}
          />
        </div>

        <BasisExplainer values={values} />

        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <NumberInput
            id="service-net"
            label={`Net per unit (${values.currency})`}
            required
            min={0}
            step="0.01"
            value={values.net}
            onChange={(event) => onChange("net", event.target.value)}
            error={fieldErrors.netCents}
            hint="What the supplier charges us."
          />

          <NumberInput
            id="service-sell"
            label={`Fixed sell per unit (${values.currency})`}
            min={0}
            step="0.01"
            value={values.sell}
            onChange={(event) => onChange("sell", event.target.value)}
            error={fieldErrors.sellCents}
            hint="Overrides the partner's markup for everybody. Leave it empty to let each partner's own rate decide."
          />

          <TextInput
            id="service-currency"
            label="Currency"
            mono
            maxLength={3}
            value={values.currency}
            onChange={(event) => onChange("currency", event.target.value.toUpperCase())}
            error={fieldErrors.currency}
            hint="Three letters, e.g. GEL."
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">How it is booked</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">How it is booked</p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <SelectInput
            id="service-confirmation"
            label="Confirmation"
            value={values.confirmationMode}
            onChange={(event) =>
              onChange("confirmationMode", event.target.value as ConfirmationMode)
            }
            options={(["INSTANT", "ON_REQUEST"] as ConfirmationMode[]).map((value) => ({
              value,
              label: confirmationModeLabels[value],
            }))}
            error={fieldErrors.confirmationMode}
            hint={
              values.confirmationMode === "ON_REQUEST"
                ? "The booking is written PENDING and somebody has 48 hours to answer it."
                : "Confirmed the moment it is booked. Nobody is asked."
            }
          />

          <NumberInput
            id="service-notice"
            label="Notice (hours)"
            min={0}
            max={1440}
            step={1}
            value={values.noticeHours}
            onChange={(event) => onChange("noticeHours", event.target.value)}
            error={fieldErrors.noticeHours}
            hint="How far ahead it has to be booked."
          />

          <NumberInput
            id="service-min-quantity"
            label="Smallest quantity"
            min={1}
            max={500}
            step={1}
            value={values.minQuantity}
            onChange={(event) => onChange("minQuantity", event.target.value)}
            error={fieldErrors.minQuantity}
          />

          <NumberInput
            id="service-max-quantity"
            label="Largest quantity"
            min={1}
            max={500}
            step={1}
            value={values.maxQuantity}
            onChange={(event) => onChange("maxQuantity", event.target.value)}
            error={fieldErrors.maxQuantity}
            hint="Leave it empty for no ceiling."
          />

          <SelectInput
            className="sm:col-span-2"
            id="service-policy"
            label="Cancellation terms"
            required
            value={values.cancellationPolicyId}
            onChange={(event) => onChange("cancellationPolicyId", event.target.value)}
            placeholder="Choose…"
            options={policies.map((policy) => ({ value: policy.id, label: policy.name }))}
            error={fieldErrors.cancellationPolicyId}
            hint="Platform templates, the same pool the tours use. A service cannot be created without one."
          />

          <SelectInput
            id="service-timezone"
            label="Time zone"
            value={values.timezone}
            onChange={(event) => onChange("timezone", event.target.value)}
            options={timezoneOptions.map((zone) => ({ value: zone, label: zone }))}
            error={fieldErrors.timezone}
            hint="The clock the notice period and the request deadline are read against."
          />

          <NumberInput
            id="service-sort"
            label="Position"
            min={0}
            max={9999}
            step={1}
            value={values.sortOrder}
            onChange={(event) => onChange("sortOrder", event.target.value)}
            error={fieldErrors.sortOrder}
            hint="Lower shows first in a package builder's list."
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">Kosher supervision</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">Kosher supervision</p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <CheckboxField
            className="sm:col-span-2"
            label="Under kosher supervision"
            hint="Filterable, and shown to the traveller. Only tick it where there is an authority to name."
            checked={values.isKosher}
            onChange={(next) => onChange("isKosher", next)}
          />

          <TextInput
            className="sm:col-span-2"
            id="service-authority"
            label="Certifying authority"
            value={values.kosherAuthority}
            disabled={!values.isKosher}
            onChange={(event) => onChange("kosherAuthority", event.target.value)}
            placeholder="Chief Rabbinate of Georgia"
            error={fieldErrors.kosherAuthority}
            hint="Who supervises it. Cleared when the box above is unticked, so a lapsed certification cannot be left standing."
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">The words</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">The words</p>

        <div className="mt-4 grid gap-5">
          <TextArea
            id="service-description"
            label="Description"
            rows={6}
            value={values.description}
            onChange={(event) => onChange("description", event.target.value)}
            error={fieldErrors.description}
            hint="A blank line starts a new paragraph."
          />

          <LineListInput
            label="Included"
            value={values.included}
            onChange={(next) => onChange("included", next)}
            rows={5}
            error={fieldErrors.included}
            hint="One entry per line — what the price covers."
          />

          <CheckboxField
            label="Sell to the public (B2C)"
            hint="Off means partners only. Services travel inside packages either way; this decides whether a package containing one can be sold on the public site."
            checked={values.b2cEnabled}
            onChange={(next) => onChange("b2cEnabled", next)}
          />
        </div>
      </fieldset>
    </>
  );
}
