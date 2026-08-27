"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useState } from "react";

import { CheckboxField, FormError, NumberInput, SelectInput, SubmitButton, TextArea, TextInput } from "./FormControls";
import { ApiError, describeError } from "@/lib/api/client";
import { createTransferRoute } from "@/lib/api/transfers";
import { categoryOptions, slugify, tierOptions } from "@/lib/admin/transfers";
import { useLocalePath } from "@/lib/i18n/provider";
import type {
  TransferPoint,
  TransferRouteCategory,
  TransferRouteTier,
} from "@/types/transfer";

/**
 * A new route.
 *
 * A route is a named journey between two points, and almost everything about
 * it follows from that pair. Distance and journey time are seeded from the
 * coordinates on the server, so this form leaves them blank by default and
 * says so — an operator who knows the road can override, and one who does not
 * gets a route that is immediately quotable rather than a route that is not.
 *
 * It is created as a DRAFT with no fares. That is deliberate and it is the
 * whole shape of this screen: a route with no prices falls back to the
 * distance engine, which is a worse quote than a curated one, so the next
 * screen is the price grid and the publish checklist refuses to let it go live
 * until that grid has something in it.
 */
export function NewTransferRouteForm({ points }: { points: TransferPoint[] }) {
  const router = useRouter();
  const path = useLocalePath();

  const [fromPointId, setFromPointId] = useState("");
  const [toPointId, setToPointId] = useState("");
  const [tier, setTier] = useState<TransferRouteTier>("TIER_3");
  const [category, setCategory] = useState<TransferRouteCategory>("CITY");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [distanceKm, setDistanceKm] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("");
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [featured, setFeatured] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const from = points.find((point) => point.id === fromPointId);
  const to = points.find((point) => point.id === toPointId);

  /**
   * Choosing an end, and what follows from it.
   *
   * Both consequences — the slug and the category — are computed here rather
   * than in an effect watching the two ids. They are a reaction to a choice
   * somebody made, not a synchronisation with anything outside React, and
   * doing it in the handler means one render per selection instead of two.
   *
   * The slug follows the pair until somebody takes it over, and an airport at
   * either end guesses the AIRPORT category — that is the one that carries the
   * airport fee and the flight-tracking copy. Both are defaults, and both
   * stay editable.
   */
  const chooseEnd = (end: "from" | "to", id: string) => {
    const nextFrom = end === "from" ? points.find((point) => point.id === id) : from;
    const nextTo = end === "to" ? points.find((point) => point.id === id) : to;

    if (end === "from") setFromPointId(id);
    else setToPointId(id);

    if (!nextFrom || !nextTo) return;

    if (!slugTouched) setSlug(slugify(`${nextFrom.name}-to-${nextTo.name}`));
    if (nextFrom.kind === "AIRPORT" || nextTo.kind === "AIRPORT") setCategory("AIRPORT");
  };

  const sameEnds = Boolean(fromPointId) && fromPointId === toPointId;
  const ready = Boolean(fromPointId && toPointId && slug.trim()) && !sameEnds;

  const options = points.map((point) => ({
    value: point.id,
    label: `${point.name} — ${point.region}`,
  }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    const distance = Number.parseInt(distanceKm, 10);
    const duration = Number.parseInt(durationMinutes, 10);

    try {
      const created = await createTransferRoute({
        slug: slug.trim(),
        fromPointId,
        toPointId,
        tier,
        category,
        // Omitted rather than zeroed when blank: the server seeds both from the
        // coordinates, and a zero would be an assertion that the journey is
        // instant.
        ...(Number.isFinite(distance) && distance > 0 ? { distanceKm: distance } : {}),
        ...(Number.isFinite(duration) && duration > 0 ? { durationMinutes: duration } : {}),
        ...(title.trim() ? { title: title.trim() } : {}),
        ...(summary.trim() ? { summary: summary.trim() } : {}),
        featured,
      });

      router.push(path(`/admin/transfers/routes/${created.id}`));
      router.refresh();
      // Left busy: the navigation is in flight, and the slug is unique.
      return;
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.fieldErrors());
      setError(describeError(caught));
      setBusy(false);
    }
  };

  if (points.length < 2) {
    return (
      <p className="rounded-sm border border-warning/40 bg-warning/5 p-4 text-[0.875rem] leading-relaxed text-warning-text">
        A route joins two pick-up points, and there are fewer than two on file. Add the places
        first — the route is the journey between them.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend className="sr-only">The journey</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">The journey</p>
        <p className="mt-1 text-[0.75rem] text-subtle">
          Both ends are pick-up points. Everything else follows from the pair.
        </p>

        <div className="mt-4 grid items-end gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <SelectInput
            id="route-from"
            label="Pick-up"
            required
            value={fromPointId}
            onChange={(event) => chooseEnd("from", event.target.value)}
            options={options}
            placeholder="Choose a place…"
            error={fieldErrors.fromPointId}
          />

          <ArrowRight
            size={16}
            className="mb-3 hidden self-center text-subtle sm:block rtl:-scale-x-100"
            aria-hidden
          />

          <SelectInput
            id="route-to"
            label="Drop-off"
            required
            value={toPointId}
            onChange={(event) => chooseEnd("to", event.target.value)}
            options={options}
            placeholder="Choose a place…"
            error={fieldErrors.toPointId}
          />
        </div>

        {sameEnds && (
          <p role="alert" className="mt-3 text-[0.8125rem] text-error-text">
            A route has to start and end in different places.
          </p>
        )}
      </fieldset>

      <div className="mt-6 grid gap-5 border-t border-line pt-5 sm:grid-cols-2">
        <SelectInput
          id="route-tier"
          label="Sales tier"
          value={tier}
          onChange={(event) => setTier(event.target.value as TransferRouteTier)}
          options={tierOptions}
          error={fieldErrors.tier}
          hint="Tier 1 is the handful of journeys the business runs on, and the only ones shown on the landing page."
        />

        <SelectInput
          id="route-category"
          label="Category"
          value={category}
          onChange={(event) => setCategory(event.target.value as TransferRouteCategory)}
          options={categoryOptions}
          error={fieldErrors.category}
          hint="Guessed from the two ends. Airport transfers carry the airport fee."
        />
      </div>

      <div className="mt-5">
        <TextInput
          id="route-slug"
          label="Slug"
          required
          mono
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(slugify(event.target.value));
          }}
          error={fieldErrors.slug}
          hint="Part of the public URL, and fixed once the route exists. Derived from the two ends until you edit it."
        />
      </div>

      <fieldset className="mt-6 border-t border-line pt-5">
        <legend className="sr-only">Distance and time</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">Distance and time</p>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          Leave both blank and the server works them out from the coordinates, which is right often
          enough that overriding is for roads you know are worse than the map suggests.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <NumberInput
            id="route-distance"
            label="Distance (km)"
            min={1}
            max={5000}
            step={1}
            value={distanceKm}
            onChange={(event) => setDistanceKm(event.target.value)}
            placeholder="From the coordinates"
            error={fieldErrors.distanceKm}
          />
          <NumberInput
            id="route-duration"
            label="Journey time (minutes)"
            min={1}
            max={10000}
            step={1}
            value={durationMinutes}
            onChange={(event) => setDurationMinutes(event.target.value)}
            placeholder="From the coordinates"
            error={fieldErrors.durationMinutes}
          />
        </div>
      </fieldset>

      <fieldset className="mt-6 space-y-5 border-t border-line pt-5">
        <legend className="sr-only">Landing page copy</legend>
        <p className="text-[0.8125rem] font-semibold text-ink">Landing page copy</p>
        <p className="-mt-4 text-[0.75rem] text-subtle">
          Optional now. A generated heading covers a Tier 3 route; a Tier 1 one deserves writing
          properly, and that can happen on the route&rsquo;s own page.
        </p>

        <TextInput
          id="route-title"
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={from && to ? `${from.name} to ${to.name}` : "Tbilisi to Kazbegi"}
          error={fieldErrors.title}
        />

        <TextArea
          id="route-summary"
          label="Summary"
          rows={2}
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          error={fieldErrors.summary}
          hint="One or two sentences. Used as the meta description and under the heading."
        />

        <CheckboxField
          label="Show on the transfers landing page"
          hint="Only Tier 1 routes appear there."
          checked={featured}
          onChange={setFeatured}
        />
      </fieldset>

      <FormError message={error} />

      <div className="mt-6 flex items-center gap-3">
        <SubmitButton type="submit" busy={busy} disabled={!ready}>
          {busy ? "Creating…" : "Create draft route"}
        </SubmitButton>

        <p className="text-[0.75rem] text-subtle">
          Created as a draft with no fares. Pricing is the next screen.
        </p>
      </div>
    </form>
  );
}
