/**
 * Admin panel types.
 *
 * Shaped the way a real back office would receive them — a booking references
 * the product it is for rather than embedding it, and every record carries the
 * lifecycle state the panel actually filters and acts on. Swapping the mock
 * arrays in `data/admin/` for API responses should not change these shapes.
 */

/** The three things the studio sells. Bookings and revenue split along it. */
export type ProductKind = "hotel" | "tour" | "transfer";

/**
 * Booking lifecycle. `pending` is the only state that asks something of the
 * admin, which is why the panel sorts and badges around it.
 */
export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled";

export type PaymentStatus = "unpaid" | "deposit" | "paid" | "refunded";

export interface BookingCustomer {
  name: string;
  email: string;
  phone: string;
  country: string;
}

export interface Booking {
  id: string;
  /** Human reference shown to the customer, e.g. "IG-8F2K4Q". */
  reference: string;
  kind: ProductKind;
  /** Display name of the hotel, tour or transfer class booked. */
  productName: string;
  /** Slug of the underlying product, so the panel can deep-link to it. */
  productSlug: string;
  customer: BookingCustomer;
  status: BookingStatus;
  payment: PaymentStatus;
  /** ISO date the booking was placed. */
  placedOn: string;
  /** ISO date the guest arrives or travels. */
  travelDate: string;
  /** Nights for a stay, days for a tour, 1 for a transfer. */
  nights: number;
  guests: number;
  /** Total in USD, matching `formatPrice` elsewhere in the product. */
  total: number;
  /** Which partner fulfils it, if any. */
  partnerId?: string;
  notes?: string;
}

/**
 * Partner lifecycle. A partner registers, is reviewed, and is then either
 * active or suspended — the panel's whole partner workflow is these five states.
 */
export type PartnerStatus =
  | "pending"
  | "in-review"
  | "active"
  | "suspended"
  | "rejected";

export type PartnerKind = "hotel" | "tour-operator" | "transport" | "experience";

export interface Partner {
  id: string;
  /** Trading name. */
  name: string;
  /** Registered legal entity, which is often different. */
  legalName: string;
  kind: PartnerKind;
  status: PartnerStatus;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  /** Georgian tax identification number. */
  taxId: string;
  website?: string;
  /** ISO date the application was submitted. */
  appliedOn: string;
  /** Commission the studio takes, as a percentage. */
  commissionRate: number;
  /** How many live products this partner supplies. */
  listings: number;
  /** Lifetime gross booking value attributed to them, in USD. */
  revenue: number;
  /** Compliance documents the partner has supplied. */
  documents: { label: string; received: boolean }[];
  notes?: string;
}

/** One month of the bookings-over-time series on the dashboard. */
export interface MonthlyBookings {
  /** Short month label, e.g. "Mar". */
  month: string;
  hotel: number;
  tour: number;
  transfer: number;
}

/** The signed-in operator. Prototype only — there is no real session. */
export interface AdminUser {
  name: string;
  email: string;
  role: string;
  initials: string;
}
