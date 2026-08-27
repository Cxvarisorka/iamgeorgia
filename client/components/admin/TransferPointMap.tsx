"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";

import "leaflet/dist/leaflet.css";

/**
 * Placing a pick-up point on the map.
 *
 * This exists because a point's coordinates are not decoration: wherever a
 * route carries no curated fare, the quote is computed from the distance
 * between two of these, so a digit typed wrongly in a latitude field silently
 * reprices every unpriced journey through that place. Clicking a map is the
 * one input method where that mistake is visible.
 *
 * A controlled component: the caller owns the coordinates, this only reports
 * where the pin was put. That keeps the numeric fields and the pin as two
 * views of one value rather than two sources of truth — an operator who
 * already has exact coordinates can paste them and watch the pin move.
 *
 * Deliberately not a copy of `LocationPicker`, which owns a hotel's address
 * form as well as its map. Sharing one component would have meant a props
 * object that is mostly "which of the two screens is this".
 *
 * Leaflet reads `window` on import, so the library is loaded inside the effect
 * rather than at module scope. The `import type` above is erased at compile
 * time and never reaches the browser.
 */

/** Fallback view: the middle of Georgia, zoomed to show the whole country. */
const GEORGIA: [number, number] = [42.0, 43.5];

/**
 * A div marker rather than Leaflet's default image pin: the default's icon
 * URLs do not survive bundling, and this one is the panel's brand orange.
 */
const PIN_HTML =
  '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#eb6830;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>';

/**
 * Shown in place of the map when the Leaflet chunk fails to arrive — a flaky
 * connection mid-session, or a deploy that has moved the file out from under
 * an open tab. The coordinate fields still work; only the clicking does not.
 */
const MAP_LOAD_FAILED = "The map could not be loaded. Reload the page to try again.";

export function TransferPointMap({
  latitude,
  longitude,
  onChange,
}: {
  /** Null when the field is empty or unparseable — the map then shows Georgia. */
  latitude: number | null;
  longitude: number | null;
  onChange: (latitude: number, longitude: number) => void;
}) {
  const node = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  /**
   * The live callback, held in a ref.
   *
   * The map is built once on mount, so the click handler it registers would
   * otherwise close over the first render's `onChange` forever. Reading it
   * through a ref keeps the handler current without rebuilding the map — which
   * would tear down and recreate the tiles on every keystroke.
   *
   * Synced in an effect rather than assigned during render: a ref written
   * mid-render is not a value React can reason about, and this one is only
   * ever read from a Leaflet callback, which is after paint by definition.
   * Declared before the map effect so it is already current when the map is
   * built — though `useRef`'s initial value covers the first render anyway.
   */
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!node.current || mapRef.current) return;

    let cancelled = false;

    import("leaflet")
      .then((L) => {
        if (cancelled || !node.current || mapRef.current) return;

        const placed = latitude !== null && longitude !== null;

        const map = L.map(node.current).setView(
          placed ? [latitude, longitude] : GEORGIA,
          placed ? 13 : 7,
        );

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        map.on("click", (event) => onChangeRef.current(event.latlng.lat, event.latlng.lng));

        mapRef.current = map;
      })
      .catch((caught: unknown) => {
        // Without this the rejection is unhandled and the operator sees a
        // silent grey box with no explanation of why clicking does nothing.
        console.error("Leaflet failed to load:", caught);
        if (!cancelled) setLoadError(MAP_LOAD_FAILED);
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount-only. Coordinate changes reach the map through the effect below,
    // which moves the pin instead of rebuilding everything under it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Keeps the pin on whatever the fields currently say. */
  useEffect(() => {
    if (latitude === null || longitude === null) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    let cancelled = false;

    import("leaflet")
      .then((L) => {
        const map = mapRef.current;
        if (cancelled || !map) return;

        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude]);
          return;
        }

        const marker = L.marker([latitude, longitude], {
          draggable: true,
          icon: L.divIcon({
            className: "",
            html: PIN_HTML,
            iconSize: [18, 18],
            iconAnchor: [9, 18],
          }),
        }).addTo(map);

        marker.on("dragend", () => {
          const at = marker.getLatLng();
          onChangeRef.current(at.lat, at.lng);
        });

        markerRef.current = marker;
        map.panTo([latitude, longitude]);
      })
      .catch((caught: unknown) => {
        console.error("Leaflet failed to load:", caught);
        if (!cancelled) setLoadError(MAP_LOAD_FAILED);
      });

    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  return (
    <div>
      {loadError ? (
        <div
          role="alert"
          className="flex h-72 w-full items-center justify-center rounded-sm border border-line bg-surface-soft p-6 text-center text-[0.8125rem] text-muted"
        >
          {loadError}
        </div>
      ) : (
        <div
          ref={node}
          // Leaflet measures its container, so the height has to be a real one
          // rather than something the tiles grow into.
          className="h-72 w-full rounded-sm border border-line bg-surface-soft"
        />
      )}
      <p className="mt-2 text-[0.75rem] text-subtle">
        Click to place the pin, or drag it to refine. The coordinate fields stay in step both
        ways.
      </p>
    </div>
  );
}
