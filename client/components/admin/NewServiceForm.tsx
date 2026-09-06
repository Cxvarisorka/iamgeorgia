"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormError, SubmitButton } from "./FormControls";
import {
  ServiceFields,
  emptyServiceValues,
  serviceValuesError,
  serviceValuesToBody,
  type ServiceValues,
} from "./ServiceFields";
import { ApiError, describeError } from "@/lib/api/client";
import { createService } from "@/lib/api/services";
import { slugify } from "@/lib/admin/geography";
import { useLocalePath } from "@/lib/i18n/provider";
import type { CancellationPolicy, DestinationNode } from "@/types/catalogue";
import type { PartnerSummary } from "@/types/partner";

/**
 * A new service, created from the register.
 *
 * The whole record at once rather than a wizard, because there is no second
 * screen to go to: a service has no inventory, no departures and no images, so
 * everything it owns is on this one form. It is created DRAFT and the editor
 * it lands on carries the publish checklist.
 *
 * The fields and the reasoning behind each group are in `ServiceFields`,
 * shared with the editor so a field cannot exist on one screen and not the
 * other.
 */
export function NewServiceForm({
  destinations,
  suppliers,
  policies,
  onCancel,
}: {
  destinations: DestinationNode[];
  suppliers: PartnerSummary[];
  policies: CancellationPolicy[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const path = useLocalePath();

  const [values, setValues] = useState<ServiceValues>(emptyServiceValues);
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = <K extends keyof ServiceValues>(key: K, value: ServiceValues[K]) => {
    if (key === "slug") setSlugTouched(true);

    // The slug follows the name until somebody takes it over, the same
    // arrangement the hotel, tour and vehicle forms use.
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "name" && !slugTouched ? { slug: slugify(String(value)) } : {}),
    }));
  };

  const ready =
    values.name.trim().length > 0 &&
    values.slug.trim().length > 0 &&
    values.summary.trim().length > 0 &&
    values.cancellationPolicyId.length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();

    const problem = serviceValuesError(values);

    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const created = await createService(serviceValuesToBody(values));

      router.push(path(`/admin/services/${created.id}`));
      router.refresh();
      // Left busy on purpose: the navigation is in flight, and re-enabling the
      // button is an invitation to create the service twice.
      return;
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.fieldErrors());
      setError(describeError(caught, "Could not create the service."));
      setBusy(false);
    }
  };

  if (policies.length === 0) {
    return (
      <p className="rounded-sm border border-warning/40 bg-warning/5 p-4 text-[0.875rem] leading-relaxed text-warning-text">
        There are no usable cancellation templates on file, and every service needs one before it
        can be created. Add a platform template with percent-of-total or fixed-amount rules first.
      </p>
    );
  }

  return (
    <form onSubmit={submit}>
      <ServiceFields
        values={values}
        onChange={set}
        destinations={destinations}
        suppliers={suppliers}
        policies={policies}
        fieldErrors={fieldErrors}
      />

      <FormError message={error} />

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <SubmitButton type="submit" busy={busy} disabled={!ready}>
          {busy ? "Creating…" : "Create draft"}
        </SubmitButton>

        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="inline-flex h-10 items-center rounded-sm border border-line bg-surface px-4 text-[0.8125rem] font-medium text-body transition-colors hover:border-ink/40 hover:text-ink disabled:opacity-60"
        >
          Cancel
        </button>

        {!ready && (
          <p className="text-[0.75rem] text-subtle">
            A name, a slug, a summary and cancellation terms are the minimum.
          </p>
        )}
      </div>
    </form>
  );
}
