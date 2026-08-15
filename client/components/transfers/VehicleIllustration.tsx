import { cn } from "@/lib/utils";
import type { VehicleClass } from "@/types";

/**
 * Vehicle artwork.
 *
 * Drawn rather than photographed, on purpose. A stock photo of a specific car
 * is a promise we cannot keep — every class here is sold as "or similar", and
 * a traveller who was shown a black Mercedes has a fair complaint when a grey
 * Skoda arrives. A silhouette communicates the *class* accurately and stays
 * honest about the rest.
 *
 * Inlined as SVG for the same reasons as `components/layout/Logo.tsx`: no extra
 * request, it scales cleanly, it inherits `currentColor`, and `next/image`
 * refuses SVG without `dangerouslyAllowSVG`.
 */

interface VehicleIllustrationProps {
  vehicleClass: VehicleClass;
  className?: string;
}

/**
 * Body outlines, all drawn in the same 160×80 box so the classes sit at one
 * scale and can be compared. Roof height is the variable doing the work: a
 * traveller distinguishes a saloon from a van by how tall it is long before
 * they read the label, so the rooflines are pulled well apart — 26, 15, 11, 8
 * and 6 on the shared y-axis.
 */
const bodies: Record<VehicleClass, string> = {
  // Low three-box saloon: long bonnet, low glasshouse, separate boot.
  sedan:
    "M12 56 L14 44 Q16 40 24 39 L46 37 Q54 27 70 26 L96 26 Q110 27 118 36 L140 40 Q146 42 146 48 L146 56 Z",
  // Two-box 4×4: flatter roof, taller sides, visible ground clearance.
  suv: "M12 52 L13 34 Q14 28 22 27 L44 25 Q50 16 66 15 L100 15 Q114 16 122 26 L142 30 Q148 32 148 40 L148 52 Z",
  // MPV: one continuous box, short nose, long glasshouse.
  minivan:
    "M11 54 L12 30 Q13 22 22 21 L40 19 Q48 12 66 11 L104 11 Q122 12 132 22 L144 32 Q148 35 148 42 L148 54 Z",
  // High-roof panel van: flat roof, near-vertical rear, blunt nose.
  van: "M10 54 L10 14 Q10 8 18 8 L104 8 Q116 8 122 15 L140 32 Q148 38 148 46 L148 54 Z",
  // Coach: flat roof the full length, both ends square.
  bus: "M8 54 L8 12 Q8 6 16 6 L144 6 Q152 6 152 14 L152 54 Z",
};

/** Glazing, so each class reads at a glance rather than as an abstract blob. */
const glazing: Record<VehicleClass, string[]> = {
  sedan: ["M50 36 L64 28 L80 28 L80 36 Z", "M84 28 L98 28 L112 36 L84 36 Z"],
  suv: ["M48 24 L58 17 L80 16 L80 25 Z", "M85 16 L102 16 L116 25 L85 25 Z"],
  minivan: ["M44 19 L54 13 L78 12 L78 22 Z", "M83 12 L104 12 L120 22 L83 22 Z"],
  van: ["M18 12 L56 11 L56 26 L18 26 Z", "M62 11 L104 10 L118 26 L62 26 Z"],
  bus: [
    "M16 12 L60 12 L60 30 L16 30 Z",
    "M66 12 L104 12 L104 30 L66 30 Z",
    "M110 12 L146 12 L146 30 L110 30 Z",
  ],
};

/**
 * Wheel centres and radius per class. All five rest on the same ground line at
 * y = 67, so a taller body reads as a taller vehicle rather than a bigger one.
 */
const wheels: Record<VehicleClass, { cx: number; cy: number; r: number }[]> = {
  sedan: [
    { cx: 42, cy: 55, r: 11 },
    { cx: 116, cy: 55, r: 11 },
  ],
  suv: [
    { cx: 42, cy: 52, r: 14 },
    { cx: 118, cy: 52, r: 14 },
  ],
  minivan: [
    { cx: 40, cy: 53, r: 13 },
    { cx: 118, cy: 53, r: 13 },
  ],
  van: [
    { cx: 38, cy: 53, r: 13 },
    { cx: 120, cy: 53, r: 13 },
  ],
  bus: [
    { cx: 34, cy: 52, r: 14 },
    { cx: 126, cy: 52, r: 14 },
  ],
};

export function VehicleIllustration({ vehicleClass, className }: VehicleIllustrationProps) {
  return (
    <svg
      viewBox="0 0 160 80"
      fill="none"
      role="presentation"
      aria-hidden
      className={cn("h-auto w-full", className)}
    >
      <path d={bodies[vehicleClass]} fill="currentColor" fillOpacity="0.14" />
      <path
        d={bodies[vehicleClass]}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {glazing[vehicleClass].map((d, index) => (
        <path key={index} d={d} fill="currentColor" fillOpacity="0.22" />
      ))}
      {wheels[vehicleClass].map((wheel) => (
        <g key={wheel.cx}>
          <circle {...wheel} fill="currentColor" fillOpacity="0.12" />
          <circle {...wheel} stroke="currentColor" strokeWidth="2" />
          <circle cx={wheel.cx} cy={wheel.cy} r={wheel.r * 0.36} fill="currentColor" />
        </g>
      ))}
      {/* Ground line — grounds the vehicle instead of leaving it floating. */}
      <line
        x1="2"
        y1="67"
        x2="158"
        y2="67"
        stroke="currentColor"
        strokeWidth="2"
        strokeOpacity="0.28"
        strokeLinecap="round"
      />
    </svg>
  );
}
