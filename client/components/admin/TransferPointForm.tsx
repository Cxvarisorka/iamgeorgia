"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  CheckboxField,
  Field,
  FormError,
  NumberInput,
  SelectInput,
  SubmitButton,
  TextInput,
} from "./FormControls";
import { TransferPointMap } from "./TransferPointMap";
import { ApiError, describeError } from "@/lib/api/client";
import {
  createTransferPoint,
  updateTransferPoint,
  type TransferPointInput,
} from "@/lib/api/transfers";
import { pointKindOptions, slugify, timezoneOptions } from "@/lib/admin/transfers";
import { useLocalePath } from "@/lib/i18n/provider";
import type { TransferPoint, TransferPointKind } from "@/types/transfer";

/**
 * Adding or editing a pick-up point.
 *
 * One component for both, because the two differ in exactly two ways — where
 * the values start and which endpoint the button calls — and a separate
 * create form would be the same twelve fields maintained twice.
 *
 * The slug is the exception to that symmetry. On a new point it is derived
 * from the name as it is typed and stays editable; on an existing one it is
 * left alone entirely. It is part of a URL that has already been linked to,
 * and quietly renaming it from a form that looks like a copy editor is how a
 * live page turns into a 404.
 */

/** The form's own shape: every field a string, as the inputs hold them. */
interface Values {
  slug: string;
  name: string;
  kind: TransferPointKind;
  iataCode: string;
  regionLabel: string;
  latitude: string;
  longitude: string;
  timezone: string;
  popular: boolean;
}

const initial = (point?: TransferPoint): Values => ({
  slug: point?.slug ?? "",
  name: point?.name ?? "",
  kind: point?.kind ?? "CITY",
  iataCode: point?.code ?? "",
  regionLabel: point?.region ?? "",
  // `toFixed(6)` rather than `String()`: six decimals is roughly 10cm, and a
  // round-trip through the form should not lengthen the number it was given.
  latitude: point ? point.latitude.toFixed(6) : "",
  longitude: point ? point.longitude.toFixed(6) : "",
  timezone: point?.timezone ?? "Asia/Tbilisi",
  popular: point?.popular ?? false,
});

export function TransferPointForm({ point }: { point?: TransferPoint }) {
  const router = useRouter();
  const path = useLocalePath();

  const editing = Boolean(point);

  const [values, setValues] = useState<Values>(() => initial(point));
  const [slugTouched, setSlugTouched] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const latitude = Number.parseFloat(values.latitude);
  const longitude = Number.parseFloat(values.longitude);
  const placed = Number.isFinite(latitude) && Number.isFinite(longitude);

  const isAirport = values.kind === "AIRPORT";

  const ready =
    values.name.trim().length > 0 &&
    values.slug.trim().length > 0 &&
    values.regionLabel.trim().length > 0 &&
    placed;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    // A three-letter code is required by the server when it is sent at all, so
    // an airport half-typed is caught here rather than as a field error on a
    // form the operator has already scrolled away from.
    const code = values.iataCode.trim().toUpperCase();

    if (code && code.length !== 3) {
      setFieldErrors({ iataCode: "An IATA code is exactly three letters." });
      setBusy(false);
      return;
    }

    const body: TransferPointInput = {
      slug: values.slug.trim(),
      name: values.name.trim(),
      kind: values.kind,
      regionLabel: values.regionLabel.trim(),
      latitude,
      longitude,
      timezone: values.timezone,
      popular: values.popular,
      // Only airports carry one, and the field is `.optional()` rather than
      // nullable on create — an empty string would be a validation failure.
      ...(isAirport && code ? { iataCode: code } : {}),
    };

    try {
      if (point) {
        // A point that has stopped being an airport has to lose its code, and
        // an omitted key means "leave it alone" — so this branch sends an
        // explicit null. The update schema accepts one; the create schema does
        // not, which is why the two bodies differ here and nowhere else.
        await updateTransferPoint(point.id, {
          ...body,
          iataCode: isAirport && code ? code : null,
        });
        setSaved(true);
        router.refresh();
      } else {
        const created = await createTransferPoint(body);
        router.push(path(`/admin/transfers/points/${created.id}`));
        router.refresh();
        // Deliberately left busy: the push is in flight and re-enabling the
        // button invites a second point with the same slug.
        return;
      }
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.fieldErrors());
      setError(describeError(caught));
    }

    setBusy(false);
  };

  return (
    <form onSubmit={submit}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5">
          <TextInput
            id="point-name"
            label="Name"
            required
            value={values.name}
            onChange={(event) => {
              set("name", event.target.value);
              if (!slugTouched) set("slug", slugify(event.target.value));
            }}
            placeholder="Tbilisi International Airport"
            error={fieldErrors.name}
            hint="What the traveller sees in the pick-up picker."
          />

          <TextInput
            id="point-slug"
            label="Slug"
            required
            mono
            readOnly={editing}
            value={values.slug}
            onChange={(event) => {
              setSlugTouched(true);
              set("slug", slugify(event.target.value));
            }}
            error={fieldErrors.slug}
            hint={
              editing
                ? "Fixed once the point exists — it is part of URLs that are already linked to."
                : "Lowercase letters, numbers and hyphens. Derived from the name until you edit it."
            }
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <SelectInput
              id="point-kind"
              label="Kind"
              value={values.kind}
              onChange={(event) => set("kind", event.target.value as TransferPointKind)}
              options={pointKindOptions}
              error={fieldErrors.kind}
            />

            <TextInput
              id="point-iata"
              label="IATA code"
              mono
              maxLength={3}
              disabled={!isAirport}
              value={isAirport ? values.iataCode : ""}
              onChange={(event) => set("iataCode", event.target.value.toUpperCase())}
              placeholder="TBS"
              error={fieldErrors.iataCode}
              hint={isAirport ? "Shown as a chip beside the name." : "Airports only."}
            />
          </div>

          <TextInput
            id="point-region"
            label="Region"
            required
            value={values.regionLabel}
            onChange={(event) => set("regionLabel", event.target.value)}
            placeholder="Tbilisi"
            error={fieldErrors.regionLabel}
            hint="The second line of every option row, so two places with the same name stay apart."
          />

          <SelectInput
            id="point-timezone"
            label="Time zone"
            value={values.timezone}
            onChange={(event) => set("timezone", event.target.value)}
            options={timezoneOptions.map((zone) => ({ value: zone, label: zone }))}
            error={fieldErrors.timezone}
            hint="A pick-up time is a wall clock reading here, not a UTC instant."
          />

          <CheckboxField
            label="Show first in the picker"
            hint="Surfaced before the traveller types anything. Worth it for a handful of places, not for fifty."
            checked={values.popular}
            onChange={(next) => set("popular", next)}
          />
        </div>

        <div className="space-y-5">
          <Field
            label="Where it is"
            error={fieldErrors.latitude ?? fieldErrors.longitude}
            hint="Coordinates price every route through here that has no fare of its own, so they are worth placing rather than typing."
          >
            <TransferPointMap
              latitude={placed ? latitude : null}
              longitude={placed ? longitude : null}
              onChange={(nextLat, nextLng) => {
                set("latitude", nextLat.toFixed(6));
                set("longitude", nextLng.toFixed(6));
              }}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <NumberInput
              id="point-latitude"
              label="Latitude"
              required
              step="any"
              min={-90}
              max={90}
              value={values.latitude}
              onChange={(event) => set("latitude", event.target.value)}
              error={fieldErrors.latitude}
            />
            <NumberInput
              id="point-longitude"
              label="Longitude"
              required
              step="any"
              min={-180}
              max={180}
              value={values.longitude}
              onChange={(event) => set("longitude", event.target.value)}
              error={fieldErrors.longitude}
            />
          </div>
        </div>
      </div>

      <FormError message={error} />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton type="submit" busy={busy} saved={saved} disabled={!ready}>
          {editing
            ? busy
              ? "Saving…"
              : saved
                ? "Saved"
                : "Save point"
            : busy
              ? "Creating…"
              : "Create point"}
        </SubmitButton>

        {!ready && (
          <p className="text-[0.75rem] text-subtle">
            A name, a slug, a region and a place on the map are the minimum.
          </p>
        )}
      </div>
    </form>
  );
}
