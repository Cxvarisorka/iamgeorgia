"use client";

import { Check, Info, Loader2 } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

export interface EditorField {
  name: string;
  label: string;
  /** `text` is a single line, `number` a numeric input, `area` a textarea. */
  type: "text" | "number" | "area" | "select";
  value: string;
  options?: string[];
  hint?: string;
  prefix?: string;
  /** Half width on wider screens, so short fields pair up. */
  half?: boolean;
}

/**
 * The catalogue edit form.
 *
 * Deliberately a prototype: the fields are real and validated, and saving
 * shows the confirmation an operator would get, but nothing persists past a
 * reload. It exists so the shape of the editing experience — which fields,
 * grouped how, with what affordances — can be reviewed before any of it is
 * wired to a database.
 */
export function ListingEditor({
  sections,
  featured,
}: {
  sections: { title: string; description?: string; fields: EditorField[] }[];
  featured: boolean;
}) {
  const initial = Object.fromEntries(
    sections.flatMap((section) => section.fields.map((field) => [field.name, field.value])),
  );

  const [values, setValues] = useState<Record<string, string>>(initial);
  const [isFeatured, setIsFeatured] = useState(featured);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    isFeatured !== featured ||
    Object.entries(values).some(([key, value]) => initial[key] !== value);

  const set = (name: string, value: string) => {
    setValues((current) => ({ ...current, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaved(true);
    }, 500);
  };

  const control =
    "w-full rounded-sm border border-line bg-surface px-3.5 text-sm text-ink transition-colors focus:border-ink focus:outline-none";

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {sections.map((section) => (
          <section
            key={section.title}
            className="rounded-sm border border-line bg-surface"
          >
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[0.9375rem] font-semibold text-ink">{section.title}</h2>
              {section.description && (
                <p className="mt-1 text-[0.8125rem] text-muted">{section.description}</p>
              )}
            </div>

            <div className="grid gap-5 p-5 sm:grid-cols-2">
              {section.fields.map((field) => (
                <div
                  key={field.name}
                  className={cn("min-w-0", !field.half && "sm:col-span-2")}
                >
                  <label
                    htmlFor={field.name}
                    className="mb-1.5 block text-[0.75rem] font-medium text-muted"
                  >
                    {field.label}
                  </label>

                  {field.type === "area" ? (
                    <textarea
                      id={field.name}
                      rows={4}
                      value={values[field.name]}
                      onChange={(event) => set(field.name, event.target.value)}
                      className={cn(control, "py-3 leading-relaxed")}
                    />
                  ) : field.type === "select" ? (
                    <select
                      id={field.name}
                      value={values[field.name]}
                      onChange={(event) => set(field.name, event.target.value)}
                      className={cn(control, "h-11")}
                    >
                      {field.options?.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="relative block">
                      {field.prefix && (
                        <span className="pointer-events-none absolute top-1/2 start-3.5 -translate-y-1/2 text-sm text-subtle">
                          {field.prefix}
                        </span>
                      )}
                      <input
                        id={field.name}
                        type={field.type === "number" ? "number" : "text"}
                        value={values[field.name]}
                        onChange={(event) => set(field.name, event.target.value)}
                        className={cn(control, "h-11", field.prefix && "ps-7")}
                      />
                    </span>
                  )}

                  {field.hint && (
                    <p className="mt-1.5 text-[0.75rem] text-subtle">{field.hint}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        <section className="rounded-sm border border-line bg-surface p-5">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(event) => {
                setIsFeatured(event.target.checked);
                setSaved(false);
              }}
              className="mt-0.5 size-4 shrink-0 rounded-xs accent-brand"
            />
            <span>
              <span className="block text-[0.875rem] font-medium text-ink">
                Feature on the public site
              </span>
              <span className="mt-0.5 block text-[0.8125rem] text-muted">
                Featured listings appear on the homepage and at the top of their index.
              </span>
            </span>
          </label>
        </section>
      </div>

      <p className="mt-6 flex items-start gap-2.5 rounded-sm bg-surface-soft p-4 text-[0.75rem] leading-relaxed text-body">
        <Info size={14} className="mt-px shrink-0 text-brand-text" aria-hidden />
        Editing is part of the prototype. Changes stay in this tab and are lost on
        reload — no catalogue data is written.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || saving}
          className="inline-flex h-11 items-center gap-2 rounded-sm bg-brand px-5 text-[0.875rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50"
        >
          {saving && <Loader2 size={15} className="animate-spin" aria-hidden />}
          {saving ? "Saving…" : "Save changes"}
        </button>

        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => {
            setValues(initial);
            setIsFeatured(featured);
            setSaved(false);
          }}
          className="inline-flex h-11 items-center rounded-sm border border-ink/20 px-5 text-[0.875rem] font-semibold text-ink transition-colors hover:border-ink hover:bg-surface-soft disabled:pointer-events-none disabled:opacity-50"
        >
          Discard
        </button>

        <p aria-live="polite" className="text-[0.8125rem]">
          {saved ? (
            <span className="inline-flex items-center gap-1.5 text-success">
              <Check size={15} aria-hidden />
              Saved locally
            </span>
          ) : dirty ? (
            <span className="text-warning-text">Unsaved changes</span>
          ) : (
            <span className="text-subtle">No changes</span>
          )}
        </p>
      </div>
    </form>
  );
}
