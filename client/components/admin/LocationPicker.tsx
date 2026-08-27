"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap, Marker } from "leaflet";
import { Loader2, MapPin } from "lucide-react";

import "leaflet/dist/leaflet.css";

import { updateHotel } from "@/lib/api/hotels";
import { describeError } from "@/lib/api/client";
import { cn } from "@/lib/utils";
import type { Hotel } from "@/types/catalogue";

/**
 * Where the property actually is.
 *
 * A Leaflet map over OpenStreetMap tiles — no API key, no account, and the
 * tiles are free for this volume. Click places the pin, dragging it refines,
 * and the coordinate fields stay in sync both ways so a supplier who already
 * has exact coordinates can paste them instead of hunting.
 *
 * Coordinates travel as a pair or not at all: the server (and a database CHECK
 * behind it) refuses half a location, so the save button disables until both
 * are present or both are empty.
 *
 * Leaflet touches `window` at import time, so the map is created in an effect
 * and this component must never be server-rendered with it — the `ssr: false`
 * dynamic import lives at the call site.
 */

/** Fallback centre: the middle of Georgia, zoomed to show the whole country. */
const GEORGIA: [number, number] = [42.0, 43.5];

/**
 * Shown in place of the map when the Leaflet chunk fails to arrive — a flaky
 * connection mid-session, or a deploy that has moved the file out from under
 * an open tab. The fields still work; only the clicking does not.
 */
const MAP_LOAD_FAILED = "The map could not be loaded. Reload the page to try again.";

export function LocationPicker({ hotel }: { hotel: Hotel }) {
  const router = useRouter();
  const mapNode = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);

  const [address, setAddress] = useState(hotel.address ?? "");
  const [postalCode, setPostalCode] = useState(hotel.postalCode ?? "");
  const [latitude, setLatitude] = useState(hotel.latitude?.toString() ?? "");
  const [longitude, setLongitude] = useState(hotel.longitude?.toString() ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const lat = Number.parseFloat(latitude);
  const lng = Number.parseFloat(longitude);
  const hasPoint = Number.isFinite(lat) && Number.isFinite(lng);
  // The pair rule the server enforces, mirrored so the button can explain it.
  const halfPair = (latitude.trim() === "") !== (longitude.trim() === "");

  /** Moves the pin (creating it on first use) and keeps the fields in step. */
  const place = (nextLat: number, nextLng: number, { pan = false } = {}) => {
    setLatitude(nextLat.toFixed(6));
    setLongitude(nextLng.toFixed(6));

    const map = mapRef.current;
    if (!map) return;

    import("leaflet")
      .then((L) => {
        if (!markerRef.current) {
          markerRef.current = L.marker([nextLat, nextLng], {
            draggable: true,
            // A styled div rather than Leaflet's default image marker: the
            // default's icon URLs do not survive bundling, and a token-coloured
            // pin matches the panel anyway.
            icon: L.divIcon({
              className: "",
              html: '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;background:#b3261e;border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
              iconSize: [18, 18],
              iconAnchor: [9, 18],
            }),
          }).addTo(map);

          markerRef.current.on("dragend", () => {
            const at = markerRef.current!.getLatLng();
            setLatitude(at.lat.toFixed(6));
            setLongitude(at.lng.toFixed(6));
          });
        } else {
          markerRef.current.setLatLng([nextLat, nextLng]);
        }

        if (pan) map.panTo([nextLat, nextLng]);
      })
      .catch((caught: unknown) => {
        console.error("Leaflet failed to load:", caught);
        setMapError(MAP_LOAD_FAILED);
      });
  };

  useEffect(() => {
    if (!mapNode.current || mapRef.current) return;

    let cancelled = false;

    import("leaflet")
      .then((L) => {
        if (cancelled || !mapNode.current || mapRef.current) return;

        const start: [number, number] = hasPoint
          ? [lat, lng]
          : hotel.destination?.latitude != null && hotel.destination.longitude != null
            ? [hotel.destination.latitude, hotel.destination.longitude]
            : GEORGIA;

        const map = L.map(mapNode.current).setView(start, hasPoint ? 15 : 8);

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        map.on("click", (event) => place(event.latlng.lat, event.latlng.lng));
        mapRef.current = map;

        if (hasPoint) place(lat, lng);
      })
      .catch((caught: unknown) => {
        // Without this the rejection is unhandled and the operator sees a
        // silent grey box with no explanation of why clicking does nothing.
        console.error("Leaflet failed to load:", caught);
        if (!cancelled) setMapError(MAP_LOAD_FAILED);
      });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // Mount-only: later coordinate changes reach the map through `place`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await updateHotel(hotel.id, {
        address: address.trim() || null,
        postalCode: postalCode.trim() || null,
        ...(hasPoint ? { latitude: lat, longitude: lng } : {}),
      });
      setMessage("Location saved.");
      router.refresh();
    } catch (caught) {
      setError(describeError(caught));
    } finally {
      setBusy(false);
    }
  };

  const field =
    "h-10 w-full rounded-sm border border-line bg-surface px-3 text-[0.8125rem] text-ink outline-none focus:border-ink";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="text-[0.8125rem] font-medium text-ink">Street address</span>
          <input
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="18 Kiacheli Street, Vera, Tbilisi"
            className={cn(field, "mt-1")}
          />
        </label>

        <label className="block sm:max-w-48">
          <span className="text-[0.8125rem] font-medium text-ink">Postal code</span>
          <input
            value={postalCode}
            onChange={(event) => setPostalCode(event.target.value)}
            placeholder="0108"
            className={cn(field, "mt-1")}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-[0.8125rem] font-medium text-ink">Latitude</span>
            <input
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              onBlur={() => hasPoint && place(lat, lng, { pan: true })}
              inputMode="decimal"
              placeholder="41.7151"
              className={cn(field, "mt-1 tabular-nums")}
            />
          </label>
          <label className="block">
            <span className="text-[0.8125rem] font-medium text-ink">Longitude</span>
            <input
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              onBlur={() => hasPoint && place(lat, lng, { pan: true })}
              inputMode="decimal"
              placeholder="44.8271"
              className={cn(field, "mt-1 tabular-nums")}
            />
          </label>
        </div>

        <p className="text-[0.75rem] text-muted">
          Click the map to place the pin, or drag it. Coordinates are a pair — the property is
          either on the map or it is not.
        </p>

        <div className="mt-auto flex items-center gap-3">
          <button
            type="button"
            disabled={busy || halfPair}
            onClick={() => void save()}
            className="inline-flex h-10 items-center gap-2 rounded-sm bg-brand px-4 text-[0.8125rem] font-semibold text-white transition-colors hover:bg-brand-hover disabled:pointer-events-none disabled:opacity-50"
          >
            {busy ? (
              <Loader2 size={15} className="animate-spin" aria-hidden />
            ) : (
              <MapPin size={15} aria-hidden />
            )}
            Save location
          </button>
          <p aria-live="polite" className="text-[0.75rem]">
            {error ? (
              <span className="text-error-text">{error}</span>
            ) : halfPair ? (
              <span className="text-warning-text">Enter both coordinates, or clear both.</span>
            ) : (
              <span className="text-muted">{message}</span>
            )}
          </p>
        </div>
      </div>

      {mapError ? (
        <div
          role="alert"
          className="flex h-80 w-full items-center justify-center rounded-sm border border-line bg-surface-soft p-6 text-center text-[0.8125rem] text-muted lg:h-full lg:min-h-96"
        >
          {mapError}
        </div>
      ) : (
        <div
          ref={mapNode}
          role="application"
          aria-label="Map. Click to set the property's position."
          className="h-80 w-full rounded-sm border border-line lg:h-full lg:min-h-96"
        />
      )}
    </div>
  );
}
