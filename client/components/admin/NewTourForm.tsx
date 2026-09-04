"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

import { FormError, NumberInput, SelectInput, TextArea, TextInput } from "./FormControls";
import { createTour } from "@/lib/api/tours";
import { ApiError, describeError } from "@/lib/api/client";
import { TOUR_CATEGORIES, categoryLabel } from "@/lib/admin/tours";
import { useLocalePath } from "@/lib/i18n/provider";
import type { DestinationNode } from "@/types/catalogue";
import type { PartnerSummary } from "@/types/partner";
import type { Difficulty, TourCategory } from "@/types/tour";

/**
 * Creates a DRAFT tour and moves to its page.
 *
 * Only what the server insists on before it will make a record: the rest —
 * itinerary, options, price sheets, departures, images — is filled in on the
 * tour page, whose publish checklist walks the operator through it.
 */

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

const DIFFICULTIES: Difficulty[] = ["Easy", "Moderate", "Challenging"];

export function NewTourForm({
  destinations,
  suppliers,
}: {
  destinations: DestinationNode[];
  suppliers: PartnerSummary[];
}) {
  const router = useRouter();
  const localePath = useLocalePath();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [location, setLocation] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [category, setCategory] = useState<TourCategory>("culture");
  const [difficulty, setDifficulty] = useState<Difficulty>("Easy");
  const [durationDays, setDurationDays] = useState(1);
  const [durationLabel, setDurationLabel] = useState("1 day");
  const [groupSize, setGroupSize] = useState("2–8 travellers");
  const [summary, setSummary] = useState("");
  const [meetingPoint, setMeetingPoint] = useState("");
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
      const tour = await createTour({
        title: title.trim(),
        slug: slug.trim(),
        location: location.trim(),
        destinationId,
        category,
        difficulty,
        durationDays,
        durationLabel: durationLabel.trim(),
        groupSize: groupSize.trim(),
        summary: summary.trim(),
        meetingPoint: meetingPoint.trim(),
        supplierId: supplierId || null,
      });

      router.push(localePath(`/admin/tours/${tour.id}`));
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.fieldErrors());
      setError(describeError(caught));
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-sm border border-line bg-surface p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextInput
          className="sm:col-span-2"
          label="Title"
          required
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (!slugTouched) setSlug(slugify(event.target.value));
          }}
          error={fieldErrors.title}
        />
        <TextInput
          className="sm:col-span-2"
          label="Slug"
          mono
          required
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugify(event.target.value));
          }}
          hint="Part of the public URL. Lowercase letters, numbers and hyphens."
          error={fieldErrors.slug}
        />
        <TextInput
          label="Region"
          required
          value={location}
          onChange={(event) => setLocation(event.target.value)}
          hint="As a traveller would say it — “Kazbegi, Khevi”."
          error={fieldErrors.location}
        />
        <SelectInput
          label="Destination"
          required
          value={destinationId}
          onChange={(event) => setDestinationId(event.target.value)}
          placeholder="Choose…"
          options={options.map((option) => ({ value: option.id, label: option.label }))}
          hint="Time zone is inherited from it."
          error={fieldErrors.destinationId}
        />
        <SelectInput
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value as TourCategory)}
          options={TOUR_CATEGORIES.map((value) => ({ value, label: categoryLabel(value) }))}
        />
        <SelectInput
          label="Difficulty"
          value={difficulty}
          onChange={(event) => setDifficulty(event.target.value as Difficulty)}
          options={DIFFICULTIES.map((value) => ({ value, label: value }))}
        />
        <NumberInput
          label="Length in days"
          min={1}
          max={60}
          required
          value={durationDays}
          onChange={(event) => {
            const days = Number(event.target.value) || 1;
            setDurationDays(days);
            setDurationLabel(days === 1 ? "1 day" : `${days} days · ${days - 1} nights`);
          }}
          error={fieldErrors.durationDays}
        />
        <TextInput
          label="Length as a traveller reads it"
          required
          value={durationLabel}
          onChange={(event) => setDurationLabel(event.target.value)}
          error={fieldErrors.durationLabel}
        />
        <TextInput
          label="Group size"
          required
          value={groupSize}
          onChange={(event) => setGroupSize(event.target.value)}
          hint="Prose for the card, e.g. “2–8 travellers”. Capacity is set per option."
          error={fieldErrors.groupSize}
        />
        <SelectInput
          label="Supplier"
          value={supplierId}
          onChange={(event) => setSupplierId(event.target.value)}
          options={[
            { value: "", label: "Platform-operated" },
            ...suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name })),
          ]}
          hint="The tour operator that runs it, if any."
        />
        <TextArea
          className="sm:col-span-2"
          label="Summary"
          required
          rows={3}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          hint="One or two sentences. Shown on cards and search results."
          error={fieldErrors.summary}
        />
        <TextInput
          className="sm:col-span-2"
          label="Meeting point"
          required
          value={meetingPoint}
          onChange={(event) => setMeetingPoint(event.target.value)}
          error={fieldErrors.meetingPoint}
        />
      </div>

      <FormError message={error} />

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
