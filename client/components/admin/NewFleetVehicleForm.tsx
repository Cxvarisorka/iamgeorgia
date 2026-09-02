"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CheckboxField, FormError, SelectInput, SubmitButton } from "./FormControls";
import {
  FleetVehicleFields,
  emptyFleetValues,
  fleetValuesToBody,
  type FleetValues,
} from "./FleetVehicleFields";
import { ApiError, describeError } from "@/lib/api/client";
import { createFleetVehicle } from "@/lib/api/fleet";
import { vehicleBodyOptions, vehicleClassLabels } from "@/lib/admin/transfers";
import { useLocalePath } from "@/lib/i18n/provider";
import type { TransferProvider, TransferVehicle, TransferVehicleBody } from "@/types/transfer";

/**
 * A new car.
 *
 * Created on the road unless the box is unticked: unlike a vehicle class, a
 * car has nothing to publish — it is either available to dispatch or it is
 * not — and the usual reason to add one is that it starts tomorrow.
 */
export function NewFleetVehicleForm({
  providers,
  classes,
}: {
  providers: TransferProvider[];
  classes: TransferVehicle[];
}) {
  const router = useRouter();
  const path = useLocalePath();

  const [values, setValues] = useState<FleetValues>(emptyFleetValues);
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [vehicleClassId, setVehicleClassId] = useState(classes[0]?.id ?? "");
  const [body, setBody] = useState<TransferVehicleBody>("sedan");
  const [onTheRoad, setOnTheRoad] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof FleetValues>(key: K, value: FleetValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const ready =
    values.make.trim().length > 0 &&
    values.model.trim().length > 0 &&
    values.plateNumber.trim().length > 1 &&
    providerId.length > 0 &&
    vehicleClassId.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const created = await createFleetVehicle({
        ...fleetValuesToBody(values),
        providerId,
        vehicleClassId,
        body,
        status: onTheRoad ? "ACTIVE" : "DRAFT",
      });

      router.push(path(`/admin/transfers/fleet/${created.id}`));
      router.refresh();
      return;
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.fieldErrors());
      setError(describeError(caught));
      setBusy(false);
    }
  };

  if (providers.length === 0 || classes.length === 0) {
    return (
      <p className="rounded-sm border border-warning/40 bg-warning/5 p-4 text-[0.875rem] leading-relaxed text-warning-text">
        A car belongs to a supplier and is sold as a vehicle class, and there is not yet one of
        each on file. Add the supplier and the class first.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend className="text-[0.8125rem] font-semibold text-ink">Who runs it, what it sells as</legend>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <SelectInput
            id="new-fleet-provider"
            label="Operated by"
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
            options={providers.map((provider) => ({ value: provider.id, label: provider.name }))}
            error={fieldErrors.providerId}
          />
          <SelectInput
            id="new-fleet-class"
            label="Sold as"
            value={vehicleClassId}
            onChange={(event) => setVehicleClassId(event.target.value)}
            options={classes.map((item) => ({
              value: item.id,
              label: `${item.name} (${vehicleClassLabels[item.vehicleClass] ?? item.vehicleClass})`,
            }))}
            error={fieldErrors.vehicleClassId}
          />
          <SelectInput
            id="new-fleet-body"
            label="Body"
            value={body}
            onChange={(event) => setBody(event.target.value as TransferVehicleBody)}
            options={vehicleBodyOptions}
            error={fieldErrors.body}
          />
        </div>
      </fieldset>

      <div className="mt-8 border-t border-line pt-6">
        <FleetVehicleFields values={values} onChange={set} fieldErrors={fieldErrors} />
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <CheckboxField
          label="Available to dispatch straight away"
          hint="Untick to add it now and put it on the road later."
          checked={onTheRoad}
          onChange={setOnTheRoad}
        />
      </div>

      <FormError message={error} />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton type="submit" busy={busy} disabled={!ready}>
          {busy ? "Adding…" : "Add car"}
        </SubmitButton>
        {!ready && (
          <p className="text-[0.75rem] text-subtle">Make, model and plate are the minimum.</p>
        )}
      </div>
    </form>
  );
}
