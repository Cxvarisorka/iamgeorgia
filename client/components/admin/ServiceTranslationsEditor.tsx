"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormError, LineListInput, SubmitButton, TextArea, TextInput } from "./FormControls";
import { describeError } from "@/lib/api/client";
import { setServiceTranslation } from "@/lib/api/services";
import { cn } from "@/lib/utils";
import type { Service, ServiceTranslation } from "@/types/service";

/**
 * The prose of a service in the other three languages.
 *
 * Every field is optional: a blank one falls back to English on the public
 * page rather than blanking it, so a half-translated service is still whole.
 * Facts — the price, the basis, the notice period — are not language and are
 * not here.
 */

const LOCALES = [
  { code: "ka", label: "ქართული" },
  { code: "ru", label: "Русский" },
  { code: "he", label: "עברית" },
] as const;

type LocaleCode = (typeof LOCALES)[number]["code"];

interface Draft {
  name: string;
  summary: string;
  description: string;
  included: string[];
}

const draftFrom = (translation: ServiceTranslation | undefined): Draft => ({
  name: translation?.name ?? "",
  summary: translation?.summary ?? "",
  description: (translation?.description ?? []).join("\n\n"),
  included: translation?.included ?? [],
});

export function ServiceTranslationsEditor({
  service,
  translations,
}: {
  service: Service;
  translations: ServiceTranslation[];
}) {
  const router = useRouter();
  const [locale, setLocale] = useState<LocaleCode>("ka");
  const [drafts, setDrafts] = useState<Record<LocaleCode, Draft>>(() =>
    Object.fromEntries(
      LOCALES.map(({ code }) => [
        code,
        draftFrom(translations.find((entry) => entry.locale === code)),
      ]),
    ) as Record<LocaleCode, Draft>,
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<LocaleCode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const draft = drafts[locale];

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setSaved(null);
    setDrafts((current) => ({ ...current, [locale]: { ...current[locale], [key]: value } }));
  };

  const save = async () => {
    setBusy(true);
    setError(null);

    try {
      await setServiceTranslation(service.id, locale, {
        name: draft.name.trim() || null,
        summary: draft.summary.trim() || null,
        // Blank lines separate paragraphs, as they do in the English record.
        description: draft.description
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean),
        included: draft.included,
      });

      setSaved(locale);
      router.refresh();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div role="tablist" aria-label="Locale" className="flex gap-1.5">
        {LOCALES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            role="tab"
            aria-selected={locale === code}
            onClick={() => setLocale(code)}
            className={cn(
              "h-9 rounded-sm border px-3 text-[0.8125rem] font-medium transition-colors",
              locale === code
                ? "border-brand bg-brand-soft text-brand-text"
                : "border-line text-muted hover:border-ink hover:text-ink",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-col gap-4" dir={locale === "he" ? "rtl" : "ltr"}>
        <TextInput
          label="Name"
          value={draft.name}
          onChange={(event) => set("name", event.target.value)}
        />
        <TextArea
          label="Summary"
          rows={3}
          value={draft.summary}
          onChange={(event) => set("summary", event.target.value)}
        />
        <TextArea
          label="Description"
          hint="A blank line starts a new paragraph."
          rows={6}
          value={draft.description}
          onChange={(event) => set("description", event.target.value)}
        />
        <LineListInput
          label="What is included"
          hint="One item per line."
          value={draft.included}
          onChange={(next) => set("included", next)}
        />
      </div>

      <FormError message={error} />

      <div className="mt-5">
        <SubmitButton busy={busy} saved={saved === locale} onClick={() => void save()}>
          Save {LOCALES.find((entry) => entry.code === locale)?.label}
        </SubmitButton>
      </div>
    </div>
  );
}
