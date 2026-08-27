"use client";

import {
  CheckboxField,
  Field,
  LineListInput,
  NumberInput,
  TextArea,
  TextInput,
} from "./FormControls";
import { featureOptions } from "@/lib/admin/transfers";
import { toMajorUnits, toMinorUnits } from "@/lib/money";
import type { TransferFeature, TransferVehicle } from "@/types/transfer";
import type { TransferVehicleInput } from "@/lib/api/transfers";

/**
 * The fields a vehicle class has, shared by the create form and the editor.
 *
 * The two screens ask for the same twenty things and differ only in what they
 * do with them, so the fields live here and the endpoints live at the call
 * sites. The alternative — a create form and an edit form maintained
 * separately — is how a class ends up with a field you can set on the way in
 * and never change afterwards.
 *
 * Grouped by how the fields *fail*, which is not the same as how they read:
 *
 * **Capacity** is a hard constraint on search. A class is offered only when it
 * can carry the whole party, so a wrong seat count does not misprice a
 * journey — it removes the class from results, or offers a car that cannot
 * take everybody.
 *
 * **The fallback fare** applies only where a route carries no curated price.
 * Everything in the catalogue is priced, so these numbers are the safety net
 * rather than the price list, and the panel says so rather than letting an
 * operator assume they are what customers pay.
 *
 * **The copy** is what the public card renders. Getting it wrong is
 * embarrassing rather than expensive, which is why it sits last.
 */

/** Every field as the inputs hold it: money in major units, numbers as text. */
export interface VehicleValues {
  name: string;
  vehicleExample: string;
  summary: string;
  maxPassengers: string;
  maxLuggage: string;
  maxCabinBags: string;
  features: TransferFeature[];
  description: string[];
  included: string[];
  excluded: string[];
  pickupProcedure: string;
  perKm: string;
  minimumFare: string;
  airportFee: string;
  recommendedRank: string;
  b2cEnabled: boolean;
}

export const emptyVehicleValues = (): VehicleValues => ({
  name: "",
  vehicleExample: "",
  summary: "",
  maxPassengers: "3",
  maxLuggage: "2",
  maxCabinBags: "1",
  features: ["airConditioning", "englishDriver"],
  description: [],
  included: [],
  excluded: [],
  pickupProcedure: "",
  perKm: "",
  minimumFare: "",
  airportFee: "0",
  recommendedRank: "0",
  // Trade-only by default, exactly as hotels are. Opening a class to the
  // public is a decision somebody makes, not one they forget to undo.
  b2cEnabled: false,
});

export const vehicleValuesFrom = (vehicle: TransferVehicle): VehicleValues => ({
  name: vehicle.name,
  vehicleExample: vehicle.vehicleExample,
  summary: vehicle.summary,
  maxPassengers: String(vehicle.maxPassengers),
  maxLuggage: String(vehicle.maxLuggage),
  maxCabinBags: String(vehicle.maxCabinBags),
  features: vehicle.features,
  description: vehicle.description,
  included: vehicle.included,
  excluded: vehicle.excluded,
  pickupProcedure: vehicle.pickupProcedure,
  perKm: toMajorUnits(vehicle.fallbackPricing?.perKmCents),
  minimumFare: toMajorUnits(vehicle.fallbackPricing?.minimumFareCents),
  airportFee: toMajorUnits(vehicle.fallbackPricing?.airportFeeCents),
  recommendedRank: String(vehicle.recommendedRank),
  b2cEnabled: Boolean(vehicle.b2cEnabled),
});

/**
 * The one rule worth checking before the server does.
 *
 * A minimum fare of zero lets the distance engine quote a free ride on a
 * rounding error, and a database CHECK refuses it. Bouncing off that
 * constraint gives an operator a message about a constraint; this gives them a
 * message about a fare.
 */
export const vehicleValuesError = (values: VehicleValues): string | null => {
  const minimum = toMinorUnits(values.minimumFare);

  if (minimum === null) return "The minimum fare is required.";
  if (minimum <= 0) return "The minimum fare has to be more than zero.";
  if (toMinorUnits(values.perKm) === null) return "The per-kilometre rate is required.";

  return null;
};

/**
 * The half of a request body both screens send.
 *
 * Slug, class, body, kind and supplier are absent because they are set once at
 * creation and never edited. `b2cEnabled` is absent for the opposite reason:
 * the detail screen has a live toggle that owns it, so a form that sent it
 * would undo whoever last used that toggle. The create form, which has no
 * toggle to conflict with, adds it back itself.
 */
export const vehicleValuesToBody = (
  values: VehicleValues,
): Omit<
  TransferVehicleInput,
  "slug" | "vehicleClass" | "body" | "kind" | "providerId" | "b2cEnabled"
> => ({
  name: values.name.trim(),
  vehicleExample: values.vehicleExample.trim(),
  summary: values.summary.trim(),
  maxPassengers: Number(values.maxPassengers),
  maxLuggage: Number(values.maxLuggage),
  maxCabinBags: Number(values.maxCabinBags),
  features: values.features,
  description: values.description,
  included: values.included,
  excluded: values.excluded,
  pickupProcedure: values.pickupProcedure.trim(),
  perKmCents: toMinorUnits(values.perKm) ?? 0,
  minimumFareCents: toMinorUnits(values.minimumFare) ?? 0,
  airportFeeCents: toMinorUnits(values.airportFee) ?? 0,
  recommendedRank: Number(values.recommendedRank),
});

export function TransferVehicleFields({
  values,
  onChange,
  fieldErrors = {},
  showChannel = true,
}: {
  values: VehicleValues;
  onChange: <K extends keyof VehicleValues>(key: K, value: VehicleValues[K]) => void;
  fieldErrors?: Record<string, string>;
  /**
   * Whether to offer the public-channel switch.
   *
   * On for the create form, which is the only chance to open a class at birth.
   * Off on the editor, where the sidebar already carries a live toggle for the
   * same field — two controls writing one boolean means the form's copy of it
   * goes stale the moment somebody uses the toggle, and the next save silently
   * puts the class back the way it was. `vehicleValuesToBody` leaves the field
   * out for the same reason.
   */
  showChannel?: boolean;
}) {
  return (
    <>
      <div className="space-y-5">
        <TextInput
          id="vehicle-name"
          label="Name"
          required
          value={values.name}
          onChange={(event) => onChange("name", event.target.value)}
          placeholder="Comfort saloon"
          error={fieldErrors.name}
        />

        <TextInput
          id="vehicle-example"
          label="Vehicle example"
          required
          value={values.vehicleExample}
          onChange={(event) => onChange("vehicleExample", event.target.value)}
          placeholder="Toyota Camry or similar"
          error={fieldErrors.vehicleExample}
          hint="Always “or similar”. Naming one car is a promise that breaks the first time it goes in for a service."
        />

        <TextArea
          id="vehicle-summary"
          label="Summary"
          required
          rows={2}
          value={values.summary}
          onChange={(event) => onChange("summary", event.target.value)}
          error={fieldErrors.summary}
          hint="One line, on the result card, under the name."
        />
      </div>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">Capacity</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">Capacity</p>
        <p className="mt-1 text-[0.75rem] text-subtle">
          A hard constraint on search — a class is only offered when it can carry the whole party.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberInput
            id="vehicle-passengers"
            label="Passengers"
            min={1}
            max={80}
            value={values.maxPassengers}
            onChange={(event) => onChange("maxPassengers", event.target.value)}
            error={fieldErrors.maxPassengers}
          />
          <NumberInput
            id="vehicle-luggage"
            label="Large bags"
            min={0}
            max={80}
            value={values.maxLuggage}
            onChange={(event) => onChange("maxLuggage", event.target.value)}
            error={fieldErrors.maxLuggage}
          />
          <NumberInput
            id="vehicle-cabin"
            label="Cabin bags"
            min={0}
            max={80}
            value={values.maxCabinBags}
            onChange={(event) => onChange("maxCabinBags", event.target.value)}
            error={fieldErrors.maxCabinBags}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">Fallback fare</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">Fallback fare</p>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          Used only where a route has no price of its own:{" "}
          <span className="tabular-nums">max(minimum, km × rate) + airport fee</span>. Everything
          in the catalogue is priced, so this is the safety net rather than the price list.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <NumberInput
            id="vehicle-perkm"
            label="Per km (GEL)"
            min={0}
            step="0.01"
            value={values.perKm}
            onChange={(event) => onChange("perKm", event.target.value)}
            error={fieldErrors.perKmCents}
          />
          <NumberInput
            id="vehicle-minimum"
            label="Minimum (GEL)"
            min={0}
            step="0.01"
            value={values.minimumFare}
            onChange={(event) => onChange("minimumFare", event.target.value)}
            error={fieldErrors.minimumFareCents}
          />
          <NumberInput
            id="vehicle-airport"
            label="Airport fee (GEL)"
            min={0}
            step="0.01"
            value={values.airportFee}
            onChange={(event) => onChange("airportFee", event.target.value)}
            error={fieldErrors.airportFeeCents}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">What is on board</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">What is on board</p>
        <p className="mt-1 text-[0.75rem] text-subtle">
          Rendered as icons on the result card. Each one is a promise, so tick only what every car
          in the class actually has.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {featureOptions.map((feature) => (
            <CheckboxField
              key={feature.value}
              label={feature.label}
              checked={values.features.includes(feature.value)}
              onChange={(next) =>
                onChange(
                  "features",
                  next
                    ? [...values.features, feature.value]
                    : values.features.filter((entry) => entry !== feature.value),
                )
              }
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-6 space-y-5 border-t border-line pt-5">
        <legend className="sr-only">Copy</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">Copy</p>
        <p className="-mt-4 text-[0.75rem] text-subtle">
          English only. The translations live in their own tables and are edited separately —
          four languages in one form is a form nobody finishes.
        </p>

        <LineListInput
          label="Description"
          value={values.description}
          onChange={(next) => onChange("description", next)}
          rows={4}
          placeholder={"One paragraph per line.\nThey render in order on the vehicle page."}
          hint="Paragraphs, one per line."
          error={fieldErrors.description}
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <LineListInput
            label="Included"
            value={values.included}
            onChange={(next) => onChange("included", next)}
            placeholder={"Meet and greet\n60 minutes free waiting"}
            hint="One bullet per line."
            error={fieldErrors.included}
          />
          <LineListInput
            label="Not included"
            value={values.excluded}
            onChange={(next) => onChange("excluded", next)}
            placeholder={"Gratuities\nParking at the pick-up"}
            hint="One bullet per line."
            error={fieldErrors.excluded}
          />
        </div>

        <TextArea
          id="vehicle-pickup"
          label="Pick-up procedure"
          rows={3}
          value={values.pickupProcedure}
          onChange={(event) => onChange("pickupProcedure", event.target.value)}
          error={fieldErrors.pickupProcedure}
          hint="What actually happens on the day — where the driver waits, what they hold, how they make contact."
        />
      </fieldset>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">Where it sells</legend>

        <Field
          label="Recommended rank"
          className="max-w-40"
          hint="Lower sorts first in the “Recommended” order."
        >
          <input
            type="number"
            min={0}
            max={999}
            value={values.recommendedRank}
            onChange={(event) => onChange("recommendedRank", event.target.value)}
            className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-end text-[0.875rem] text-ink tabular-nums transition-colors focus:border-ink focus:outline-none"
          />
        </Field>

        {showChannel && (
          <CheckboxField
            className="mt-5"
            label="Sell this class to the public"
            hint="Everything is trade-only until it is opened. Partners and staff see it either way."
            checked={values.b2cEnabled}
            onChange={(next) => onChange("b2cEnabled", next)}
          />
        )}
      </fieldset>
    </>
  );
}
