import type { DestinationQuery } from "@/lib/api/hotels";
import type { DestinationNode, DestinationSummary, DestinationType } from "@/types/catalogue";

/**
 * Display vocabulary and tree arithmetic for the destination screens.
 *
 * Destinations are the geography spine: hotels, tours, transfer points and
 * pricing rules all hang off one, and "every hotel in Georgia" is a prefix
 * match on the materialised `path`. That is why this module is mostly about
 * *where a record may sit* rather than about labels — putting a country under
 * a region, or a place under itself, is the one mistake here that quietly
 * breaks search for everything beneath it.
 */

export const DESTINATION_TYPES: DestinationType[] = ["COUNTRY", "REGION", "CITY", "RESORT"];

export const destinationTypeLabels: Record<DestinationType, string> = {
  COUNTRY: "Country",
  REGION: "Region",
  CITY: "City",
  RESORT: "Resort",
};

export const destinationTypeHints: Record<DestinationType, string> = {
  COUNTRY: "Always a root. Carries the country code everything below it inherits.",
  REGION: "Sits in a country. Groups the cities and resorts inside it.",
  CITY: "Sits in a country or a region. Where most hotels are filed.",
  RESORT: "A ski area, a spa town, a coastal strip. Peer of a city, not a child of one.",
};

export const destinationTypeOptions = DESTINATION_TYPES.map((value) => ({
  value,
  label: destinationTypeLabels[value],
}));

/**
 * How broad a level is, mirroring `TYPE_RANK` in the destination service.
 *
 * A parent must be at least as broad as its child, which rejects a country
 * filed under a region while still allowing a resort inside a city. Kept in
 * step with the server deliberately: the API refuses the same combinations, so
 * the panel not offering them is a courtesy rather than the enforcement.
 */
const TYPE_RANK: Record<DestinationType, number> = {
  COUNTRY: 0,
  REGION: 1,
  CITY: 2,
  RESORT: 2,
};

export const canParent = (parentType: DestinationType, childType: DestinationType) =>
  TYPE_RANK[parentType] <= TYPE_RANK[childType];

/** A destination flattened out of the tree, keeping the depth it was found at. */
export interface FlatDestination extends DestinationSummary {
  depth: number;
}

/** Depth-first, so a parent always immediately precedes its children. */
export const flattenTree = (nodes: DestinationNode[], depth = 0): FlatDestination[] =>
  nodes.flatMap((node) => [
    { ...node, depth },
    ...flattenTree(node.children, depth + 1),
  ]);

/** Indents a `<select>` option by its depth, so the tree survives a flat list. */
export const indent = (depth: number) => "\u00a0\u00a0\u00a0".repeat(depth);

/**
 * Which destinations may hold a child of `type`.
 *
 * Two exclusions, and the second is the one that matters: a destination may
 * never be moved inside itself or inside anything beneath it. The subtree is
 * exactly the rows whose path starts with this one's, which is the same test
 * the server makes before it rewrites descendant paths.
 */
export function parentOptions(
  all: FlatDestination[],
  type: DestinationType,
  self?: { id: string; path: string },
): FlatDestination[] {
  if (type === "COUNTRY") return [];

  return all.filter((candidate) => {
    if (!canParent(candidate.type, type)) return false;
    if (!self) return true;
    return candidate.id !== self.id && !candidate.path.startsWith(`${self.path}/`);
  });
}

/**
 * Reads a destination query out of URL params, dropping anything unrecognised
 * so a stale bookmark shows an unfiltered list rather than an error page.
 * The same contract as `lib/admin/hotels.ts`.
 */
export function destinationQueryFromParams(
  params: Record<string, string | string[] | undefined>,
): DestinationQuery {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const type = read("type");
  const featured = read("featured");
  const search = read("search")?.trim();
  const page = Number.parseInt(read("page") ?? "", 10);

  return {
    ...(search ? { search } : {}),
    ...(type && DESTINATION_TYPES.includes(type as DestinationType)
      ? { type: type as DestinationType }
      : {}),
    ...(featured === "true" || featured === "false" ? { featured: featured === "true" } : {}),
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: 50,
  };
}

/**
 * The ancestry of a path as readable text: `/georgia/imereti/kutaisi` becomes
 * "georgia / imereti". The record's own segment is dropped — its name is
 * already the thing beside this.
 */
export const ancestryLabel = (path: string): string =>
  path.split("/").filter(Boolean).slice(0, -1).join(" / ");
