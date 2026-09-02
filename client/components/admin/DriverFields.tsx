"use client";

import { CheckboxField, NumberInput, TextArea, TextInput } from "./FormControls";
import { languageOptions } from "@/lib/admin/fleet";
import type { DriverInput } from "@/lib/api/drivers";
import type { DriverAdmin, DriverLanguage } from "@/types/driver";

/**
 * The fields a driver profile has, shared by the create form and the editor.
 *
 * Split the way the API splits them. **Public** is what a partner or a
 * passenger sees once the driver is assigned. **Contact** is how dispatch
 * reaches them. **Internal** — licence, date of birth, notes — never leaves
 * the panel and is not even in the driver's own view.
 */

export interface DriverValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  languages: DriverLanguage[];
  yearsExperience: string;
  bio: string;
  licenceNumber: string;
  licenceExpiresOn: string;
  dateOfBirth: string;
  internalNotes: string;
}

export const emptyDriverValues = (): DriverValues => ({
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  languages: ["ka", "en"],
  yearsExperience: "0",
  bio: "",
  licenceNumber: "",
  licenceExpiresOn: "",
  dateOfBirth: "",
  internalNotes: "",
});

export const driverValuesFrom = (driver: DriverAdmin): DriverValues => ({
  firstName: driver.firstName,
  lastName: driver.lastName,
  phone: driver.phone,
  email: driver.email ?? "",
  languages: driver.languages as DriverLanguage[],
  yearsExperience: String(driver.yearsExperience),
  bio: driver.bio ?? "",
  licenceNumber: driver.licenceNumber ?? "",
  licenceExpiresOn: driver.licenceExpiresOn ?? "",
  dateOfBirth: driver.dateOfBirth ?? "",
  internalNotes: driver.internalNotes ?? "",
});

export const driverValuesToBody = (values: DriverValues): Omit<DriverInput, "providerId"> => ({
  firstName: values.firstName.trim(),
  lastName: values.lastName.trim(),
  phone: values.phone.trim(),
  email: values.email.trim() || null,
  languages: values.languages,
  yearsExperience: Number.parseInt(values.yearsExperience, 10) || 0,
  bio: values.bio.trim() || null,
  licenceNumber: values.licenceNumber.trim() || null,
  licenceExpiresOn: values.licenceExpiresOn || null,
  dateOfBirth: values.dateOfBirth || null,
  internalNotes: values.internalNotes.trim() || null,
});

export function DriverFields({
  values,
  onChange,
  fieldErrors,
}: {
  values: DriverValues;
  onChange: <K extends keyof DriverValues>(key: K, value: DriverValues[K]) => void;
  fieldErrors: Record<string, string>;
}) {
  const toggleLanguage = (language: DriverLanguage, next: boolean) =>
    onChange(
      "languages",
      next ? [...values.languages, language] : values.languages.filter((value) => value !== language),
    );

  return (
    <div className="space-y-8">
      <fieldset>
        <legend className="text-[0.8125rem] font-semibold text-ink">Who they are</legend>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          Shown to the partner and the passenger once the driver is assigned to their transfer.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextInput
            id="driver-first"
            label="First name"
            required
            value={values.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
            error={fieldErrors.firstName}
          />
          <TextInput
            id="driver-last"
            label="Last name"
            required
            value={values.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
            error={fieldErrors.lastName}
            hint="A passenger sees the initial only."
          />
          <NumberInput
            id="driver-experience"
            label="Years driving"
            min={0}
            max={60}
            value={values.yearsExperience}
            onChange={(event) => onChange("yearsExperience", event.target.value)}
            error={fieldErrors.yearsExperience}
          />
        </div>
        <TextArea
          id="driver-bio"
          label="About"
          rows={3}
          className="mt-5"
          value={values.bio}
          onChange={(event) => onChange("bio", event.target.value)}
          error={fieldErrors.bio}
          hint="Public. A line or two — where they are from, what they know about the road."
        />
        <div className="mt-5">
          <span className="block text-[0.75rem] font-semibold text-muted">Languages</span>
          <div className="mt-2 grid gap-x-6 gap-y-2 sm:grid-cols-3">
            {languageOptions.map((option) => (
              <CheckboxField
                key={option.value}
                label={option.label}
                checked={values.languages.includes(option.value)}
                onChange={(next) => toggleLanguage(option.value, next)}
              />
            ))}
          </div>
          {fieldErrors.languages && (
            <p role="alert" className="mt-2 text-[0.75rem] text-error-text">
              {fieldErrors.languages}
            </p>
          )}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[0.8125rem] font-semibold text-ink">How dispatch reaches them</legend>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          <TextInput
            id="driver-phone"
            label="Phone"
            required
            type="tel"
            value={values.phone}
            onChange={(event) => onChange("phone", event.target.value)}
            error={fieldErrors.phone}
            hint="Shown to the partner and the passenger shortly before pick-up."
          />
          <TextInput
            id="driver-email"
            label="Contact email"
            type="email"
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            error={fieldErrors.email}
            hint="For correspondence. The login email is set when the account is created."
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-[0.8125rem] font-semibold text-ink">Internal</legend>
        <p className="mt-1 text-[0.75rem] leading-relaxed text-subtle">
          Staff only. Not part of what the driver sees of their own profile.
        </p>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          <TextInput
            id="driver-licence"
            label="Licence number"
            mono
            value={values.licenceNumber}
            onChange={(event) => onChange("licenceNumber", event.target.value)}
            error={fieldErrors.licenceNumber}
          />
          <TextInput
            id="driver-licence-expiry"
            label="Licence expires"
            type="date"
            value={values.licenceExpiresOn}
            onChange={(event) => onChange("licenceExpiresOn", event.target.value)}
            error={fieldErrors.licenceExpiresOn}
          />
          <TextInput
            id="driver-dob"
            label="Date of birth"
            type="date"
            value={values.dateOfBirth}
            onChange={(event) => onChange("dateOfBirth", event.target.value)}
            error={fieldErrors.dateOfBirth}
          />
        </div>
        <TextArea
          id="driver-notes"
          label="Internal notes"
          rows={3}
          className="mt-5"
          value={values.internalNotes}
          onChange={(event) => onChange("internalNotes", event.target.value)}
          error={fieldErrors.internalNotes}
        />
      </fieldset>
    </div>
  );
}
