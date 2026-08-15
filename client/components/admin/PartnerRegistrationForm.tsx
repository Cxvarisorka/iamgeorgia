"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, Check, Info, Loader2, Upload } from "lucide-react";
import { useState } from "react";

import { partnerKindLabels, requiredDocuments } from "@/data/admin/partners";
import { useLocalePath } from "@/lib/i18n/provider";
import { cn } from "@/lib/utils";
import type { PartnerKind } from "@/types";

interface Values {
  name: string;
  legalName: string;
  kind: PartnerKind;
  taxId: string;
  city: string;
  website: string;
  contactName: string;
  email: string;
  phone: string;
  commissionRate: string;
  notes: string;
}

type ErrorKey = "name" | "legalName" | "taxId" | "city" | "contactName" | "email" | "phone";
type Errors = Partial<Record<ErrorKey, string>>;

const initialValues: Values = {
  name: "",
  legalName: "",
  kind: "hotel",
  taxId: "",
  city: "",
  website: "",
  contactName: "",
  email: "",
  phone: "",
  commissionRate: "15",
  notes: "",
};

/**
 * Partner registration.
 *
 * The form an operator fills in when a supplier comes on board, laid out in
 * the order the conversation actually happens: who they are, who we call, what
 * we agreed, what paperwork we still need. Validation is front-end only, and
 * submitting adds nothing to the register — it shows the confirmation an
 * operator would get and stops there.
 */
export function PartnerRegistrationForm() {
  const path = useLocalePath();
  const [values, setValues] = useState<Values>(initialValues);
  const [documents, setDocuments] = useState<string[]>([]);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validate = (candidate: Values): Errors => {
    const next: Errors = {};
    if (candidate.name.trim().length < 2) next.name = "Enter the trading name.";
    if (candidate.legalName.trim().length < 2) {
      next.legalName = "Enter the registered legal entity.";
    }
    // Georgian TINs are nine digits; spaces are allowed for readability.
    if (candidate.taxId.replace(/\D/g, "").length !== 9) {
      next.taxId = "A Georgian tax number is nine digits.";
    }
    if (candidate.city.trim().length < 2) next.city = "Enter the city they operate from.";
    if (candidate.contactName.trim().length < 2) next.contactName = "Enter a contact name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)) {
      next.email = "Enter a valid email address.";
    }
    if (candidate.phone.replace(/\D/g, "").length < 7) {
      next.phone = "Enter a phone number we can reach them on.";
    }
    return next;
  };

  /** Re-validates on every keystroke but only ever removes a visible message. */
  const set = <K extends keyof Values>(key: K, value: Values[K]) => {
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

  const toggleDocument = (label: string) =>
    setDocuments((current) =>
      current.includes(label)
        ? current.filter((entry) => entry !== label)
        : [...current, label],
    );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 600);
  };

  const control =
    "h-11 w-full rounded-sm border bg-surface px-3.5 text-sm text-ink transition-colors focus:outline-none";
  const labelClass = "mb-1.5 block text-[0.75rem] font-medium text-muted";
  const errorCount = Object.keys(errors).length;

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-sm border border-line bg-surface p-8 text-center lg:p-12"
      >
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-surface-soft text-success">
          <Check size={26} aria-hidden />
        </span>
        <h2 className="mt-6 font-display text-2xl text-ink">
          {values.name} added to the register
        </h2>
        <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-muted">
          In a live product the application would now sit in the review queue with
          {" "}
          {documents.length === 0
            ? "no documents attached"
            : `${documents.length} of ${requiredDocuments.length} documents attached`}
          . Here it is the end of the prototype flow — nothing was saved.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              setValues(initialValues);
              setDocuments([]);
              setSubmitted(false);
            }}
            className="inline-flex h-11 items-center rounded-sm border border-ink/20 px-5 text-[0.875rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
          >
            Register another
          </button>
          <Link
            href={path("/admin/partners")}
            className="inline-flex h-11 items-center rounded-sm bg-brand px-5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-brand-hover"
          >
            Back to partners
          </Link>
        </div>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <section className="rounded-sm border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold text-ink">The business</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">
            As it appears on their registration documents.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field id="name" label="Trading name" required error={errors.name}>
            <input
              id="name"
              value={values.name}
              onChange={(event) => set("name", event.target.value)}
              placeholder="Caucasus Trails"
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "name-error" : undefined}
              className={cn(
                control,
                errors.name ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field id="legalName" label="Registered legal entity" required error={errors.legalName}>
            <input
              id="legalName"
              value={values.legalName}
              onChange={(event) => set("legalName", event.target.value)}
              placeholder="Caucasus Trails LLC"
              aria-invalid={Boolean(errors.legalName)}
              aria-describedby={errors.legalName ? "legalName-error" : undefined}
              className={cn(
                control,
                errors.legalName ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field id="kind" label="Partner type">
            <select
              id="kind"
              value={values.kind}
              onChange={(event) => set("kind", event.target.value as PartnerKind)}
              className={cn(control, "border-line focus:border-ink")}
            >
              {(Object.keys(partnerKindLabels) as PartnerKind[]).map((kind) => (
                <option key={kind} value={kind}>
                  {partnerKindLabels[kind]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            id="taxId"
            label="Tax identification number"
            required
            error={errors.taxId}
            hint="Nine digits, as issued by the Revenue Service."
          >
            <input
              id="taxId"
              inputMode="numeric"
              value={values.taxId}
              onChange={(event) => set("taxId", event.target.value)}
              placeholder="404 512 889"
              aria-invalid={Boolean(errors.taxId)}
              aria-describedby={errors.taxId ? "taxId-error" : "taxId-hint"}
              className={cn(
                control,
                errors.taxId ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field id="city" label="Operating city" required error={errors.city}>
            <input
              id="city"
              value={values.city}
              onChange={(event) => set("city", event.target.value)}
              placeholder="Tbilisi"
              aria-invalid={Boolean(errors.city)}
              aria-describedby={errors.city ? "city-error" : undefined}
              className={cn(
                control,
                errors.city ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field id="website" label="Website">
            <input
              id="website"
              value={values.website}
              onChange={(event) => set("website", event.target.value)}
              placeholder="caucasustrails.ge"
              className={cn(control, "border-line focus:border-ink")}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-sm border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold text-ink">Main contact</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">
            The person we call when a booking needs confirming.
          </p>
        </div>

        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Field id="contactName" label="Full name" required error={errors.contactName}>
            <input
              id="contactName"
              autoComplete="name"
              value={values.contactName}
              onChange={(event) => set("contactName", event.target.value)}
              aria-invalid={Boolean(errors.contactName)}
              aria-describedby={errors.contactName ? "contactName-error" : undefined}
              className={cn(
                control,
                errors.contactName ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field id="email" label="Email" required error={errors.email}>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(event) => set("email", event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              className={cn(
                control,
                errors.email ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field id="phone" label="Phone" required error={errors.phone}>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+995 599 12 45 80"
              value={values.phone}
              onChange={(event) => set("phone", event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? "phone-error" : undefined}
              className={cn(
                control,
                errors.phone ? "border-error" : "border-line focus:border-ink",
              )}
            />
          </Field>

          <Field
            id="commissionRate"
            label="Commission rate"
            hint="Percentage of gross booking value retained by the studio."
          >
            <span className="relative block">
              <input
                id="commissionRate"
                type="number"
                min={0}
                max={50}
                value={values.commissionRate}
                onChange={(event) => set("commissionRate", event.target.value)}
                aria-describedby="commissionRate-hint"
                className={cn(control, "border-line pe-8 focus:border-ink")}
              />
              <span className="pointer-events-none absolute top-1/2 end-3.5 -translate-y-1/2 text-sm text-subtle">
                %
              </span>
            </span>
          </Field>
        </div>
      </section>

      <section className="rounded-sm border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold text-ink">Compliance documents</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">
            Tick what has already been received. A partner cannot go active until all
            four are in.
          </p>
        </div>

        <div className="p-5">
          <ul className="grid gap-2 sm:grid-cols-2">
            {requiredDocuments.map((document) => {
              const received = documents.includes(document);
              return (
                <li key={document}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-sm border p-3.5 transition-colors",
                      received
                        ? "border-success/40 bg-success/6"
                        : "border-line hover:border-subtle",
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={received}
                      onChange={() => toggleDocument(document)}
                      className="size-4 shrink-0 rounded-xs accent-brand"
                    />
                    <span className="min-w-0 flex-1 text-[0.875rem] text-ink">{document}</span>
                    {received ? (
                      <Check size={15} className="shrink-0 text-success" aria-hidden />
                    ) : (
                      <Upload size={15} className="shrink-0 text-subtle" aria-hidden />
                    )}
                  </label>
                </li>
              );
            })}
          </ul>

          <p className="mt-4 text-[0.75rem] text-subtle">
            {documents.length} of {requiredDocuments.length} received. File upload is not
            part of this prototype.
          </p>
        </div>
      </section>

      <section className="rounded-sm border border-line bg-surface">
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-[0.9375rem] font-semibold text-ink">Internal notes</h2>
        </div>
        <div className="p-5">
          <label htmlFor="notes" className={labelClass}>
            Anything the review team should know
          </label>
          <textarea
            id="notes"
            rows={4}
            value={values.notes}
            onChange={(event) => set("notes", event.target.value)}
            placeholder="Site visit findings, who introduced them, outstanding questions…"
            className="w-full rounded-sm border border-line bg-surface p-3.5 text-sm text-ink transition-colors focus:border-ink focus:outline-none"
          />
        </div>
      </section>

      <p className="flex items-start gap-2.5 rounded-sm bg-surface-soft p-4 text-[0.75rem] leading-relaxed text-body">
        <Info size={14} className="mt-px shrink-0 text-brand-text" aria-hidden />
        This form is part of a front-end prototype. Submitting adds nothing to the
        register and sends no email — nothing leaves this browser tab.
      </p>

      {errorCount > 0 && (
        <p
          role="alert"
          className="flex items-start gap-2.5 rounded-sm border border-error/40 bg-surface px-4 py-3 text-[0.875rem] text-error-text"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          {errorCount === 1
            ? "One detail still needs your attention."
            : `${errorCount} details still need your attention.`}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-11 items-center gap-2 rounded-sm bg-brand px-5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:opacity-70"
        >
          {submitting && <Loader2 size={15} className="animate-spin" aria-hidden />}
          {submitting ? "Registering…" : "Register partner"}
        </button>
        <Link
          href={path("/admin/partners")}
          className="inline-flex h-11 items-center rounded-sm border border-ink/20 px-5 text-[0.875rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-[0.75rem] font-medium text-muted">
        {label}
        {required && (
          <>
            {" "}
            <span aria-hidden>*</span>
            <span className="sr-only">(required)</span>
          </>
        )}
      </label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-[0.75rem] text-subtle">
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
            className="overflow-hidden text-[0.75rem] text-error-text"
          >
            <span className="block pt-1.5">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
