"use client";

import { CheckboxField, NumberInput, TextArea, TextInput } from "./FormControls";
import { fleetFeatureOptions } from "@/lib/admin/fleet";
import type { FleetVehicleInput } from "@/lib/api/fleet";
import type { FleetVehicleAdmin, FleetVehicleFeature } from "@/types/driver";

/**
 * The fields a car has, shared by the create form and the editor.
 *
 * Grouped by how they fail. **Identity** is what a passenger reads off the
 * kerb: make, model, colour, plate. **Capacity** is a hard guard on dispatch —
 * a car with three seats is never offered a party of five. **Features** are
 * what this particular car promises beyond its class (a wheelchair ramp, a
 * child seat that actually lives in the boot). **Internal** never leaves the
 * panel.
 */

export interface FleetValues {
  make: string;
  model: string;
  year: string;
  colour: string;
  plateNumber: string;
  vin: string;
  passengerCapacity: string;
  luggageCapacity: string;
  cabinBagCapacity: string;
  features: FleetVehicleFeature[];
  description: string;
  internalNotes: string;
}

export const emptyFleetValues = (): FleetValues => ({
  make: "",
  model: "",
  year: "",
  colour: "",
  plateNumber: "",
  vin: "",
  passengerCapacity: "3",
  luggageCapacity: "2",
  cabinBagCapacity: "2",
  features: ["airConditioning"],
  description: "",
  internalNotes: "",
});

export const fleetValuesFrom = (vehicle: FleetVehicleAdmin): FleetValues => ({
  make: vehicle.make,
  model: vehicle.model,
  year: vehicle.year === null ? "" : String(vehicle.year),
  colour: vehicle.colour ?? "",
  plateNumber: vehicle.plateNumber,
  vin: vehicle.vin ?? "",
  passengerCapacity: String(vehicle.passengerCapacity),
  luggageCapacity: String(vehicle.luggageCapacity),
  cabinBagCapacity: String(vehicle.cabinBagCapacity),
  features: vehicle.features,
  description: vehicle.description ?? "",
  internalNotes: vehicle.internalNotes ?? "",
});

const int = (value: string, fallback = 0) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** The half of a request body both screens send. */
export const fleetValuesToBody = (
  values: FleetValues,
): Omit<FleetVehicleInput, "providerId" | "vehicleClassId" | "body" | "status"> => ({
  make: values.make.trim(),
  model: values.model.trim(),
  year: values.year.trim() ? int(values.year) : null,
  colour: values.colour.trim() || null,
  plateNumber: values.plateNumber.trim(),
  vin: values.vin.trim() || null,
  passengerCapacity: int(values.passengerCapacity, 1),
  luggageCapacity: int(values.luggageCapacity),
  cabinBagCapacity: int(values.cabinBagCapacity),
  features: values.features,
  description: values.description.trim() || null,
  internalNotes: values.internalNotes.trim() || null,
});

export function FleetVehicleFields({
  values,
  onChange,
  fieldErrors,
}: {
  values: FleetValues;
  onChange: <K extends keyof FleetValues>(key: K, value: FleetValues[K]) => void;
  fieldErrors: Record<string, string>;
}) {
  const toggleFeature = (feature: FleetVehicleFeature, next: boolean) =>
    onChange(
      "features",
      next ? [...values.features, feature] : values.features.filter((value) => value !== feature),
    );

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-[0.8125rem] font-semibold text-ink">The car</legend>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          What a passenger reads off the kerb. The plate is matched however it is spelt — spaces and
          dashes do not make it a different car.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextInput
            id="fleet-make"
            label="Make"
            required
            value={values.make}
            onChange={(event) => onChange("make", event.target.value)}
            error={fieldErrors.make}
          />
          <TextInput
            id="fleet-model"
            label="Model"
            required
            value={values.model}
            onChange={(event) => onChange("model", event.target.value)}
            error={fieldErrors.model}
          />
          <TextInput
            id="fleet-plate"
            label="Registration plate"
            required
            mono
            value={values.plateNumber}
            onChange={(event) => onChange("plateNumber", event.target.value)}
            error={fieldErrors.plateNumber}
          />
          <TextInput
            id="fleet-colour"
            label="Colour"
            value={values.colour}
            onChange={(event) => onChange("colour", event.target.value)}
            error={fieldErrors.colour}
          />
          <NumberInput
            id="fleet-year"
            label="Year"
            min={1980}
            max={2100}
            value={values.year}
            onChange={(event) => onChange("year", event.target.value)}
            error={fieldErrors.year}
          />
          <TextInput
            id="fleet-vin"
            label="VIN"
            mono
            value={values.vin}
            onChange={(event) => onChange("vin", event.target.value)}
            error={fieldErrors.vin}
            hint="Internal. Never shown to partners or passengers."
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[0.8125rem] font-semibold text-ink">Capacity</legend>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          A hard rule at dispatch: this car is never offered a party it cannot carry.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <NumberInput
            id="fleet-seats"
            label="Passenger seats"
            required
            min={1}
            max={80}
            value={values.passengerCapacity}
            onChange={(event) => onChange("passengerCapacity", event.target.value)}
            error={fieldErrors.passengerCapacity}
          />
          <NumberInput
            id="fleet-luggage"
            label="Large bags"
            required
            min={0}
            max={80}
            value={values.luggageCapacity}
            onChange={(event) => onChange("luggageCapacity", event.target.value)}
            error={fieldErrors.luggageCapacity}
          />
          <NumberInput
            id="fleet-cabin"
            label="Cabin bags"
            min={0}
            max={80}
            value={values.cabinBagCapacity}
            onChange={(event) => onChange("cabinBagCapacity", event.target.value)}
            error={fieldErrors.cabinBagCapacity}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[0.8125rem] font-semibold text-ink">On board</legend>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          What this particular car promises. Shown to the partner and the passenger once it is
          assigned.
        </p>
        <div className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {fleetFeatureOptions.map((option) => (
            <CheckboxField
              key={option.value}
              label={option.label}
              checked={values.features.includes(option.value)}
              onChange={(next) => toggleFeature(option.value, next)}
            />
          ))}
        </div>
        {fieldErrors.features && (
          <p role="alert" className="mt-2 text-[0.75rem] text-error-text">
            {fieldErrors.features}
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="text-[0.8125rem] font-semibold text-ink">Notes</legend>
        <TextArea
          id="fleet-description"
          label="Description"
          rows={3}
          value={values.description}
          onChange={(event) => onChange("description", event.target.value)}
          error={fieldErrors.description}
          hint="Public. A line or two the partner sees beside the photos."
        />
        <TextArea
          id="fleet-notes"
          label="Internal notes"
          rows={3}
          value={values.internalNotes}
          onChange={(event) => onChange("internalNotes", event.target.value)}
          error={fieldErrors.internalNotes}
          hint="Winter tyres, a dent on the offside door, the garage it goes to. Staff only."
        />
      </fieldset>
    </div>
  );
}
