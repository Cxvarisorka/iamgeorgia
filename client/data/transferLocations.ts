import { localise, localiseAll } from "./i18n/merge";
import { transferLocationContent } from "./i18n/transferLocations";
import { defaultLocale, type Locale } from "@/lib/i18n/config";
import type { TransferLocation, TransferLocationType } from "@/types";

/**
 * Pick-up and drop-off points. Prototype data — a live product would query a
 * places service, but the shape is the same: an id, a display name, a type to
 * group by, and coordinates the pricing engine can measure between.
 *
 * Coordinates are the real ones. Journey distances are computed from them, so
 * Tbilisi Airport → Batumi quotes ~5h30 rather than a number someone invented.
 */
export const transferLocations: TransferLocation[] = [
  // --- Airports ---------------------------------------------------------
  {
    id: "tbs-airport",
    name: "Tbilisi International Airport",
    region: "Tbilisi",
    type: "airport",
    code: "TBS",
    lat: 41.6692,
    lng: 44.9547,
    image: "/images/destinations/tbilisi-2.jpg",
    popular: true,
  },
  {
    id: "bus-airport",
    name: "Batumi International Airport",
    region: "Batumi, Adjara",
    type: "airport",
    code: "BUS",
    lat: 41.6102,
    lng: 41.5997,
    image: "/images/destinations/batumi-2.jpg",
    popular: true,
  },
  {
    id: "kut-airport",
    name: "Kutaisi International Airport",
    region: "Kutaisi, Imereti",
    type: "airport",
    code: "KUT",
    lat: 42.1767,
    lng: 42.4826,
    image: "/images/tours/martvili.jpg",
    popular: true,
  },

  // --- Cities and towns -------------------------------------------------
  {
    id: "tbilisi",
    name: "Tbilisi",
    region: "City centre",
    type: "city",
    lat: 41.7151,
    lng: 44.7831,
    image: "/images/destinations/tbilisi-1.jpg",
    popular: true,
  },
  {
    id: "batumi",
    name: "Batumi",
    region: "Adjara · Black Sea coast",
    type: "city",
    lat: 41.6459,
    lng: 41.6405,
    image: "/images/destinations/batumi-1.jpg",
    popular: true,
  },
  {
    id: "kutaisi",
    name: "Kutaisi",
    region: "Imereti",
    type: "city",
    lat: 42.2679,
    lng: 42.7059,
    image: "/images/tours/okatse.jpg",
  },
  {
    id: "gudauri",
    name: "Gudauri",
    region: "Ski resort · Greater Caucasus",
    type: "city",
    lat: 42.4783,
    lng: 44.4806,
    image: "/images/destinations/gudauri-1.jpg",
    popular: true,
  },
  {
    id: "borjomi",
    name: "Borjomi",
    region: "Samtskhe-Javakheti",
    type: "city",
    lat: 41.8403,
    lng: 43.3839,
    image: "/images/destinations/borjomi-1.jpg",
  },
  {
    id: "stepantsminda",
    name: "Stepantsminda (Kazbegi)",
    region: "Mtskheta-Mtianeti",
    type: "city",
    lat: 42.6573,
    lng: 44.6415,
    image: "/images/destinations/kazbegi-1.jpg",
    popular: true,
  },
  {
    id: "mtskheta",
    name: "Mtskheta",
    region: "Mtskheta-Mtianeti",
    type: "city",
    lat: 41.8458,
    lng: 44.7208,
    image: "/images/destinations/mtskheta-1.jpg",
  },
  {
    id: "sighnaghi",
    name: "Sighnaghi",
    region: "Kakheti wine country",
    type: "city",
    lat: 41.6187,
    lng: 45.9216,
    image: "/images/destinations/kakheti-1.jpg",
  },
  {
    id: "telavi",
    name: "Telavi",
    region: "Kakheti wine country",
    type: "city",
    lat: 41.9194,
    lng: 45.4731,
    image: "/images/destinations/kakheti-2.jpg",
  },
  {
    id: "mestia",
    name: "Mestia",
    region: "Svaneti",
    type: "city",
    lat: 43.0451,
    lng: 42.7285,
    image: "/images/destinations/svaneti-1.jpg",
  },

  // --- Hotels -----------------------------------------------------------
  // Properties that already exist on the site, so a stay and its transfer
  // refer to the same place rather than two unrelated datasets.
  {
    id: "hotel-vera-house",
    name: "Vera House Tbilisi",
    region: "18 Kiacheli Street, Vera, Tbilisi",
    type: "hotel",
    lat: 41.7089,
    lng: 44.7846,
    image: "/images/hotels/property-1.jpg",
  },
  {
    id: "hotel-gudauri-lodge",
    name: "Gudauri Alpine Lodge",
    region: "Gudauri gondola base station",
    type: "hotel",
    lat: 42.4761,
    lng: 44.4712,
    image: "/images/hotels/property-10.jpg",
  },
  {
    id: "hotel-batumi-seafront",
    name: "Batumi Seafront Resort",
    region: "Batumi Boulevard, Adjara",
    type: "hotel",
    lat: 41.6512,
    lng: 41.6339,
    image: "/images/hotels/property-4.jpg",
  },

  // --- Landmarks --------------------------------------------------------
  {
    id: "jvari-monastery",
    name: "Jvari Monastery",
    region: "Above Mtskheta",
    type: "landmark",
    lat: 41.8383,
    lng: 44.7331,
    image: "/images/destinations/mtskheta-2.jpg",
  },
  {
    id: "ananuri",
    name: "Ananuri Fortress",
    region: "Georgian Military Road",
    type: "landmark",
    lat: 42.1642,
    lng: 44.7031,
    image: "/images/destinations/gudauri-2.jpg",
  },
  {
    id: "uplistsikhe",
    name: "Uplistsikhe Cave Town",
    region: "Near Gori, Shida Kartli",
    type: "landmark",
    lat: 41.9672,
    lng: 44.2078,
    image: "/images/tours/uplistsikhe.jpg",
  },
];

/** Section order in the location picker — airports first, as travellers expect. */
export const locationGroupOrder: TransferLocationType[] = [
  "airport",
  "city",
  "hotel",
  "landmark",
];

/**
 * Looks a location up by id.
 *
 * Pass a locale to get the reader's name and region merged over the record;
 * omit it to get the canonical English one. The pricing engine calls this
 * without a locale on purpose — it only ever reads the coordinates, and a
 * translated name would be dead weight in every quote it computes.
 */
export function getTransferLocation(
  id: string | null,
  locale?: Locale,
): TransferLocation | undefined {
  if (!id) return undefined;
  const base = transferLocations.find((location) => location.id === id);
  if (!base || !locale) return base;
  return localise(base, locale, transferLocationContent);
}

/** The whole list in one language, in the order it is declared. */
export function localisedTransferLocations(locale: Locale): TransferLocation[] {
  return localiseAll(transferLocations, locale, transferLocationContent);
}

/**
 * Matches on name, region and airport code so "TBS" and "Batumi" both work.
 *
 * Both the translated and the English fields are searched, whatever the
 * reader's language. Georgian place names are routinely typed in Latin script
 * — a traveller on the Hebrew site searching "Batumi" should not come back
 * empty — and airport codes are Latin in every language there is.
 */
export function searchTransferLocations(
  query: string,
  locale: Locale = defaultLocale,
): TransferLocation[] {
  const localised = localisedTransferLocations(locale);
  const needle = query.trim().toLowerCase();
  if (!needle) return localised;

  return localised.filter((location, index) => {
    const base = transferLocations[index];
    return [location.name, location.region, base.name, base.region, location.code ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(needle);
  });
}
