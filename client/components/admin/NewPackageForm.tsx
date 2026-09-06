"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { FormError, NumberInput, SelectInput, SubmitButton, TextArea, TextInput } from "./FormControls";
import { ApiError, describeError } from "@/lib/api/client";
import { createPackage } from "@/lib/api/packages";
import { useLocalePath } from "@/lib/i18n/provider";
import type { DestinationNode } from "@/types/catalogue";

/** A slug from a name: lower case, words joined by hyphens, nothing else. */
const slugify = (value: string): string =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

/** The tree flattened, indented by depth, so a parent reads above its children. */
const flatten = (
  nodes: DestinationNode[],
  depth = 0,
): { value: string; label: string }[] =>
  nodes.flatMap((node) => [
    { value: node.id, label: `${"— ".repeat(depth)}${node.name}` },
    ...flatten(node.children ?? [], depth + 1),
  ]);

/**
 * Step one of building a package: what the server insists on before it will
 * make a record.
 *
 * Deliberately short. Slots, prices, the kosher profile, images and prose are
 * all filled in on the package page this creates, whose publish checklist
 * walks the operator through the rest — a create form carrying all of that
 * would be a wizard nobody finishes.
 */
export function NewPackageForm({ destinations }: { destinations: DestinationNode[] }) {
  const router = useRouter();
  const path = useLocalePath();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [destinationId, setDestinationId] = useState("");
  const [nights, setNights] = useState(3);
  const [summary, setSummary] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const options = flatten(destinations);

  const submit = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const created = await createPackage({
        name: name.trim(),
        slug: (slugTouched ? slug : slugify(name)).trim(),
        destinationId,
        nights,
        summary: summary.trim(),
      });

      router.push(path(`/admin/packages/${created.id}`));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 400) {
        setFieldErrors(caught.fieldErrors());
      }

      setError(describeError(caught));
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      noValidate
      className="flex flex-col gap-4"
    >
      <TextInput
        label="Name"
        error={fieldErrors.name}
        value={name}
        onChange={(event) => {
          setName(event.target.value);
          if (!slugTouched) setSlug(slugify(event.target.value));
        }}
      />

      <TextInput
        label="Slug"
        hint="The public URL. Changing it later breaks any link already shared."
        mono
        error={fieldErrors.slug}
        value={slug}
        onChange={(event) => {
          setSlugTouched(true);
          setSlug(event.target.value);
        }}
      />

      <SelectInput
        label="Destination"
        hint="Where the trip is filed. A slot with no hotel of its own searches here."
        placeholder="Choose a destination"
        error={fieldErrors.destinationId}
        value={destinationId}
        options={options}
        onChange={(event) => setDestinationId(event.target.value)}
      />

      <NumberInput
        label="Nights"
        hint="The length of the trip. Slot day offsets are measured against it."
        min={1}
        max={60}
        error={fieldErrors.nights}
        value={nights}
        onChange={(event) => setNights(Number(event.target.value))}
      />

      <TextArea
        label="Summary"
        hint="One or two sentences, shown on the card and under the title."
        rows={3}
        error={fieldErrors.summary}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
      />

      <FormError message={error} />

      <div>
        <SubmitButton
          type="submit"
          busy={busy}
          disabled={!name.trim() || !destinationId}
        >
          Create draft
        </SubmitButton>
      </div>
    </form>
  );
}
