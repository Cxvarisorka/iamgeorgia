"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createHotel } from "@/lib/api/hotels";
import { ApiError, describeError } from "@/lib/api/client";
import { PROPERTY_TYPES } from "@/lib/admin/hotels";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { DestinationNode, PropertyType } from "@/types/catalogue";
import type { PartnerSummary } from "@/types/partner";

/**
 * Creates a DRAFT property and moves to its page.
 *
 * The slug is derived from the name as it is typed but stays editable — it is
 * part of a public URL forever, so it deserves a human eye before it is set.
 * Server validation errors land back on their fields via `fieldErrors()`.
 */

/** The tree flattened for a <select>, indented by depth. */
const flatten = (nodes: DestinationNode[], depth = 0): { id: string; label: string }[] =>
  nodes.flatMap((node) => [
    { id: node.id, label: `${" ".repeat(depth * 3)}${node.name}` },
    ...flatten(node.children, depth + 1),
  ]);

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function NewHotelForm({
  destinations,
  suppliers,
}: {
  destinations: DestinationNode[];
  suppliers: PartnerSummary[];
}) {
  const router = useRouter();
  const localePath = useLocalePath();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [propertyType, setPropertyType] = useState<PropertyType>("Hotel");
  const [destinationId, setDestinationId] = useState("");
  const [starRating, setStarRating] = useState(4);
  const [supplierId, setSupplierId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const options = flatten(destinations);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const hotel = await createHotel({
        name: name.trim(),
        slug: slug.trim(),
        propertyType,
        destinationId,
        starRating,
        supplierId: supplierId || null,
      });

      router.push(localePath(`/admin/hotels/${hotel.id}`));
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.fieldErrors());
      setError(describeError(caught));
      setBusy(false);
    }
  };

  const field =
    "mt-1 h-10 w-full rounded-sm border border-line bg-surface px-3 text-[0.875rem] text-ink outline-none focus:border-ink";
  const label = "block text-[0.8125rem] font-medium text-ink";
  const errorText = (key: string) =>
    fieldErrors[key] && <p className="mt-1 text-[0.75rem] text-error-text">{fieldErrors[key]}</p>;

  return (
    <form onSubmit={submit} className="rounded-sm border border-line bg-surface p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={label} htmlFor="hotel-name">
            Property name
          </label>
          <input
            id="hotel-name"
            required
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              if (!slugTouched) setSlug(slugify(event.target.value));
            }}
            className={field}
          />
          {errorText("name")}
        </div>

        <div className="sm:col-span-2">
          <label className={label} htmlFor="hotel-slug">
            Slug
          </label>
          <input
            id="hotel-slug"
            required
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(slugify(event.target.value));
            }}
            className={cn(field, "font-mono text-[0.8125rem]")}
          />
          <p className="mt-1 text-[0.75rem] text-muted">
            Part of the public URL. Lowercase letters, numbers and hyphens.
          </p>
          {errorText("slug")}
        </div>

        <div>
          <label className={label} htmlFor="hotel-type">
            Property type
          </label>
          <select
            id="hotel-type"
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value as PropertyType)}
            className={field}
          >
            {PROPERTY_TYPES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="hotel-stars">
            Official star rating
          </label>
          <select
            id="hotel-stars"
            value={starRating}
            onChange={(event) => setStarRating(Number(event.target.value))}
            className={field}
          >
            {[1, 2, 3, 4, 5].map((stars) => (
              <option key={stars} value={stars}>
                {"★".repeat(stars)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={label} htmlFor="hotel-destination">
            Destination
          </label>
          <select
            id="hotel-destination"
            required
            value={destinationId}
            onChange={(event) => setDestinationId(event.target.value)}
            className={field}
          >
            <option value="" disabled>
              Choose…
            </option>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[0.75rem] text-muted">
            Country and time zone are inherited from it.
          </p>
          {errorText("destinationId")}
        </div>

        <div>
          <label className={label} htmlFor="hotel-supplier">
            Supplier
          </label>
          <select
            id="hotel-supplier"
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className={field}
          >
            <option value="">Platform-managed</option>
            {suppliers.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[0.75rem] text-muted">
            The partner that owns this property, if any.
          </p>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-5 text-[0.8125rem] text-error-text">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !destinationId}
        className="mt-6 inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-5 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50"
      >
        {busy && <Loader2 size={15} className="animate-spin" aria-hidden />}
        Create draft
      </button>
    </form>
  );
}
