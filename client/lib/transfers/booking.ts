/**
 * The booking draft, carried from the checkout form to the confirmation screen.
 *
 * Passenger details deliberately do not travel in the URL — a name, email and
 * phone number have no business sitting in a shareable link, even in a
 * prototype. `sessionStorage` keeps them on the tab and drops them when it
 * closes. Nothing is sent anywhere; there is no request and no server.
 */

const STORAGE_KEY = "iag_transfer_booking";

export interface TransferBookingDraft {
  reference: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  flightNumber: string;
  pickupNote: string;
  specialRequests: string;
  /** The offer and journey, so confirmation can render without the URL. */
  offerSlug: string;
  createdAt: string;
}

/** "IG-8F2K4Q" — the shape of a real supplier reference, generated locally. */
export function createReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `IG-${code}`;
}

export function saveBookingDraft(draft: TransferBookingDraft): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    // Private browsing modes can refuse storage. The confirmation screen falls
    // back to the URL, so losing the draft degrades rather than breaks.
  }
}

/**
 * `useSyncExternalStore` adapter for the draft.
 *
 * The snapshot has to be referentially stable or React re-renders forever, so
 * the parsed object is cached against the raw string and only rebuilt when the
 * stored value actually changes.
 */
let cachedRaw: string | null = null;
let cachedDraft: TransferBookingDraft | null = null;

export function getBookingDraftSnapshot(): TransferBookingDraft | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      cachedDraft = raw ? (JSON.parse(raw) as TransferBookingDraft) : null;
    }
  } catch {
    cachedRaw = null;
    cachedDraft = null;
  }
  return cachedDraft;
}

/** There is no draft during the server render — the URL carries everything else. */
export function getBookingDraftServerSnapshot(): TransferBookingDraft | null {
  return null;
}

export function subscribeToBookingDraft(onChange: () => void): () => void {
  // `storage` only fires for *other* tabs, which is exactly the case this
  // cannot otherwise notice; same-tab writes always come with a navigation.
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function clearBookingDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    cachedRaw = null;
    cachedDraft = null;
  } catch {
    // Nothing to do — the draft is disposable by design.
  }
}
