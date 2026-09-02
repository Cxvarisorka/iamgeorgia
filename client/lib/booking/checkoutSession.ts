"use client";

import type { Hold, Offer, StayQuery } from "@/types/booking";

/**
 * The handoff between choosing a room and filling in the guest form.
 *
 * The hold token travels in the URL, so a refresh or a back-button resumes the
 * same hold rather than taking a second one off the same room. Everything the
 * summary panel wants to *show* — the property, the room, the nightly
 * breakdown, the cancellation terms — travels in `sessionStorage` beside it,
 * because an offer token runs to a few thousand characters and has no business
 * in a URL.
 *
 * `sessionStorage` rather than `localStorage` deliberately: a checkout is one
 * tab's business, and two tabs booking two different rooms must not overwrite
 * each other's summary. Losing it is survivable — the confirm call needs only
 * the hold token, so a draft that has gone shows a reduced summary rather than
 * an error.
 */

const KEY = "iag:checkout";

export interface CheckoutDraft {
  /** Also in the URL. Read back to detect a draft belonging to another hold. */
  holdToken: string;
  hold: Hold;
  /** Kept for the nightly breakdown and the terms the guest agreed to. */
  offer: Offer;
  hotelSlug: string;
  hotelName: string;
  stay: StayQuery;
  /**
   * The kosher facility codes this property offers.
   *
   * Carried in the draft rather than re-fetched at checkout: the hotel page has
   * already loaded them, checkout has only a hold token to go on, and a second
   * request for a list that cannot have changed in the ninety seconds since
   * would be a request for nothing.
   *
   * Optional because a draft written before this existed is still a valid
   * draft — an in-flight checkout must not break on deploy.
   */
  requestableCodes?: string[];
  /**
   * Minted once per hold, not per submit.
   *
   * This is what makes a double-clicked confirm button return the first
   * booking instead of taking a second room, and it has to survive the
   * re-render that a failed submit causes — hence storing it rather than
   * generating it at submit time.
   */
  idempotencyKey: string;
}

const isBrowser = () => typeof window !== "undefined";

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(draft));
    notify();
  } catch {
    // Private-mode quota, or storage switched off. The flow still works from
    // the hold token alone, so this is not worth interrupting anyone over.
  }
}

/**
 * The draft as an external store, for `useSyncExternalStore`.
 *
 * `sessionStorage` genuinely is an external store: it exists before React does,
 * it survives a re-render, and another tab can change it. Reading it in an
 * effect and calling `setState` would work, but it costs a cascading render on
 * every mount and gives no honest way to tell "not read yet" from "nothing
 * there" — which is the difference between a skeleton and a wrong message.
 *
 * `ready` carries exactly that distinction: the server snapshot is never ready,
 * so the markup React renders on the server and the markup it hydrates with
 * agree, and the real value arrives on the first client snapshot.
 */
export interface CheckoutDraftState {
  ready: boolean;
  draft: CheckoutDraft | null;
}

type Listener = () => void;

const listeners = new Set<Listener>();

/** Frozen: `useSyncExternalStore` compares snapshots by identity. */
const SERVER_STATE: CheckoutDraftState = Object.freeze({ ready: false, draft: null });

/**
 * The parse is cached against the raw string, because `getSnapshot` is called
 * on every render and must return the same object until the value changes —
 * a fresh `JSON.parse` each time would loop React forever.
 */
let cached: { raw: string | null; state: CheckoutDraftState } | null = null;

const readRaw = (): string | null => {
  try {
    return window.sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
};

export function checkoutDraftSnapshot(): CheckoutDraftState {
  const raw = readRaw();

  if (!cached || cached.raw !== raw) {
    let draft: CheckoutDraft | null = null;

    try {
      draft = raw ? (JSON.parse(raw) as CheckoutDraft) : null;
    } catch {
      draft = null;
    }

    cached = { raw, state: { ready: true, draft } };
  }

  return cached.state;
}

export const checkoutDraftServerSnapshot = (): CheckoutDraftState => SERVER_STATE;

export function subscribeCheckoutDraft(listener: Listener): () => void {
  listeners.add(listener);
  // Fires for writes made by *other* tabs; same-tab writes notify directly.
  window.addEventListener("storage", listener);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

const notify = () => {
  cached = null;
  for (const listener of listeners) listener();
};

export function clearCheckoutDraft(): void {
  if (!isBrowser()) return;

  try {
    window.sessionStorage.removeItem(KEY);
    notify();
  } catch {
    /* nothing to clear */
  }
}

/**
 * An idempotency key for one confirmation attempt.
 *
 * `randomUUID` needs a secure context; a plain http:// origin on a LAN address
 * has none, and a checkout that throws there would be a poor trade for four
 * lines of fallback.
 */
export function newIdempotencyKey(): string {
  if (isBrowser() && typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `idem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
