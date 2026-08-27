"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormError, SelectInput, SubmitButton, TextInput } from "./FormControls";
import {
  TransferVehicleFields,
  emptyVehicleValues,
  vehicleValuesError,
  vehicleValuesToBody,
  type VehicleValues,
} from "./TransferVehicleFields";
import { ApiError, describeError } from "@/lib/api/client";
import { createTransferVehicle } from "@/lib/api/transfers";
import {
  slugify,
  transferKindOptions,
  vehicleBodyOptions,
  vehicleClassOptions,
} from "@/lib/admin/transfers";
import { useLocalePath } from "@/lib/i18n/provider";
import type {
  TransferKind,
  TransferProvider,
  TransferVehicleBody,
  TransferVehicleClass,
} from "@/types/transfer";

/**
 * A new vehicle class.
 *
 * The whole record at once, not a wizard. A class is only sellable when it has
 * a capacity, a fallback fare and copy — creating a stub would put a row in
 * the fleet that quotes nothing and reads as broken on the public card, and
 * there is no publish checklist here to chase the rest of it down.
 *
 * Four fields live on this screen rather than in the shared fieldset because
 * they are the ones that are effectively fixed once a class exists. The class,
 * the body and the sold-as kind determine which searches offer it and how it
 * is priced; the supplier is who gets paid. Changing any of them later is a
 * different product, not an edit, so they are set deliberately here and left
 * off the editor.
 *
 * Created trade-only unless the box is ticked, exactly as hotels are.
 */
export function NewTransferVehicleForm({ providers }: { providers: TransferProvider[] }) {
  const router = useRouter();
  const path = useLocalePath();

  const [values, setValues] = useState<VehicleValues>(emptyVehicleValues);
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [vehicleClass, setVehicleClass] = useState<TransferVehicleClass>("COMFORT");
  const [body, setBody] = useState<TransferVehicleBody>("sedan");
  const [kind, setKind] = useState<TransferKind>("PRIVATE");
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof VehicleValues>(key: K, value: VehicleValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const ready =
    values.name.trim().length > 0 &&
    values.vehicleExample.trim().length > 0 &&
    values.summary.trim().length > 0 &&
    slug.trim().length > 0 &&
    providerId.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const fareProblem = vehicleValuesError(values);

    if (fareProblem) {
      setError(fareProblem);
      return;
    }

    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const created = await createTransferVehicle({
        ...vehicleValuesToBody(values),
        slug: slug.trim(),
        vehicleClass,
        body,
        kind,
        providerId,
        // Create-time only. After this the sidebar toggle owns the field.
        b2cEnabled: values.b2cEnabled,
      });

      router.push(path(`/admin/transfers/vehicles/${created.id}`));
      router.refresh();
      // Left busy on purpose: the navigation is in flight, and re-enabling the
      // button is an invitation to create the class twice.
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
        There are no transfer suppliers on file, and every vehicle class belongs to one. Add the
        supplier as a partner first — a class cannot be created without somebody to operate it.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend className="sr-only">What this class is</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">What this class is</p>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          These four decide which searches offer the class and who operates it. They are set once —
          changing them afterwards is a different product rather than an edit, so they are not on
          the editor.
        </p>

        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <SelectInput
            id="vehicle-class"
            label="Class"
            value={vehicleClass}
            onChange={(event) => setVehicleClass(event.target.value as TransferVehicleClass)}
            options={vehicleClassOptions}
            error={fieldErrors.vehicleClass}
          />

          <SelectInput
            id="vehicle-body"
            label="Body"
            value={body}
            onChange={(event) => setBody(event.target.value as TransferVehicleBody)}
            options={vehicleBodyOptions}
            error={fieldErrors.body}
            hint="Picks the illustration on the result card."
          />

          <SelectInput
            id="vehicle-kind"
            label="Sold as"
            value={kind}
            onChange={(event) => setKind(event.target.value as TransferKind)}
            options={transferKindOptions}
            error={fieldErrors.kind}
            hint="A shared class quotes per seat; a private one quotes the whole vehicle."
          />

          <SelectInput
            id="vehicle-provider"
            label="Supplier"
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
            options={providers.map((provider) => ({ value: provider.id, label: provider.name }))}
            error={fieldErrors.providerId}
            hint="The company that actually operates it."
          />
        </div>
      </fieldset>

      <div className="mt-6 border-t border-line pt-5">
        <TextInput
          id="vehicle-slug"
          label="Slug"
          required
          mono
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugify(event.target.value));
          }}
          error={fieldErrors.slug}
          hint="Part of the public URL. Derived from the name until you edit it."
        />
      </div>

      <div className="mt-6 border-t border-line pt-5">
        <TransferVehicleFields
          values={values}
          fieldErrors={fieldErrors}
          onChange={(key, value) => {
            set(key, value);
            // The slug follows the name until somebody takes it over, the same
            // arrangement the hotel and point forms use.
            if (key === "name" && !slugTouched) setSlug(slugify(String(value)));
          }}
        />
      </div>

      <FormError message={error} />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton type="submit" busy={busy} disabled={!ready}>
          {busy ? "Creating…" : "Create vehicle class"}
        </SubmitButton>

        {!ready && (
          <p className="text-[0.75rem] text-subtle">
            A name, an example vehicle, a summary and a slug are the minimum.
          </p>
        )}
      </div>
    </form>
  );
}
