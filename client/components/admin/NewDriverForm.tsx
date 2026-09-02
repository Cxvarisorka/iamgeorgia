"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { DriverFields, driverValuesToBody, emptyDriverValues, type DriverValues } from "./DriverFields";
import { FormError, SelectInput, SubmitButton } from "./FormControls";
import { ApiError, describeError } from "@/lib/api/client";
import { createDriver } from "@/lib/api/drivers";
import { useLocalePath } from "@/lib/i18n/provider";
import type { TransferProvider } from "@/types/transfer";

/**
 * A new driver profile. No login yet: that is a separate, deliberate step on
 * the driver's page, because a subcontractor's driver may be dispatched to by
 * phone for months before anyone needs them in the app.
 */
export function NewDriverForm({ providers }: { providers: TransferProvider[] }) {
  const router = useRouter();
  const path = useLocalePath();

  const [values, setValues] = useState<DriverValues>(emptyDriverValues);
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof DriverValues>(key: K, value: DriverValues[K]) =>
    setValues((current) => ({ ...current, [key]: value }));

  const ready =
    values.firstName.trim().length > 0 &&
    values.lastName.trim().length > 0 &&
    values.phone.trim().length > 6 &&
    providerId.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const created = await createDriver({ ...driverValuesToBody(values), providerId });
      router.push(path(`/admin/transfers/drivers/${created.id}`));
      router.refresh();
      return;
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.fieldErrors());
      setError(describeError(caught));
      setBusy(false);
    }
  };

  if (providers.length === 0) {
    return (
      <p className="rounded-sm border border-warning/40 bg-warning/5 p-4 text-[0.875rem] leading-relaxed text-warning-text">
        Every driver works for a supplier, and there is not one on file yet.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <SelectInput
        id="new-driver-provider"
        label="Works for"
        value={providerId}
        onChange={(event) => setProviderId(event.target.value)}
        options={providers.map((provider) => ({ value: provider.id, label: provider.name }))}
        error={fieldErrors.providerId}
      />

      <div className="mt-8 border-t border-line pt-6">
        <DriverFields values={values} onChange={set} fieldErrors={fieldErrors} />
      </div>

      <FormError message={error} />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton type="submit" busy={busy} disabled={!ready}>
          {busy ? "Adding…" : "Add driver"}
        </SubmitButton>
        {!ready && <p className="text-[0.75rem] text-subtle">A name and a phone number are the minimum.</p>}
      </div>
    </form>
  );
}
