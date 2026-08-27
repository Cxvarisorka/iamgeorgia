"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { useI18n, useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Which product a reference belongs to, from its prefix.
 *
 * `BKG-` is a hotel stay and `TRF-` is a transfer. They are separate records
 * with separate endpoints and separate pages, so the form has to decide where
 * to send somebody before it sends them — a single lookup page that had to try
 * both and see which answered would be a page that 404s half the time on the
 * way to succeeding.
 *
 * Anything else goes to the hotel page, which is where an unrecognised
 * reference gets its "we could not find that" message.
 */
const destinationFor = (reference: string, email: string) =>
  reference.toUpperCase().startsWith("TRF-")
    ? `/transfers/confirmation/${encodeURIComponent(reference)}?email=${encodeURIComponent(email)}`
    : `/booking/manage/${encodeURIComponent(reference)}?email=${encodeURIComponent(email)}`;

interface BookingLookupFormProps {
  /** Prefilled when the visitor arrived from a link that already knew them. */
  reference?: string;
  email?: string;
  /** Shown when a lookup came back empty, so the form is where the answer is. */
  notFound?: boolean;
}

/**
 * Finding a booking without an account.
 *
 * Both fields, always. A reference comes from a sequence and is trivially
 * enumerable, so on its own it is an identifier and not a credential — the
 * email is what makes the pair proof. The server takes the same view
 * (`guestLookupSchema`); asking for both here simply avoids a pointless
 * round trip to be told so.
 */
export function BookingLookupForm({ reference = "", email = "", notFound }: BookingLookupFormProps) {
  const router = useRouter();
  const path = useLocalePath();
  const { t } = useI18n();

  const [values, setValues] = useState({ reference, email });
  const [errors, setErrors] = useState<{ reference?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  const submit = () => {
    const next: typeof errors = {};

    if (!values.reference.trim()) next.reference = t.booking.checkout.required;
    if (!values.email.trim()) next.email = t.booking.checkout.required;
    else if (!EMAIL.test(values.email.trim())) next.email = t.booking.checkout.invalidEmail;

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSubmitting(true);
    router.push(path(destinationFor(values.reference.trim(), values.email.trim())));
  };

  const inputClass =
    "h-11 w-full rounded-sm border border-line bg-background px-3 text-sm text-ink focus:border-ink focus:outline-none";

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      className="max-w-xl"
    >
      {notFound && (
        <p
          role="alert"
          className="mb-6 rounded-sm border border-error/30 bg-error/5 px-4 py-3 text-sm text-error-text"
        >
          {t.booking.manage.notFoundBody}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="type-caption mb-1.5 block text-muted">{t.booking.manage.reference}</span>
          <input
            value={values.reference}
            placeholder={t.booking.manage.referencePlaceholder}
            autoComplete="off"
            aria-invalid={Boolean(errors.reference)}
            onChange={(event) =>
              setValues((current) => ({ ...current, reference: event.target.value }))
            }
            className={cn(inputClass, errors.reference && "border-error")}
          />
          {errors.reference && (
            <span role="alert" className="type-caption mt-1 block text-error-text">
              {errors.reference}
            </span>
          )}
        </label>

        <label className="block">
          <span className="type-caption mb-1.5 block text-muted">{t.booking.manage.email}</span>
          <input
            type="email"
            value={values.email}
            autoComplete="email"
            aria-invalid={Boolean(errors.email)}
            onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
            className={cn(inputClass, errors.email && "border-error")}
          />
          {errors.email && (
            <span role="alert" className="type-caption mt-1 block text-error-text">
              {errors.email}
            </span>
          )}
        </label>
      </div>

      <Button type="submit" size="lg" className="mt-6" disabled={submitting}>
        <Search size={17} aria-hidden />
        {submitting ? t.booking.manage.finding : t.booking.manage.find}
      </Button>
    </form>
  );
}
