"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * The panel's form parts.
 *
 * Extracted because the transfer catalogue screens ask for the same control
 * five times over — a labelled input with a hint under it and a server error
 * beside it — and the class strings had started to be copied between files,
 * which is how two fields end up a pixel different from each other.
 *
 * Every control is uncontrolled about layout and controlled about value: the
 * caller owns the state, and these decide only how it looks and how a failure
 * is announced. `error` is the message the *server* sent for this field, so a
 * validation failure lands where it happened rather than as one sentence at
 * the bottom of a long form.
 */

const controlBase =
  "w-full rounded-sm border bg-surface px-3 text-[0.875rem] text-ink transition-colors focus:outline-none disabled:opacity-60";

const borderFor = (error?: string) =>
  error ? "border-error focus:border-error" : "border-line focus:border-ink";

export const labelClass = "block text-[0.75rem] font-semibold text-muted";
export const hintClass = "mt-1.5 block text-[0.75rem] leading-relaxed text-subtle";

interface FieldShell {
  label: string;
  /** Explains the field where the label cannot. Rendered under the control. */
  hint?: React.ReactNode;
  /** A server-side message for this field. Turns the border red. */
  error?: string;
  className?: string;
}

/**
 * Label, control, hint and error — the wrapper every control below uses.
 *
 * The caption is a real `<label>` only when it has something to point at. Used
 * around a group rather than a single control — a map, a row of checkboxes —
 * there is no one input the caption belongs to, and a `<label>` with no target
 * is a promise to a screen reader that nothing keeps. Those render as plain
 * text instead, with the group's own controls carrying their own labels.
 */
export function Field({
  label,
  hint,
  error,
  className,
  children,
  htmlFor,
}: FieldShell & { children: React.ReactNode; htmlFor?: string }) {
  const Caption = htmlFor ? "label" : "span";

  return (
    <div className={className}>
      <Caption className={htmlFor ? labelClass : `${labelClass} cursor-default`} htmlFor={htmlFor}>
        {label}
      </Caption>
      <div className="mt-1.5">{children}</div>
      {hint && <span className={hintClass}>{hint}</span>}
      {error && (
        <p role="alert" className="mt-1.5 text-[0.75rem] text-error-text">
          {error}
        </p>
      )}
    </div>
  );
}

export function TextInput({
  label,
  hint,
  error,
  className,
  mono,
  ...input
}: FieldShell & { mono?: boolean } & React.InputHTMLAttributes<HTMLInputElement>) {
  // A generated id where the caller gave none, so the label always has
  // something to point at. Callers still pass one where a test or another
  // element needs to name the field.
  const id = useId();
  const controlId = input.id ?? id;

  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={controlId}>
      <input
        {...input}
        id={controlId}
        aria-invalid={error ? true : undefined}
        className={cn(controlBase, borderFor(error), "h-10", mono && "font-mono text-[0.8125rem]")}
      />
    </Field>
  );
}

/**
 * A number field.
 *
 * `text-end` and `tabular-nums` on every one of them, so a column of figures
 * lines up on the decimal — the same reason the tables right-align money.
 */
export function NumberInput({
  label,
  hint,
  error,
  className,
  ...input
}: FieldShell & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const controlId = input.id ?? id;

  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={controlId}>
      <input
        {...input}
        id={controlId}
        type="number"
        inputMode="decimal"
        aria-invalid={error ? true : undefined}
        className={cn(controlBase, borderFor(error), "h-10 text-end tabular-nums")}
      />
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  error,
  className,
  rows = 3,
  ...area
}: FieldShell & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const controlId = area.id ?? id;

  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={controlId}>
      <textarea
        {...area}
        id={controlId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        className={cn(controlBase, borderFor(error), "py-2 leading-relaxed")}
      />
    </Field>
  );
}

export function SelectInput<T extends string>({
  label,
  hint,
  error,
  className,
  options,
  placeholder,
  ...select
}: FieldShell & {
  options: { value: T; label: string }[];
  /** A disabled first option, for a required choice with no sensible default. */
  placeholder?: string;
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children">) {
  const id = useId();
  const controlId = select.id ?? id;

  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={controlId}>
      <select
        {...select}
        id={controlId}
        aria-invalid={error ? true : undefined}
        className={cn(controlBase, borderFor(error), "h-10")}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** A checkbox with its explanation beside it rather than above it. */
export function CheckboxField({
  label,
  hint,
  checked,
  onChange,
  disabled,
  className,
}: {
  label: string;
  hint?: React.ReactNode;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label className={cn("flex items-start gap-2.5", className)}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-brand"
      />
      <span className="text-[0.8125rem] leading-snug text-body">
        {label}
        {hint && <span className="mt-0.5 block text-[0.75rem] text-subtle">{hint}</span>}
      </span>
    </label>
  );
}

/**
 * A list of short strings, edited as one textarea, one entry per line.
 *
 * The alternative — a row of inputs with add and remove buttons — is more
 * chrome and more clicks for a field whose whole content is four bullet points
 * somebody wants to paste in from a document. Blank lines are dropped on the
 * way out, so a stray return is not an empty bullet on the public page.
 */
export function LineListInput({
  label,
  hint,
  error,
  className,
  value,
  onChange,
  rows = 4,
  placeholder,
}: FieldShell & {
  value: string[];
  onChange: (next: string[]) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <TextArea
      label={label}
      hint={hint}
      error={error}
      className={className}
      rows={rows}
      placeholder={placeholder}
      value={value.join("\n")}
      onChange={(event) =>
        onChange(
          event.target.value
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean),
        )
      }
    />
  );
}

/** The form-level failure: what the server said when it refused the whole body. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <p
      role="alert"
      className="mt-4 flex items-start gap-2 rounded-sm border border-error/40 bg-surface px-4 py-3 text-[0.875rem] text-error-text"
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
      {message}
    </p>
  );
}

/**
 * The save button.
 *
 * Carries its own three states rather than leaving each form to spell them
 * out: idle, in flight, and saved-and-unchanged. The tick disappears the
 * moment the form is edited again, which is what stops "Saved" from being a
 * lie about the content currently on screen.
 */
export function SubmitButton({
  busy,
  saved,
  disabled,
  onClick,
  children,
  type = "button",
  className,
}: {
  busy?: boolean;
  saved?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  type?: "button" | "submit";
  className?: string;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={busy || disabled}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
    >
      {busy ? (
        <Loader2 size={15} className="animate-spin" aria-hidden />
      ) : saved ? (
        <Check size={15} aria-hidden />
      ) : null}
      {children}
    </button>
  );
}
