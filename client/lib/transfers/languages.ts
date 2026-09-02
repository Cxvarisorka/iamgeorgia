/**
 * Language names in the reader's own language, from the browser's tables
 * rather than a dictionary of our own — `ka` reads as "Georgian" in English
 * and "ქართული" in Georgian without us maintaining sixteen names four times.
 * Falls back to the code where the runtime has no name for it.
 */
export const languageNames = (codes: string[], locale: string): string => {
  let names: Intl.DisplayNames | null = null;

  try {
    names = new Intl.DisplayNames([locale], { type: "language" });
  } catch {
    names = null;
  }

  return codes
    .map((code) => {
      try {
        return names?.of(code) ?? code;
      } catch {
        return code;
      }
    })
    .join(", ");
};
