"use client";

import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Info } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/Button";
import { getTransferLocation } from "@/data/transferLocations";
import { fill } from "@/lib/i18n/dictionaries";
import { useI18n, useLocalePath } from "@/lib/i18n/provider";
import { createReference, saveBookingDraft } from "@/lib/transfers/booking";
import { serializeTransferQuery, type TransferQuery } from "@/lib/transfers/query";
import { cn } from "@/lib/utils";
import type { TransferOffer } from "@/types";

interface FormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  flightNumber: string;
  pickupNote: string;
  specialRequests: string;
}

/**
 * Validation produces keys into `t.transfers.booking.errors`, not sentences,
 * so the rules stay in one place while the wording follows the reader.
 */
type ErrorKey = "firstName" | "lastName" | "email" | "phone";
type Errors = Partial<Record<ErrorKey, ErrorKey>>;

const initialValues: FormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  flightNumber: "",
  pickupNote: "",
  specialRequests: "",
};

interface TransferBookingFormProps {
  offer: TransferOffer;
  query: TransferQuery;
}

/**
 * Checkout — passenger details only.
 *
 * Front-end only, and there is no payment step by design: nothing is sent,
 * charged or stored anywhere but this tab. On submit the draft goes into
 * `sessionStorage` and the flow moves to the confirmation screen.
 */
export function TransferBookingForm({ offer, query }: TransferBookingFormProps) {
  const router = useRouter();
  const path = useLocalePath();
  const { t, locale } = useI18n();
  const [values, setValues] = useState<FormValues>(initialValues);
  const [errors, setErrors] = useState<Errors>({});

  const from = getTransferLocation(query.from, locale);
  const to = getTransferLocation(query.to, locale);
  const fromAirport = from?.type === "airport";

  const messageFor = (key?: ErrorKey) => (key ? t.transfers.booking.errors[key] : undefined);

  const validate = (candidate: FormValues): Errors => {
    const next: Errors = {};
    if (candidate.firstName.trim().length < 2) next.firstName = "firstName";
    if (candidate.lastName.trim().length < 2) next.lastName = "lastName";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) next.email = "email";
    // Deliberately loose: international numbers vary far too much to pattern-match
    // strictly, and rejecting a valid number is worse than accepting a typo.
    if (candidate.phone.replace(/[^\d]/g, "").length < 7) next.phone = "phone";
    return next;
  };

  /**
   * Re-validates on every keystroke but only ever *removes* messages, so an
   * error clears the moment the field is genuinely valid and never appears
   * before the traveller has had a chance to finish typing. Same rule as the
   * search form, so both behave identically.
   */
  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    setErrors((current) => {
      const stillInvalid = validate(next);
      const remaining: Errors = {};
      for (const errorKey of Object.keys(current) as ErrorKey[]) {
        if (stillInvalid[errorKey]) remaining[errorKey] = stillInvalid[errorKey];
      }
      return remaining;
    });
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const reference = createReference();
    saveBookingDraft({
      reference,
      ...values,
      offerSlug: offer.slug,
      createdAt: new Date().toISOString(),
    });

    router.push(
      `${path("/transfers/confirmation")}?${serializeTransferQuery(query, {
        offer: offer.slug,
        ref: reference,
      })}`,
    );
  };

  const fieldClass =
    "h-12 w-full rounded-sm border bg-surface px-3.5 text-sm text-ink transition-colors focus:outline-none";
  const labelClass = "type-caption mb-1.5 block text-muted";
  const errorCount = Object.keys(errors).length;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <section aria-labelledby="passenger-details">
        <h2 id="passenger-details" className="type-h3">
          {t.transfers.booking.leadPassenger}
        </h2>
        <p className="type-body-sm mt-2 text-muted">
          {t.transfers.booking.leadPassengerBody}
        </p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <Field
            id="firstName"
            label={t.transfers.booking.firstName}
            required
            requiredLabel={t.transfers.booking.required}
            error={messageFor(errors.firstName)}
            labelClass={labelClass}
          >
            <input
              id="firstName"
              autoComplete="given-name"
              value={values.firstName}
              onChange={(event) => set("firstName", event.target.value)}
              aria-invalid={Boolean(errors.firstName)}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
              className={cn(
                fieldClass,
                errors.firstName ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field
            id="lastName"
            label={t.transfers.booking.lastName}
            required
            requiredLabel={t.transfers.booking.required}
            error={messageFor(errors.lastName)}
            labelClass={labelClass}
          >
            <input
              id="lastName"
              autoComplete="family-name"
              value={values.lastName}
              onChange={(event) => set("lastName", event.target.value)}
              aria-invalid={Boolean(errors.lastName)}
              aria-describedby={errors.lastName ? "lastName-error" : undefined}
              className={cn(
                fieldClass,
                errors.lastName ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field
            id="email"
            label={t.transfers.booking.email}
            required
            requiredLabel={t.transfers.booking.required}
            error={messageFor(errors.email)}
            labelClass={labelClass}
          >
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={cn(
                fieldClass,
                errors.email ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field
            id="phone"
            label={t.transfers.booking.mobile}
            required
            requiredLabel={t.transfers.booking.required}
            error={messageFor(errors.phone)}
            hint={t.transfers.booking.mobileHint}
            labelClass={labelClass}
          >
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder={t.transfers.booking.phonePlaceholder}
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={
                errors.phone ? "phone-error" : "phone-hint"
              }
              className={cn(
                fieldClass,
                errors.phone ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>
        </div>
      </section>

      <section aria-labelledby="pickup-details" className="mt-12 border-t border-line pt-10">
        <h2 id="pickup-details" className="type-h3">
          {t.transfers.booking.pickUpSection}
        </h2>

        <dl className="mt-6 divide-y divide-line border-y border-line">
          <div className="flex items-baseline justify-between gap-6 py-3.5">
            <dt className="type-body-sm text-muted">{t.transfers.booking.pickUpLocation}</dt>
            <dd className="type-body-sm text-end font-medium text-ink">{from?.name ?? "—"}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-3.5">
            <dt className="type-body-sm text-muted">{t.transfers.booking.dateAndTime}</dt>
            <dd className="type-body-sm text-end font-medium text-ink">
              {query.date || "—"} · {query.time || "—"}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-6 py-3.5">
            <dt className="type-body-sm text-muted">{t.transfers.booking.dropOffLocation}</dt>
            <dd className="type-body-sm text-end font-medium text-ink">{to?.name ?? "—"}</dd>
          </div>
        </dl>

        <p className="type-caption mt-3 text-subtle">{t.transfers.booking.changeNote}</p>

        <div className="mt-6 grid gap-5">
          {fromAirport && (
            <div>
              <label htmlFor="flightNumber" className={labelClass}>
                {t.transfers.booking.flightNumber}
              </label>
              <input
                id="flightNumber"
                placeholder={t.transfers.booking.flightPlaceholder}
                value={values.flightNumber}
                onChange={(event) => set("flightNumber", event.target.value)}
                aria-describedby="flightNumber-hint"
                className={cn(fieldClass, "border-line focus:border-ink")}
              />
              <p id="flightNumber-hint" className="type-caption mt-1.5 text-subtle">
                {t.transfers.booking.flightHint}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="pickupNote" className={labelClass}>
              {t.transfers.booking.pickupNote}
            </label>
            <input
              id="pickupNote"
              placeholder={t.transfers.booking.pickupNotePlaceholder}
              value={values.pickupNote}
              onChange={(event) => set("pickupNote", event.target.value)}
              className={cn(fieldClass, "border-line focus:border-ink")}
            />
          </div>
        </div>
      </section>

      <section aria-labelledby="requests" className="mt-12 border-t border-line pt-10">
        <h2 id="requests" className="type-h3">
          {t.transfers.booking.requests}
        </h2>
        <p className="type-body-sm mt-2 text-muted">{t.transfers.booking.requestsBody}</p>
        <textarea
          id="specialRequests"
          rows={4}
          value={values.specialRequests}
          onChange={(event) => set("specialRequests", event.target.value)}
          aria-label={t.transfers.booking.requests}
          placeholder={t.transfers.booking.requestsPlaceholder}
          className="mt-5 w-full rounded-sm border border-line bg-surface p-3.5 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
        />
      </section>

      <p className="type-caption mt-8 flex items-start gap-2.5 rounded-sm bg-surface-soft p-4 text-body">
        <Info size={15} className="mt-px shrink-0 text-brand-text" aria-hidden />
        {t.transfers.booking.prototypeNote}
      </p>

      {errorCount > 0 && (
        <p
          role="alert"
          className="type-body-sm mt-6 flex items-start gap-2.5 rounded-sm border border-error/40 bg-surface px-4 py-3 text-error-text"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {errorCount === 1
            ? t.transfers.booking.errorOne
            : fill(t.transfers.booking.errorMany, { count: errorCount })}
        </p>
      )}

      <Button type="submit" size="lg" fullWidth className="mt-6">
        {t.transfers.booking.submit}
      </Button>
    </form>
  );
}

/** Label, control and animated error message, so every field reads identically. */
function Field({
  id,
  label,
  required,
  requiredLabel,
  error,
  hint,
  labelClass,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  /** Announced instead of the asterisk, which reads as punctuation. */
  requiredLabel?: string;
  error?: string;
  hint?: string;
  labelClass: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {required && (
          <>
            {" "}
            <span aria-hidden>*</span>
            <span className="sr-only">{requiredLabel}</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="type-caption mt-1.5 text-subtle">
          {hint}
        </p>
      )}
      <AnimatePresence>
        {error && (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="type-caption overflow-hidden text-error-text"
          >
            <span className="block pt-1.5">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
