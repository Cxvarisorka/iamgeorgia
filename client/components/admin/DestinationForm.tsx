"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  CheckboxField,
  Field,
  FormError,
  LineListInput,
  NumberInput,
  SelectInput,
  SubmitButton,
  TextArea,
  TextInput,
} from "./FormControls";
import { TransferPointMap } from "./TransferPointMap";
import { ApiError, describeError } from "@/lib/api/client";
import { createDestination, updateDestination, type DestinationInput } from "@/lib/api/hotels";
import {
  destinationTypeHints,
  destinationTypeOptions,
  flattenTree,
  indent,
  parentOptions,
} from "@/lib/admin/destinations";
import { slugify, timezoneOptions } from "@/lib/admin/geography";
import { useLocalePath } from "@/lib/i18n/provider";
import type { Destination, DestinationNode, DestinationType } from "@/types/catalogue";

/**
 * Adding or editing a destination.
 *
 * One component for both, like `TransferPointForm`: the two differ in where the
 * values start and which endpoint the button calls, and a separate create form
 * would be the same fields maintained twice.
 *
 * The shape of the form follows what a destination is *for*. Its top half is
 * structural — type, parent, country, coordinates — because those decide where
 * every hotel, tour and pick-up point below it is filed, and what "everything in
 * Georgia" resolves to. The editorial half underneath is optional throughout and
 * can be left empty forever without holding anything up.
 *
 * Two fields deserve care, and both say so on screen:
 *
 *   * **Sits inside** re-homes the whole subtree. The server rewrites the path
 *     of every descendant, so moving a region moves everything in it.
 *   * **Slug** is a segment of that path. Renaming one is supported and rewrites
 *     the subtree too, but it changes an address other records are filed under,
 *     so it is read-only once the record exists — the same rule the pick-up
 *     point form applies.
 *
 * `gallery`, `attractions` and `travelInfo` are deliberately absent. They are
 * editorial JSON for a public destination section that is currently retired
 * (`app/[locale]/(site)/destinations` answers 404), and building repeater UIs
 * for fields nothing renders would be furniture. A PATCH only sends the keys it
 * carries, so whatever is already stored in them survives every save made here.
 */

/** The form's own shape: every field a string, as the inputs hold them. */
interface Values {
  slug: string;
  name: string;
  type: DestinationType;
  parentId: string;
  countryCode: string;
  timezone: string;
  latitude: string;
  longitude: string;
  tagline: string;
  summary: string;
  description: string[];
  heroImage: string;
  coverImage: string;
  idealFor: string[];
  featured: boolean;
}

const initial = (destination?: Destination): Values => ({
  slug: destination?.slug ?? "",
  name: destination?.name ?? "",
  type: destination?.type ?? "CITY",
  parentId: destination?.parentId ?? "",
  countryCode: destination?.countryCode ?? "GE",
  timezone: destination?.timezone ?? "Asia/Tbilisi",
  // `toFixed(6)` rather than `String()`: six decimals is roughly 10cm, and a
  // round-trip through the form should not lengthen the number it was given.
  latitude: destination?.latitude != null ? destination.latitude.toFixed(6) : "",
  longitude: destination?.longitude != null ? destination.longitude.toFixed(6) : "",
  tagline: destination?.tagline ?? "",
  summary: destination?.summary ?? "",
  description: destination?.description ?? [],
  heroImage: destination?.heroImage ?? "",
  coverImage: destination?.coverImage ?? "",
  idealFor: destination?.idealFor ?? [],
  featured: destination?.featured ?? false,
});

export function DestinationForm({
  destination,
  tree,
}: {
  destination?: Destination;
  /** The whole tree, for the parent picker. Tens of rows, so it ships whole. */
  tree: DestinationNode[];
}) {
  const router = useRouter();
  const path = useLocalePath();

  const editing = Boolean(destination);

  const [values, setValues] = useState<Values>(() => initial(destination));
  const [slugTouched, setSlugTouched] = useState(editing);
  // Until it is edited by hand, the country follows the parent. Sending a
  // hard-coded GE for a place filed under Armenia would override the value the
  // server would otherwise have inherited, and nothing on screen would say so.
  const [countryTouched, setCountryTouched] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const flat = useMemo(() => flattenTree(tree), [tree]);

  // Recomputed when the type changes, because the answer depends on it: a
  // region may only sit in a country, a city may sit in either.
  const parents = useMemo(
    () =>
      parentOptions(
        flat,
        values.type,
        destination ? { id: destination.id, path: destination.path } : undefined,
      ),
    [flat, values.type, destination],
  );

  const isCountry = values.type === "COUNTRY";
  const parent = flat.find((candidate) => candidate.id === values.parentId);

  const latitude = Number.parseFloat(values.latitude);
  const longitude = Number.parseFloat(values.longitude);
  const placed = Number.isFinite(latitude) && Number.isFinite(longitude);
  // A pair or neither, which is what the server's schema and the table's CHECK
  // constraint both say. Catching it here names the field instead of quoting a
  // constraint back at the operator.
  const halfPlaced = (values.latitude.trim() !== "") !== (values.longitude.trim() !== "");

  /**
   * Both fields emptied on a record that already had a pin.
   *
   * There is no way to say "unset these": the update schema takes a number or
   * nothing, and nothing means "leave it alone". Saving would therefore keep
   * the stored pair while the form showed two empty boxes, so the operator is
   * told rather than left to discover it on the next page load.
   */
  const clearingPlacement =
    editing && destination?.latitude != null && !placed && !halfPlaced;

  const ready =
    values.name.trim().length > 0 &&
    values.slug.trim().length > 0 &&
    (isCountry ? values.countryCode.trim().length === 2 : values.parentId.length > 0) &&
    !halfPlaced;

  /**
   * A text field on its way to the API.
   *
   * Empty means "clear this" on an edit, which has to be an explicit `null` —
   * the server's text fields reject `""`, and an omitted key means "leave it
   * alone". On a create there is nothing to clear, so it is simply omitted.
   */
  const optionalText = (value: string): string | null | undefined => {
    const trimmed = value.trim();
    if (trimmed) return trimmed;
    return editing ? null : undefined;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    // Everything except the slug, which only a create sends: it is read-only
    // while editing, and sending an unchanged one would have the server treat
    // every save as a rename — rewriting the path of the whole subtree for
    // nothing.
    const body: Omit<DestinationInput, "slug"> = {
      name: values.name.trim(),
      type: values.type,
      // Null rather than omitted: on an edit this is what promotes a record to
      // a root, and a country is always one.
      parentId: isCountry ? null : values.parentId,
      countryCode: values.countryCode.trim().toUpperCase(),
      timezone: values.timezone,
      ...(placed ? { latitude, longitude } : {}),
      tagline: optionalText(values.tagline),
      summary: optionalText(values.summary),
      description: values.description,
      heroImage: optionalText(values.heroImage),
      coverImage: optionalText(values.coverImage),
      idealFor: values.idealFor,
      featured: values.featured,
    };

    try {
      if (destination) {
        await updateDestination(destination.id, body);
        setSaved(true);
        router.refresh();
      } else {
        const created = await createDestination({ ...body, slug: values.slug.trim() });
        router.push(path(`/admin/destinations/${created.id}`));
        router.refresh();
        // Deliberately left busy: the push is in flight, and re-enabling the
        // button invites a second destination with the same slug.
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
            id="destination-name"
            label="Name"
            required
            value={values.name}
            onChange={(event) => {
              set("name", event.target.value);
              if (!slugTouched) set("slug", slugify(event.target.value));
            }}
            placeholder="Bakuriani"
            error={fieldErrors.name}
            hint="The place as a traveller would name it. Other languages are added as translations."
          />

          <TextInput
            id="destination-slug"
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
                ? "Fixed once the destination exists — it is a segment of the path every record below it is filed under."
                : "Lowercase letters, numbers and hyphens. Derived from the name until you edit it."
            }
          />

          <SelectInput
            id="destination-type"
            label="Type"
            value={values.type}
            onChange={(event) => {
              const next = event.target.value as DestinationType;
              set("type", next);
              // A country is a root by definition, and a parent that was broad
              // enough for a city may be too narrow for a region.
              if (next === "COUNTRY") set("parentId", "");
            }}
            options={destinationTypeOptions}
            error={fieldErrors.type}
            hint={destinationTypeHints[values.type]}
          />

          <SelectInput
            id="destination-parent"
            label="Sits inside"
            required={!isCountry}
            disabled={isCountry}
            value={isCountry ? "" : values.parentId}
            onChange={(event) => {
              set("parentId", event.target.value);

              const next = flat.find((candidate) => candidate.id === event.target.value);
              if (next && !countryTouched) set("countryCode", next.countryCode);
            }}
            placeholder={isCountry ? "Nothing — a country is a root" : "Choose a parent"}
            options={parents.map((candidate) => ({
              value: candidate.id,
              label: `${indent(candidate.depth)}${candidate.name}`,
            }))}
            error={fieldErrors.parentId}
            hint={
              isCountry
                ? "A country is always a root. Filing one under anything else would make its path a lie for every hotel below it."
                : editing
                  ? "Moving this re-files everything beneath it: the path of every child, hotel and pick-up point below is rewritten."
                  : "Only destinations broad enough to hold this type are offered."
            }
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput
              id="destination-country"
              label="Country code"
              required={isCountry}
              mono
              maxLength={2}
              value={values.countryCode}
              onChange={(event) => {
                setCountryTouched(true);
                set("countryCode", event.target.value.toUpperCase());
              }}
              placeholder="GE"
              error={fieldErrors.countryCode}
              hint={
                isCountry
                  ? "Two letters, ISO 3166. Everything filed below inherits it."
                  : "Two letters, ISO 3166. Follows the parent until you change it."
              }
            />

            <SelectInput
              id="destination-timezone"
              label="Time zone"
              value={values.timezone}
              onChange={(event) => set("timezone", event.target.value)}
              options={timezoneOptions.map((zone) => ({ value: zone, label: zone }))}
              error={fieldErrors.timezone}
              hint="Hotels here inherit it unless they override it."
            />
          </div>

          <CheckboxField
            label="Feature this destination"
            hint="Marks it for anywhere that asks for featured places. Worth it for a handful, not for fifty."
            checked={values.featured}
            onChange={(next) => set("featured", next)}
          />
        </div>

        <div className="space-y-5">
          <Field
            label="Where it is"
            error={fieldErrors.latitude ?? fieldErrors.longitude}
            hint="Optional, and a pair or nothing. It centres the maps that show what is in this place; it prices nothing."
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
              id="destination-latitude"
              label="Latitude"
              step="any"
              min={-90}
              max={90}
              value={values.latitude}
              onChange={(event) => set("latitude", event.target.value)}
              error={fieldErrors.latitude}
            />
            <NumberInput
              id="destination-longitude"
              label="Longitude"
              step="any"
              min={-180}
              max={180}
              value={values.longitude}
              onChange={(event) => set("longitude", event.target.value)}
              error={fieldErrors.longitude}
            />
          </div>

          {halfPlaced && (
            <p role="alert" className="text-[0.75rem] text-error-text">
              Give both coordinates, or clear them both.
            </p>
          )}

          {clearingPlacement && (
            <p className="text-[0.75rem] leading-relaxed text-warning-text">
              A pin cannot be removed once it is set — saving now leaves the stored coordinates
              where they are. Move it instead.
            </p>
          )}

          {parent && !isCountry && (
            <p className="text-[0.75rem] leading-relaxed text-subtle">
              Filed under <span className="font-medium text-body">{parent.name}</span>, at{" "}
              <span className="font-mono">{`${parent.path}/${values.slug || "…"}`}</span>
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <h3 className="text-[0.9375rem] font-semibold text-ink">Editorial</h3>
        <p className="mt-1 max-w-2xl text-[0.8125rem] leading-relaxed text-muted">
          Optional throughout. None of it holds up a hotel being filed here — it is the copy and
          artwork a destination carries for anywhere that lists places rather than properties.
        </p>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <TextInput
            id="destination-tagline"
            label="Tagline"
            maxLength={200}
            value={values.tagline}
            onChange={(event) => set("tagline", event.target.value)}
            placeholder="Georgia’s winter capital"
            error={fieldErrors.tagline}
            hint="One editorial line, used over cover images."
          />

          <TextArea
            id="destination-summary"
            label="Summary"
            rows={2}
            maxLength={500}
            value={values.summary}
            onChange={(event) => set("summary", event.target.value)}
            error={fieldErrors.summary}
            hint="A sentence for cards and page metadata."
          />

          <TextInput
            id="destination-cover"
            label="Cover image"
            mono
            value={values.coverImage}
            onChange={(event) => set("coverImage", event.target.value)}
            placeholder="/images/destinations/bakuriani-cover.jpg"
            error={fieldErrors.coverImage}
            hint="The portrait crop. A path or an absolute URL — destination artwork sits outside the hotel media pipeline."
          />

          <TextInput
            id="destination-hero"
            label="Hero image"
            mono
            value={values.heroImage}
            onChange={(event) => set("heroImage", event.target.value)}
            placeholder="/images/destinations/bakuriani-hero.jpg"
            error={fieldErrors.heroImage}
            hint="The wide crop, for the top of a destination page."
          />

          <LineListInput
            label="Description"
            rows={6}
            value={values.description}
            onChange={(next) => set("description", next)}
            error={fieldErrors.description}
            placeholder={"One paragraph per line.\nBlank lines are dropped."}
            hint="One paragraph per line."
          />

          <LineListInput
            label="Ideal for"
            rows={6}
            value={values.idealFor}
            onChange={(next) => set("idealFor", next)}
            error={fieldErrors.idealFor}
            placeholder={"Skiers\nFamilies\nWinter weekends"}
            hint="One per line. Short phrases rather than sentences."
          />
        </div>
      </div>

      <FormError message={error} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SubmitButton type="submit" busy={busy} saved={saved} disabled={!ready}>
          {editing
            ? busy
              ? "Saving…"
              : saved
                ? "Saved"
                : "Save destination"
            : busy
              ? "Creating…"
              : "Create destination"}
        </SubmitButton>

        {!ready && (
          <p className="text-[0.75rem] text-subtle">
            {isCountry
              ? "A name, a slug and a two-letter country code are the minimum."
              : "A name, a slug and somewhere to sit are the minimum."}
          </p>
        )}
      </div>
    </form>
  );
}
