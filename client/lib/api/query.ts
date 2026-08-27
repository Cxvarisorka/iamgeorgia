/**
 * Query-string building, shared by every typed endpoint module.
 *
 * The important behaviour is arrays: the server reads `amenity`, `status` and
 * `childAges` as repeated parameters, and `new URLSearchParams({ a: [1, 2] })`
 * silently produces `a=1%2C2` instead. Everything goes through `append`.
 */
export type QueryValue = string | number | boolean | undefined | null | (string | number)[];

export const toQueryString = (query: object = {}): string => {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query) as [string, QueryValue][]) {
    if (value === undefined || value === null || value === "") continue;

    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry === undefined || entry === null || entry === "") continue;
      params.append(key, String(entry));
    }
  }

  const search = params.toString();
  return search ? `?${search}` : "";
};
