"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CheckboxField, FormError, SubmitButton, TextArea, TextInput } from "@/components/admin/FormControls";
import { ApiError, describeError } from "@/lib/api/client";
import { updateDriverProfile } from "@/lib/api/driverPanel";
import { languageOptions } from "@/lib/admin/fleet";
import type { DriverLanguage, DriverSelf } from "@/types/driver";

/** The three things a driver may change about themselves. */
export function DriverProfileForm({ driver }: { driver: DriverSelf }) {
  const router = useRouter();
  const [phone, setPhone] = useState(driver.phone);
  const [languages, setLanguages] = useState<DriverLanguage[]>(driver.languages as DriverLanguage[]);
  const [bio, setBio] = useState(driver.bio ?? "");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const save = async () => {
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      await updateDriverProfile({ phone: phone.trim(), languages, bio: bio.trim() || null });
      setSaved(true);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError) setFieldErrors(caught.fieldErrors());
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <TextInput
        label="Phone"
        type="tel"
        value={phone}
        onChange={(event) => {
          setPhone(event.target.value);
          setSaved(false);
        }}
        error={fieldErrors.phone}
        hint="Dispatch and, close to a pick-up, the passenger call this number."
      />
      <div>
        <span className="block text-[0.75rem] font-semibold text-muted">Languages you speak</span>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
          {languageOptions.map((option) => (
            <CheckboxField
              key={option.value}
              label={option.label}
              checked={languages.includes(option.value)}
              onChange={(next) => {
                setLanguages((current) => (next ? [...current, option.value] : current.filter((value) => value !== option.value)));
                setSaved(false);
              }}
            />
          ))}
        </div>
      </div>
      <TextArea
        label="About you"
        rows={3}
        value={bio}
        onChange={(event) => {
          setBio(event.target.value);
          setSaved(false);
        }}
        error={fieldErrors.bio}
        hint="Passengers see this. A line or two."
      />
      <FormError message={error} />
      <SubmitButton busy={busy} saved={saved} onClick={save} className="w-full sm:w-auto">
        {busy ? "Saving…" : saved ? "Saved" : "Save"}
      </SubmitButton>
    </div>
  );
}
