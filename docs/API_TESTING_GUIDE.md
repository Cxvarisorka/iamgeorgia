# API Testing Guide

Everything a tester needs to exercise the "I am Georgia" API by hand or through
the Postman collection in [`postman/`](postman/).

Each endpoint is listed with **what to send** and **exactly what should come
back** — both when it works and when it does not. If you get something else,
that is a bug worth raising.

> **Before you start:** the API must be running. See
> [LOCAL_SETUP.md](LOCAL_SETUP.md).
> Base URL for local testing: `http://localhost:5000`

---

## Part 1 — Ground rules

Read this section once. It explains conventions that apply to every endpoint and
will save you filing false bugs.

### 1.1 Everything lives under `/api`

The only exceptions are the two health checks (`/health`, `/health/db`) and, in
local development only, `/media/*` for uploaded files.

### 1.2 Authentication is a cookie, not a token

Signing in sets an `httpOnly` cookie named **`iag_session`**. There is no bearer
token and no `Authorization` header anywhere in this API.

- **In Postman:** nothing to do. Postman's cookie jar stores it automatically
  after `POST /api/auth/login` and sends it on every later request.
- **In a browser / fetch:** you must send `credentials: 'include'`.
- **In curl:** use a cookie jar — `curl -c jar.txt -b jar.txt ...`

The session slides forward as you use it (30 days by default) but has a hard
ceiling of 90 days from creation. Deactivating a user kills their access on the
**next request**, not when the cookie expires.

### 1.3 Every error has the same shape

```json
{ "error": { "message": "Human-readable explanation" } }
```

Some errors add `details`:

```json
{
  "error": {
    "message": "Invalid request body",
    "details": [
      { "code": "invalid_type", "path": ["leadGuest", "email"], "message": "Required" }
    ]
  }
}
```

`details` is either a **zod issue array** (for a `400`) or a **structured
object** (for a domain conflict, e.g. `{ "reason": "PRICE_CHANGED" }`).

**Never expect a bare string body or a plain-text error.** If you see one, that
is a bug.

### 1.4 Money is always integer minor units

`52500` means **525.00 GEL**, not 52,500. Every amount travels with a
`currency`, and every field name ends in `Cents`. Floating-point money never
appears anywhere in this API.

### 1.5 Dates are calendar strings, not timestamps

Stay dates are `"2027-06-01"` — a date at the property, never an instant.
**Check-out is exclusive**: `checkIn: 2027-06-01`, `checkOut: 2027-06-04` is
three nights.

Pick-up times and cancellation deadlines *are* instants, and appear as full ISO
strings: `"2027-06-01T10:00:00.000Z"`.

### 1.6 Lists are always paginated the same way

```json
{ "data": [ ... ], "total": 137, "page": 1, "pageSize": 24, "totalPages": 6 }
```

Send `?page=` and `?pageSize=`. Page sizes are capped (24–25 default, 50–100
max depending on the endpoint); asking for more is a `400`, not a silent clamp.

### 1.7 Some fields are invisible unless you are staff

Fields marked **staff-only** in this guide are **absent from the JSON entirely**
— not `null`, not `0` — unless the caller is an admin or the supplier that owns
the hotel.

The ones to watch: `netCents`, `netTotalCents`, `markupBps`, `marginCents`,
`partner`, and a transfer quote's `legs[].source`.

**Test this deliberately.** Call the same endpoint anonymously and as an admin
and diff the responses. A `netCents` leaking to an anonymous caller is a
**severity-1 bug** — it exposes the platform's margin.

### 1.8 No endpoint accepts an amount

Not search, not checkout, not booking. Request bodies carry identifiers, dates
and people; **every figure is recomputed on the server**. The booking schemas
are `.strict()`, so sending `{ "totalCents": 1 }` is a `400`, not a silently
ignored field.

This is the single most important thing to try to break. If you ever manage to
influence a price from the request body, stop and report it.

### 1.9 Prices travel as signed tokens

Search hands you an **offer token** (hotels) or **quote token** (transfers). It
is a signed blob naming the room, the rate, the dates and the price. You carry
it into checkout unchanged.

- Editing a single character of a token → **`400`** (signature check fails).
- Using one older than 30 minutes → **`410 Gone`**.
- Using one whose underlying price has moved → **`409`** with both figures.

### 1.10 Cross-site protection

Every state-changing request (POST/PATCH/PUT/DELETE) is checked against the
browser-set `Origin` and `Sec-Fetch-Site` headers. A request from an origin
other than `CLIENT_ORIGIN` gets **`403 Cross-site requests are not accepted`**.

**Requests carrying neither header pass.** That is deliberate — a browser cannot
suppress those headers on a cross-origin write, so a request without them came
from curl, Postman or a server integration, none of which has an ambient cookie
jar to exploit.

> **Practical effect for you:** Postman and curl work with no extra setup. To
> *test* the protection, add a header `Origin: https://evil.example.com` to any
> POST and expect a `403`.

### 1.11 Rate limits

| Limit | Window | Counted per | Env variable |
| --- | --- | --- | --- |
| 100 requests | 1 minute | IP, across everything except `/health` | `RATE_LIMIT_GLOBAL` |
| 30 requests | 1 minute | IP, on `/api/search/*` only | — |
| 10 **failed** sign-ins | 15 minutes | IP **and** email combined | `AUTH_LOGIN_LIMIT` |
| 5 wrong current-passwords | 15 minutes | signed-in user | `AUTH_PASSWORD_CHANGE_LIMIT` |
| 5 reset links | 15 minutes | email address, wherever asked from | `AUTH_FORGOT_PASSWORD_LIMIT` |
| 30 token lookups | 15 minutes | IP | `AUTH_TOKEN_LOOKUP_LIMIT` |
| 5 invitation claims | 1 hour | IP | `AUTH_REGISTRATION_LIMIT` |

Over the limit → **`429`** with `{ "error": { "message": "Too many ..." } }` and
standard `RateLimit-*` response headers.

Two details that matter when testing:

- The login limiter uses `skipSuccessfulRequests` — **a successful login does
  not count**. Only failures do.
- Locally, counters live in the server process's memory. **Restarting the
  server clears every limit.** That is your reset button.

### 1.12 Status codes you should expect

| Code | Means | Typical cause |
| --- | --- | --- |
| `200` | Success | Read, update, or a replayed idempotent create |
| `201` | Created | A new booking, hold, partner or amenity |
| `204` | Success, no body | Logout, releasing a hold, password change/reset |
| `400` | Bad input | zod validation failed; `details` says which field |
| `401` | Not signed in | Missing, expired or revoked session cookie |
| `403` | Signed in, not allowed | Wrong role, unapproved partner, cross-site write |
| `404` | Not there | Also what you get for *someone else's* record — see below |
| `409` | Conflict | Price moved, sold out, duplicate slug, wrong status |
| `410` | Gone | Expired offer/quote token |
| `413` | Too large | Body over 100 KB, or an oversized upload |
| `422` | Understood but unprocessable | Publish blocked by checklist; transfer window rules |
| `429` | Rate limited | See above |
| `500` | Server error | Always a bug. Capture the request and the server log. |
| `503` | Dependency down | `/health/db` when Postgres is unreachable |

**`404` versus `403` is intentional.** Asking for another supplier's hotel
returns `404`, not `403` — telling you "that exists but is not yours" would
confirm the record exists. Do not file this as a bug.

---

## Part 2 — Health

### `GET /health`

Liveness. Deliberately does not touch the database, so an orchestrator will not
restart a healthy API over a slow query.

**Expected — 200**

```json
{ "status": "ok", "uptime": 128.44 }
```

### `GET /health/db`

Readiness. Runs `SELECT NOW()`.

**Expected — 200**

```json
{ "status": "ok", "now": "2026-08-30T09:12:44.180Z" }
```

**Expected — 503** when Postgres is down:

```json
{ "status": "error", "message": "Database unavailable" }
```

> Note it reports failure as a `503` **response**, not as a thrown error, so it
> never reaches the generic error handler. Both health routes are exempt from
> the global rate limit.

---

## Part 3 — Authentication

All under `/api/auth`. Every response here carries `Cache-Control: no-store`
and `Vary: Cookie` — worth asserting, because an authenticated response sitting
in a shared cache is a real security bug.

### `POST /api/auth/login`

```json
{ "email": "you@example.com", "password": "Str0ngLocalPass!" }
```

**Expected — 200**, plus a `Set-Cookie: iag_session=...; HttpOnly; SameSite=...`

```json
{
  "user": {
    "id": "clx...", "email": "you@example.com",
    "firstName": "Your", "lastName": "Name",
    "role": "SUPER_ADMIN", "isActive": true
  },
  "partner": null
}
```

`partner` is `null` for staff, and the full partner record for a partner user.

| Scenario | Expected |
| --- | --- |
| Wrong password | `401` — *"Incorrect email address or password"* |
| Unknown email | `401` — the **same** message. Different wording would let someone enumerate accounts. |
| Deactivated account | `401` |
| Missing `password` field | `400` with a zod `details` array |
| `email` not an email | `400` |
| 11th consecutive failure | `429` — *"Too many sign-in attempts. Try again later."* |

> **Check the cookie flags.** `HttpOnly` must be present. Missing it means
> JavaScript can read the session — report immediately.

### `POST /api/auth/logout`

No body. **Expected — `204`, no content**, plus a `Set-Cookie` that clears the
session.

Calling it **without** a session is also `204`. Logging out of nothing has
succeeded by any definition the caller cares about — this is not a bug.

### `GET /api/auth/me`

**Expected — 200**, the same `{ user, partner }` shape as login.
Without a cookie: **`401`**.

Use this as your "am I still signed in?" probe throughout a test run.

### `GET /api/auth/activation/:token`

Reads an activation link before the password is set, so the page can greet the
holder by name.

**Expected — 200**

```json
{
  "email": "nino@partner.ge",
  "firstName": "Nino", "lastName": "Beridze",
  "companyName": "Alpine Tours LLC",
  "expiresAt": "2026-09-01T09:00:00.000Z"
}
```

| Scenario | Expected |
| --- | --- |
| Token already used | `410` or `404` |
| Token expired | `410` |
| Token under 20 characters | `400` — rejected before it reaches the database |
| 31st lookup in 15 minutes | `429` |

### `POST /api/auth/activation/:token`

```json
{ "password": "a-strong-password-12+" }
```

**Expected — 200** with `{ user, partner }` **and a session cookie**. The user
is signed in immediately — sending someone who just proved control of their
mailbox back to a login form would be pointless.

| Scenario | Expected |
| --- | --- |
| Password under 12 characters | `400` — *"Use at least 12 characters"* |
| A common password (`password123`) | `400` — *"That password is too common"* |
| Password containing their own name or email local-part | `400` |
| Re-using the same token | `410`/`404` — single use |

### `POST /api/auth/password/forgot`

```json
{ "email": "you@example.com" }
```

**Expected — `204`, always.** Whether or not the address has an account, whether
or not the account is active. Any other behaviour would turn this endpoint into
an account-enumeration oracle.

**How to verify it actually worked:** look in the server terminal.
`MAIL_TRANSPORT=log` prints the reset email, link included.

Sixth request for the same address within 15 minutes → **`429`**. Note the
counter is keyed on **what was typed**, not on what was found, so it still
reveals nothing.

### `POST /api/auth/password/reset/:token`

```json
{ "password": "a-new-strong-password" }
```

**Expected — `204`**, and the session cookie is **cleared**. Unlike activation,
a reset does *not* sign you in: this is the flow someone uses when they suspect
their account was reachable by someone else, so it ends every session and makes
them sign in deliberately.

Verify afterwards that the old password gives `401` and the new one gives `200`.

### `POST /api/auth/password/change`

Requires a live session.

```json
{ "currentPassword": "old-one", "newPassword": "a-new-strong-one" }
```

**Expected — `204`**, plus a **fresh** session cookie. The change revokes every
session the account had — including this one — so the device doing the changing
is handed a new cookie rather than being signed out for its trouble.

| Scenario | Expected |
| --- | --- |
| Wrong `currentPassword` | `401` |
| `newPassword` identical to `currentPassword` | `400` — *"Choose a password you have not used here before"* |
| Weak `newPassword` | `400` |
| Not signed in | `401` |
| 6th wrong attempt in 15 minutes | `429` (counted per **user**, not per IP) |

**Worth testing explicitly:** sign in on two Postman environments, change the
password on one, then call `/api/auth/me` on the other. It must be `401`.

---

## Part 4 — Public catalogue

No authentication. These are the marketing pages' data.

### `GET /api/destinations`

Query: `locale` (`en`/`ka`/`ru`/`he`), `countryCode`, `featured`

**Expected — 200**, the whole tree, nested:

```json
{
  "data": [
    {
      "id": "clx...", "slug": "georgia", "name": "Georgia",
      "type": "COUNTRY", "path": "/georgia",
      "children": [
        { "slug": "tbilisi", "name": "Tbilisi", "type": "CITY", "children": [] }
      ]
    }
  ]
}
```

`?locale=ka` returns Georgian names, **falling back to English field by field**
where a translation is missing — never a blank string.

### `GET /api/destinations/:slug`

**Expected — 200**, detail with `parent` and `children`.
Unknown slug → **`404`**.

### `GET /api/hotels`

Browsing, **not** searching — no dates, so no availability is checked. This
answers "what properties exist in Bakuriani".

Query: `search`, `destinationSlug`, `destinationPath`, `propertyType`,
`minStars`, `amenity` (repeatable), `featured`, `locale`, `page`, `pageSize`

**Expected — 200**

```json
{
  "data": [{
    "id": "clx...", "slug": "gudauri-alpine-hotel", "name": "Gudauri Alpine Hotel",
    "propertyType": "Hotel", "starRating": 4,
    "destination": { "slug": "gudauri", "name": "Gudauri" },
    "coverImage": { "url": "https://..." },
    "priceFrom": { "amountCents": 21000, "currency": "GEL" }
  }],
  "total": 9, "page": 1, "pageSize": 24, "totalPages": 1
}
```

**Things to verify here:**

1. **Only `ACTIVE` hotels are ever returned** — whatever the query string says.
   There is no combination of parameters that reaches a `DRAFT`. Try
   `?status=DRAFT`; you should get either a `400` or the ACTIVE list, never a
   draft.
2. **`priceFrom` is viewer-relative.** Anonymous callers see the platform
   default markup; a signed-in partner sees theirs. Call it both ways and expect
   *different numbers* — that is correct, not a bug.
3. `priceFrom` is **indicative** and rounded to whole currency units. A price
   without dates is not an offer.
4. Catalogue cards never carry `status`, `supplierId` or inventory data, even
   for a partner. That belongs to the extranet, not the shop window.

### `GET /api/hotels/:slug`

**Expected — 200**, the full property: `roomTypes[]` (each with its own
`priceFrom`), `amenities[]`, `images[]`, `childPolicy`, address, coordinates.

The hotel-level `priceFrom` always equals the cheapest room's, so the header and
the room list can never disagree.

Unknown or non-ACTIVE slug → **`404`**.

### `GET /api/amenities`

Query: `category`, `scope`, `locale`

**Expected — 200** — `{ "data": [{ "id", "slug", "name", "category", "icon" }] }`

Deactivated amenities are never returned. `includeInactive` is stripped from
public queries before the service sees it, so it cannot be forced from the URL.

---

## Part 5 — Hotel search and booking

This is the core money path. Test it end to end and in that order — each step
consumes a token from the one before.

```
GET /api/search  ──▶ offer token
                       │
                       ├──▶ POST /api/bookings/holds  ──▶ hold token
                       │                                     │
                       └──▶ POST /api/bookings ◀──────────────┘
                                   │
                                   ├──▶ GET  /api/bookings/:reference
                                   ├──▶ PATCH /api/bookings/:reference
                                   └──▶ POST /api/bookings/:reference/cancel
```

### `GET /api/search`

**Required:** `checkIn`, `checkOut`
**Optional:** `adults` (default 2), `childAges` (repeatable), `rooms`
(default 1), `destinationSlug`, `destinationPath`, `countryCode`,
`propertyType`, `minStars`, `amenity` (repeatable), `mealPlan`,
`refundableOnly`, `locale`, `page`, `pageSize`

```
GET /api/search?checkIn=2027-06-01&checkOut=2027-06-04&adults=2&destinationSlug=gudauri
```

**Expected — 200**

```json
{
  "data": [{
    "id": "clx...", "slug": "gudauri-alpine-hotel", "name": "Gudauri Alpine Hotel",
    "starRating": 4,
    "destination": { "name": "Gudauri", "path": "/georgia/gudauri" },
    "startingFrom": { "totalCents": 52500, "perNightCents": 17500, "currency": "GEL" },
    "mealPlans": ["BB"], "refundable": true, "offerCount": 3,
    "cheapestOffer": {
      "token": "eyJ...signed...",
      "roomTypeId": "clx...", "ratePlanId": "clx...",
      "name": "Breakfast, flexible",
      "terms": {
        "mealPlan": { "code": "BB", "name": "Bed & Breakfast" },
        "cancellation": { "kind": "FLEXIBLE", "freeUntil": "2027-06-01T10:00:00.000Z", "refundable": true },
        "payment": { "timing": "PAY_NOW", "depositBps": null }
      },
      "quote": {
        "currency": "GEL",
        "nights": [{ "date": "2027-06-01", "sellCents": 17500 }],
        "taxes": { "includedCents": 0, "payableAtPropertyCents": 0, "applied": [] },
        "totals": { "nights": 3, "roomCents": 52500, "totalCents": 52500 }
      },
      "occupancy": { "extraBedsNeeded": 0, "extraGuests": 0 },
      "availableUnits": 5,
      "freeCancellationUntil": "2027-06-01T10:00:00.000Z"
    }
  }],
  "total": 1, "page": 1, "pageSize": 24, "totalPages": 1
}
```

**Staff-only inside `quote`:** `nights[].netCents`, `totals.netCents`,
`markupBps`, `marginCents`. Confirm they are absent anonymously.

| Scenario | Expected |
| --- | --- |
| `checkOut` before or equal to `checkIn` | `400` — *"Check-out must be after check-in"* |
| Missing `checkIn` | `400` |
| `checkIn=01/06/2027` (wrong format) | `400` — *"Use a calendar date, for example 2026-12-20"* |
| Stay longer than 30 nights | `400` (`HOTEL_MAX_STAY_NIGHTS`) |
| Dates beyond ~540 days out | `400`/`422` (`HOTEL_BOOKING_HORIZON_DAYS`) |
| `adults=0` or `adults=99` | `400` (range 1–30) |
| `pageSize=500` | `400` (max 50) |
| Nothing available | **`200` with `data: []`** — an empty result is an answer, not an error |
| 31st search in a minute | `429` |

> **Repeated parameters make arrays:**
> `?amenity=wifi&amenity=parking&childAges=4&childAges=9`.
> Ages, not a count — a hotel cannot price a child without knowing how old it
> is, and an 11- and 12-year-old may be a child and an adult at the same
> property.

### `GET /api/search/hotels/:slug`

Same stay parameters, availability for one property grouped by room type.

**Expected — 200** — `{ "hotelId", "nights", "roomTypes": [...] }`, each room
type carrying its own offers.

### `POST /api/search/offers/quote`

Re-prices an offer before checkout.

```json
{ "token": "eyJ...signed..." }
```

**Expected — 200** — the offer again, re-priced from live data.

| Scenario | Expected |
| --- | --- |
| Price moved since the token was issued | `409` — `details: { "reason": "PRICE_CHANGED", "quotedCents": 52500, "currentCents": 55000 }` |
| Sold out | `409` — `details: { "reason": "UNAVAILABLE" }` |
| Token older than 30 minutes | `410` |
| Token altered by one character | `400` |
| Any extra field in the body | `400` — the schema is `.strict()` so nothing about money can ride along |

### `POST /api/bookings/holds`

Secures the rooms while the guest fills in their details.

```json
{ "token": "eyJ...offer token..." }
```

**Expected — 201**

```json
{
  "token": "hold-token-...",
  "expiresAt": "2026-08-30T09:27:00.000Z",
  "checkIn": "2027-06-01", "checkOut": "2027-06-04",
  "rooms": 1, "currency": "GEL", "totalCents": 52500,
  "hotel": { "id": "clx...", "name": "Gudauri Alpine Hotel", "slug": "gudauri-alpine-hotel" },
  "roomTypeName": "Deluxe Double", "ratePlanName": "Breakfast, flexible"
}
```

Holds last 15 minutes (`HOTEL_HOLD_TTL_MS`) and expired ones are swept back into
availability every 30 seconds.

| Scenario | Expected |
| --- | --- |
| The last room went while you were deciding | `409` |
| Expired offer token | `410` |

> **The oversell test.** Find a room type with `availableUnits: 1`, then fire two
> holds at the same moment. Exactly one must get `201` and the other `409`.
> Availability is enforced by a conditional `UPDATE` whose `WHERE` clause *is*
> the check, so there is no window in which both can win. Two `201`s here is a
> severity-1 bug.

### `DELETE /api/bookings/holds/:token`

**Expected — `204`, always** — including for a token that never existed or has
already expired. Releasing nothing has succeeded. Not a bug.

Verify the room count goes back up immediately afterwards rather than waiting
for the sweeper.

### `POST /api/bookings`

The confirmation. **Send an `Idempotency-Key` header.**

```json
{
  "holdToken": "hold-token-...",
  "leadGuest": {
    "firstName": "Nino", "lastName": "Beridze",
    "email": "nino@example.com", "phone": "+995555123456"
  },
  "guests": [
    { "type": "ADULT", "firstName": "Nino", "lastName": "Beridze" },
    { "type": "CHILD", "firstName": "Luka", "lastName": "Beridze", "age": 9 }
  ],
  "specialRequests": "High floor if possible",
  "source": "web"
}
```

Send **either** `holdToken` **or** `offerToken` — never both, never neither.
`offerToken` exists for server-to-server bookings that have no checkout page.

**Expected — 201**

```json
{
  "reference": "BKG-000001", "status": "CONFIRMED",
  "hotel": { "id": "clx...", "name": "Gudauri Alpine Hotel", "slug": "gudauri-alpine-hotel" },
  "hotelSnapshot": { "name": "...", "address": "...", "phone": "...", "timezone": "Asia/Tbilisi" },
  "checkIn": "2027-06-01", "checkOut": "2027-06-04", "nights": 3, "rooms": 1,
  "leadGuestName": "Nino Beridze", "leadGuestEmail": "nino@example.com",
  "currency": "GEL", "totalCents": 52500, "payableAtPropertyCents": 0,
  "bookingRooms": [{
    "id": "clx...", "status": "CONFIRMED",
    "roomTypeName": "Deluxe Double", "ratePlanName": "Breakfast, flexible",
    "mealPlan": { "code": "BB", "name": "Bed & Breakfast" },
    "bedConfiguration": "1 x King Bed",
    "cancellation": {
      "freeUntil": "2027-06-01T10:00:00.000Z",
      "windows": [{ "fromAt": null, "toAt": "2027-06-01T10:00:00.000Z", "chargeCents": 0 }]
    },
    "sellSubtotalCents": 52500,
    "nights": [{ "date": "2027-06-01", "sellCents": 17500 }],
    "guests": [{ "type": "ADULT", "firstName": "Nino", "isLead": true }]
  }]
}
```

**Staff-only:** `netTotalCents`, `markupBps`, `marginCents`, `partner`, and each
night's `netCents`.

| Scenario | Expected |
| --- | --- |
| **Same `Idempotency-Key` sent again** | **`200`** (not `201`) with the *identical* booking. No second reference. |
| Both `holdToken` and `offerToken` | `400` — *"Provide either a holdToken or an offerToken, not both"* |
| Neither | `400` |
| Any amount field, e.g. `"totalCents": 1` | `400` — the schema is `.strict()` |
| `leadGuest.email` missing or malformed | `400` |
| Hold already expired | `409`/`410` |
| Room sold out between hold and confirm | `409` |

> **The idempotency test is the important one.** Send the same request with the
> same `Idempotency-Key` five times. You must end with exactly **one** booking
> reference: one `201` and four `200`s. Two references means we have
> double-booked a guest.

**Also verify the snapshot.** After booking, rename the room type in the admin
panel, then re-read the booking. It must still show the **old** name. Names come
from the frozen snapshot, not the live hotel — a property that renames a room in
March cannot change what a guest who booked in January was sold.

### `GET /api/bookings/:reference`

- **Signed-in admin or the owning partner:** the session proves it. No query
  needed.
- **Anonymous guest:** must add `?email=` matching the lead guest's address.

**Expected — 200**, the booking detail above.

| Scenario | Expected |
| --- | --- |
| Anonymous, no `email` | `404` (or `401`) — never the booking |
| Anonymous, **wrong** `email` | `404` — never "wrong email", which would confirm the reference exists |
| Another partner's booking | `404`, not `403` |
| Unknown reference | `404` |

### `GET /api/bookings/:reference/cancellation-quote`

**Expected — 200**

```json
{ "chargeCents": 0, "refundCents": 52500, "currency": "GEL", "refundable": true }
```

Read off the **schedule frozen at confirmation**. The hotel's current policy is
never consulted — terms tightened later cannot change what an earlier guest is
owed. Worth testing: tighten the policy in admin, re-read the quote, confirm the
numbers have not moved.

### `PATCH /api/bookings/:reference`

**Paperwork only.**

```json
{
  "leadGuest": { "firstName": "Nino", "phone": "+995555999888" },
  "specialRequests": "Late arrival, around 23:00",
  "email": "nino@example.com"
}
```

The top-level `email` is **not** a new address — it is the proof an anonymous
guest offers that the booking is theirs, the same as on cancel. The address
being *changed* is `leadGuest.email`.

**Expected — 200**, the full booking detail with the changes applied.

| Scenario | Expected |
| --- | --- |
| Any of `checkIn`, `checkOut`, `rooms`, `roomTypeId`, `totalCents` | `400` — not in the schema, on purpose |
| Booking already `CANCELLED` / `COMPLETED` | `409`, carrying the status |
| Wrong or missing `email`, anonymously | `404` |

> Dates, rooms, board and party are deliberately unreachable. Changing any of
> them means releasing inventory and re-quoting: cancel and book again. Allowed
> only while `PENDING` or `CONFIRMED`.

### `POST /api/bookings/:reference/cancel`

```json
{ "reason": "Change of plans", "email": "nino@example.com" }
```

Both fields optional (`email` only for anonymous guests). An empty body `{}` is
valid.

**Expected — 200**

```json
{
  "reference": "BKG-000001", "status": "CANCELLED",
  "cancellation": { "chargeCents": 0, "refundCents": 52500, "currency": "GEL", "refundable": true }
}
```

Then verify: the room is back in availability, and cancelling again returns
`409`.

### `GET /api/partner/bookings`

Requires an **approved** partner session. Query: `status`, `from`, `to`,
`search`, `page`, `pageSize`.

**Expected — 200**, a paginated list of that partner's bookings only. Scoping
happens **in the query**, not as a filter afterwards, so there is no path by
which one partner reads another's.

| Scenario | Expected |
| --- | --- |
| Not signed in | `401` |
| Partner still `PENDING_APPROVAL` | `403` with `details: { "partnerStatus": "PENDING_APPROVAL" }` |
| Suspended partner | `403` |
| `?partnerId=<someone else>` | Ignored — you still get only your own |

### `GET /api/partner/dashboard`

**Expected — 200**

```json
{
  "partner": { "...": "full partner detail" },
  "stats": { "listings": 3, "bookings": 41, "upcoming": 7, "cancelled": 2 }
}
```

`upcoming` counts `CONFIRMED` bookings whose check-in is today or later.

---

## Part 6 — Transfers

The same shape as hotels — a signed quote carried into an idempotent booking —
with one structural difference: **there is no inventory and there are no
holds.** A private transfer is dispatched from an elastic fleet, so nothing has
to be claimed. What can stop a sale is a road closing, which is a blackout.

### Catalogue

| Endpoint | Notes |
| --- | --- |
| `GET /api/transfers/points` | The location picker. `?search&kind&popular&locale` — matches names, regions, IATA codes and every translation |
| `GET /api/transfers/routes` | `?tier&category&featured&fromSlug&toSlug&search&locale&page&pageSize` |
| `GET /api/transfers/routes/:slug` | Route landing page, with `stops[]` |
| `GET /api/transfers/vehicles` | The fleet. `?vehicleClass&kind&locale` |
| `GET /api/transfers/vehicles/:slug` | |
| `GET /api/transfers/extras` | Child seats, ski carriage, extra stops |

All return `200` with `{ "data": [...] }`; the route list is paginated. Only
`ACTIVE` rows are ever returned.

> **Fleet visibility is viewer-dependent, exactly like hotels.** A vehicle class
> is B2B by default: anonymous callers see only `b2cEnabled` classes, a
> signed-in partner sees the whole active fleet. Compare the two responses —
> the partner's should be a superset.

### `GET /api/transfers/quotes`

**Required:** `from`, `to` (point slugs *or* ids), `date`, `time` (`HH:MM`,
24-hour, local to the pick-up point)
**Optional:** `tripType` (`ONE_WAY`/`RETURN`), `returnDate`, `returnTime`,
`adults` (default 2), `children`, `childAges`, `luggage` (default 2),
`cabinBags`, `extra` (repeatable), `locale`

```
GET /api/transfers/quotes?from=tbilisi-airport&to=gudauri&date=2027-02-10&time=09:00&adults=2&luggage=2&extra=childSeat
```

**Expected — 200**

```json
{
  "from": { "slug": "tbilisi-airport", "name": "Tbilisi International Airport",
            "kind": "AIRPORT", "code": "TBS", "region": "Tbilisi", "timezone": "Asia/Tbilisi" },
  "to":   { "slug": "gudauri", "name": "Gudauri", "kind": "RESORT" },
  "route": { "slug": "tbilisi-airport-to-gudauri", "tier": "TIER_1",
             "distanceKm": 128, "startingFromCents": 12776 },
  "closed": false,
  "offers": [{
    "token": "eyJ...signed...",
    "vehicle": {
      "slug": "comfort-sedan-private-transfer", "name": "Comfort Sedan",
      "vehicleClass": "COMFORT", "body": "sedan", "kind": "PRIVATE",
      "maxPassengers": 3, "features": ["airConditioning", "englishDriver"]
    },
    "quote": {
      "currency": "GEL", "perSeat": false,
      "legs": [{
        "direction": "OUTBOUND", "from": "Tbilisi International Airport", "to": "Gudauri",
        "pickupAt": "2027-02-10T05:00:00.000Z",
        "distanceKm": 128, "durationMinutes": 135, "isNight": false,
        "baseFareCents": 17116, "nightSurchargeCents": 0,
        "extras": [{ "code": "childSeat", "quantity": 1, "totalCents": 2000 }],
        "sellCents": 19116
      }],
      "totals": { "sellCents": 19116, "totalCents": 19116 }
    }
  }]
}
```

**Staff-only:** `legs[].netCents`, `legs[].source`, `totals.netCents`,
`markupBps`, `marginCents`, and the vehicle's `fallbackPricing`.

**Pricing is two-tier.** A curated route price is used when one exists;
otherwise the fare is `max(minimumFare, distanceKm x perKm) + airportFee` from
the vehicle class. So every pair of points is bookable, and the commercially
important ones are priced by hand. The response says which was used — but only
to staff, in `quote.legs[].source`.

| Scenario | Expected |
| --- | --- |
| **Road closed for those dates** | **`200`** with `"closed": true` and `"offers": []` — a real answer, not an error |
| **Party too large for any vehicle** | **`200` with no offers.** Capacity is a hard constraint, not a filter |
| A point we do not serve | `404` |
| `from` equals `to` | `409` — `details: { "reason": "SAME_POINT" }` |
| Pick-up under 3 hours away | `422` — `{ "reason": "TOO_SOON" }` (`TRANSFER_MINIMUM_NOTICE_MINUTES`) |
| Beyond ~540 days out | `422` — `{ "reason": "BEYOND_HORIZON" }` |
| Return before outbound | `422` — `{ "reason": "RETURN_BEFORE_OUTBOUND" }` |
| Over 50 passengers | `422` — `{ "reason": "PARTY_TOO_LARGE" }` |
| `tripType=RETURN` without `returnDate`/`returnTime` | `400` — *"A return journey needs a return date and time"* |
| `time=9:00` or `time=25:00` | `400` — *"Use a 24-hour time, for example 09:30"* |

> **Night surcharge.** Pick-ups between 22:00 and 06:00 *local to the pick-up
> point* carry a 20% surcharge by default. Quote the same journey at `14:00` and
> at `23:00` and confirm `nightSurchargeCents` is `0` and then non-zero.

### `POST /api/transfers/quotes/revalidate`

```json
{ "token": "eyJ...quote token..." }
```

**Expected — 200**, the offer re-priced. **This one is deliberately not
strict** — it is the preview call a results page makes when a token has been
sitting in a tab, so it *shows* the new fare rather than refusing. A changed
price here is a `200`, not a `409`.

Expired token → `410`. Tampered token → `400`.

### `POST /api/transfers/bookings`

**Send an `Idempotency-Key` header.**

```json
{
  "quoteToken": "eyJ...signed...",
  "leadPassenger": {
    "firstName": "Nino", "lastName": "Beridze",
    "email": "nino@example.com", "phone": "+995555123456"
  },
  "flightNumber": "TK378",
  "pickupAddress": "Terminal 1, arrivals hall",
  "dropoffAddress": "Gudauri Alpine Hotel, main entrance",
  "specialRequests": "Two large ski bags",
  "source": "web"
}
```

**Expected — 201**

```json
{
  "reference": "TRF-000001", "status": "CONFIRMED", "tripType": "ONE_WAY",
  "pickupAt": "2027-02-10T05:00:00.000Z", "returnPickupAt": null,
  "route": { "fromName": "Tbilisi International Airport", "toName": "Gudauri",
             "distanceKm": 128, "stops": [] },
  "vehicle": { "name": "Comfort Sedan", "vehicleClass": "COMFORT",
               "providerName": "...", "pickupProcedure": "..." },
  "adults": 2, "children": 0, "luggage": 2,
  "leadPassengerName": "Nino Beridze", "leadPassengerEmail": "nino@example.com",
  "flightNumber": "TK378", "pickupAddress": "Terminal 1, arrivals hall",
  "currency": "GEL", "totalCents": 19116,
  "cancellation": {
    "freeUntil": "2027-02-09T05:00:00.000Z",
    "windows": [{ "fromAt": null, "toAt": "2027-02-09T05:00:00.000Z", "chargeCents": 0 }]
  },
  "legs": [{ "legIndex": 0, "direction": "OUTBOUND", "from": "...", "to": "...",
             "pickupAt": "2027-02-10T05:00:00.000Z", "sellCents": 19116 }],
  "extras": [{ "code": "childSeat", "quantity": 1, "totalCents": 2000 }]
}
```

References are `TRF-000001`. **Staff-only:** `netTotalCents`, `markupBps`,
`marginCents`, `partner`, per-leg `netCents`.

| Scenario | Expected |
| --- | --- |
| Same `Idempotency-Key` replayed | `200` with the same booking — **not** a second car dispatched |
| Any amount field | `400` — `.strict()` |
| Missing `leadPassenger.email` | `400` |
| Expired `quoteToken` | `410` |
| Fare moved since quoting | `409` — booking calls the pricer in strict mode, unlike revalidate |

A voucher email is sent **after** the transaction commits, and only on a genuine
`201` — never on a replay. Check the server log for it.

### The rest of the transfer booking endpoints

They behave exactly like their hotel equivalents:

| Endpoint | Expected |
| --- | --- |
| `GET /api/transfers/bookings/:reference` | `200`. Travellers must add `?email=`; wrong email is `404` |
| `GET /api/transfers/bookings/:reference/cancellation-quote` | `200` — `{ chargeCents, refundCents, currency, refundable }`, off the frozen schedule |
| `PATCH /api/transfers/bookings/:reference` | `200`. Paperwork only: lead passenger, phone, `flightNumber`, the two addresses, `specialRequests`. Anything else is `400`; wrong status is `409` |
| `POST /api/transfers/bookings/:reference/cancel` | `200` with the summary plus `cancellation` |
| `GET /api/partner/transfers/bookings` | `200`, that partner's transfers only |

> The journey, the vehicle, the date and the party are **not** amendable,
> because changing any of them changes the fare — and a fare that changes
> without being re-quoted is a dispute waiting to happen.

---

## Part 7 — Partner portal

All under `/api/partner`, all requiring a session.

### `GET /api/partner/me`

**Readable in every status** — including `PENDING_APPROVAL`, `REJECTED` and
`SUSPENDED`. This is what the portal renders its "application under review",
"declined" and "suspended" pages from.

**Expected — 200**, the full partner detail with `status`.
Account not attached to a partner (i.e. an admin) → **`403`**.

**This is the one endpoint an unapproved partner can reach.** Everything else
behind the approval gate is `403`. Test that boundary explicitly.

### `PATCH /api/partner/account`

```json
{ "firstName": "Nino", "lastName": "Beridze", "position": "Reservations Manager", "phone": "+995555123456" }
```

**Expected — 200**, the updated user.

Allowed in **every** partner status and to **every** partner role — correcting
the spelling of your own name is not a privileged act, and someone whose
application is still under review should be able to fix a typo in it.

An empty body `{}` returns the unchanged user with `200`.

### `PATCH /api/partner/profile`

Company details. Requires `PARTNER_OWNER` or `PARTNER_ADMIN` **and** approved
status.

**Expected — 200**, the updated partner.

| Scenario | Expected |
| --- | --- |
| `PARTNER_AGENT` or `PARTNER_FINANCE` | `403` |
| Unapproved partner | `403` |
| Sending `status`, `reference` or `commissionRateBps` | `400` — the schema is an allow-list, so these never reach the update at all |

> **Worth an explicit test:** a partner must not be able to approve itself,
> rename its Partner ID, or award itself a better commission rate. Try all
> three.

### `GET` / `PUT /api/partner/financial`

Bank details. Requires `PARTNER_OWNER` or `PARTNER_FINANCE`, **and** approved
status — gated identically on read and write.

```json
{ "iban": "GE29NB0000000101904917", "swift": "BAGAGE22",
  "bankName": "Bank of Georgia", "accountHolder": "Alpine Tours LLC" }
```

**Expected — 200** — `{ iban, swift, bankName, accountHolder, updatedAt }`

| Scenario | Expected |
| --- | --- |
| `PARTNER_ADMIN` or `PARTNER_AGENT` | `403` — same company, no business seeing the bank details |
| No details on file yet (GET) | `404` — *"No bank details on file"* |
| Unapproved or suspended | `403` |

### Supplier extranet — `/api/partner/hotels`

Guarded by `authenticate + requireApprovedPartner`, scoped to the caller's own
properties.

| Method | Path | Role required |
| --- | --- | --- |
| `GET` | `/api/partner/hotels` | any partner role |
| `GET` | `/api/partner/hotels/:hotelId` | any |
| `GET` | `/api/partner/hotels/:hotelId/room-types` | any |
| `GET` | `.../room-types/:id/inventory/calendar?from&to` | any |
| `PUT` | `.../room-types/:id/inventory` | **`PARTNER_OWNER` / `PARTNER_ADMIN` only** |
| `PUT` | `.../rate-plans/:id/rates` | **`PARTNER_OWNER` / `PARTNER_ADMIN` only** |
| `GET` | `/api/partner/hotels/:hotelId/bookings` | any |

**The two isolation tests that matter:**

1. Sign in as supplier A, request supplier B's `hotelId`. Expect **`404`, not
   `403`** — telling you it exists but is not yours would confirm it exists.
2. Sign in as a `PARTNER_AGENT` and attempt either `PUT`. Expect **`403`**.

### Registration (public)

| Endpoint | Expected |
| --- | --- |
| `GET /api/invitations/:token` | `200` — a preview: company name, contact email, expiry. `410`/`404` if used or expired. `429` after 30 lookups in 15 minutes |
| `POST /api/invitations/:token/accept` | `201` — `{ "reference": "P-000042", "status": "PENDING_APPROVAL", "companyName": "Alpine Tours LLC" }` |

The accept body is `{ company, contact, financial, password }`. Holding the
token is the entire proof, which is why it is 256 bits of randomness,
single-use, time-limited and bound to one email address.

| Scenario | Expected |
| --- | --- |
| Weak password, or one containing the applicant's own name/email/company | `400` |
| Token reused | `410`/`404` — single use |
| 6th claim from one IP in an hour | `429` |

Note the new partner lands in `PENDING_APPROVAL`. They can sign in and read
`/api/partner/me`, and nothing else.

---

## Part 8 — Admin

Everything under `/api/admin/*` is guarded by `authenticate + requireAdmin` on
the **router**, not route by route. So the first test for every single admin
endpoint is the same:

| Caller | Expected |
| --- | --- |
| Anonymous | `401` |
| Any partner role | `403` |
| `ADMIN` / `SUPER_ADMIN` | `200`/`201` |

Worth doing once as a sweep across the whole surface, rather than per endpoint.

### Partners

| Method | Path | Expected |
| --- | --- | --- |
| `GET` | `/api/admin/partners` | `200`, paginated |
| `POST` | `/api/admin/partners` | `201` — `{ partner, link: { kind, url, expiresAt }, emailSent }` |
| `GET` | `/api/admin/partners/:id` | `200` |
| `PATCH` | `/api/admin/partners/:id` | `200` |
| `DELETE` | `/api/admin/partners/:id` | `204`/`200` |
| `POST` | `/api/admin/partners/:id/approve` · `/reject` · `/suspend` · `/reactivate` | `200`, status changed |
| `GET` / `PUT` | `/api/admin/partners/:id/financial` | `200` |
| `GET` / `POST` | `/api/admin/partners/:id/invitations` | `200` / `201` |
| `GET` | `/api/admin/partners/:id/audit` | `200` — who changed what, when |

`POST /api/admin/partners` takes a `mode`:

| `mode` | What happens |
| --- | --- |
| `invite` | Drafts the company, emails a registration link, waits for the rest |
| `activate` | Creates the account now, emails a password-creation link |
| `approve` | Creates the account, emails a password link, and approves at once |

`approve` requires **complete** company details — approving a record still
missing its registration number would put a half-empty partner into the live
platform. Try it with a partial `company` and expect `400`.

**The link is in the response as well as in the email**, so a mail server being
down does not leave an admin with a partner they cannot onboard. `emailSent`
tells the panel whether to show the link or just confirm. This is how you get an
activation URL locally without an inbox.

> `POST /:id/invitations` is the exception that does **not** send quietly: the
> admin pressed a button whose entire purpose is "send them a link", so a
> failure comes back as `emailSent: false` rather than a cheerful lie.

### Hotels

| Method | Path |
| --- | --- |
| `GET` / `POST` | `/api/admin/hotels` |
| `GET` / `PATCH` | `/api/admin/hotels/:id` |
| `POST` | `/api/admin/hotels/:id/publish` · `/unpublish` · `/archive` |
| `PUT` | `/api/admin/hotels/:id/amenities` — `{ "amenities": [{ "amenityId", "note?" }] }` |
| `POST`/`PATCH`/`DELETE` | `/api/admin/hotels/:id/images` · `/images/:imageId` |
| `PUT` | `/api/admin/hotels/:id/images/order` — `{ "order": ["imageId", ...] }` |
| `PUT` | `/api/admin/hotels/:id/translations/:locale` |

Create takes **only** `slug`, `name`, `propertyType`, `destinationId`,
`starRating`, and optionally `supplierId`, `countryCode`, `timezone`,
`currency`. Everything else is a `PATCH`. Sending a field that belongs to PATCH
is a `400`.

**Every read of `:id` and every mutation returns the hotel plus a
`publishChecklist`:**

```json
{
  "id": "clx...", "slug": "gudauri-alpine-hotel", "status": "DRAFT",
  "publishChecklist": [
    { "code": "NO_IMAGES", "message": "Add at least one image" },
    { "code": "NO_RATE_PLAN", "message": "Add a rate plan" }
  ]
}
```

`POST /publish` answers **`422`** with `details.missing` when the checklist is
not empty:

```json
{ "error": { "message": "This hotel is not ready to publish",
             "details": { "missing": [{ "code": "NO_IMAGES", "message": "Add at least one image" }] } } }
```

There is **no `DELETE`** for a hotel — only `archive`. A property that has ever
been booked has to stay readable.

Duplicate `slug` → `409`.

### Rooms, rates and inventory

| Method | Path |
| --- | --- |
| `GET` / `POST` | `/api/admin/hotels/:hotelId/room-types` |
| `GET` / `PATCH` | `.../room-types/:roomTypeId` |
| `POST` | `.../room-types/:roomTypeId/archive` |
| `PUT` | `.../room-types/:id/beds` — `{ "beds": [{ "bedTypeCode", "quantity", "groupIndex" }] }` |
| `PUT` | `.../room-types/:id/amenities` |
| `GET` / `POST` | `.../room-types/:id/rate-plans` |
| `GET` / `PATCH` | `.../rate-plans/:ratePlanId` |
| `POST` | `.../rate-plans/:id/archive` |
| `POST`/`PUT`/`DELETE` | `.../rate-plans/:id/restrictions[/:restrictionId]` |
| **`PUT`** | `.../room-types/:id/inventory` — the bulk editor |
| **`GET`** | `.../room-types/:id/inventory/calendar?from&to` |
| **`PUT`** | `.../rate-plans/:id/rates` — the bulk editor |
| `GET` / `PUT` | `/api/admin/hotels/:id/child-policy` |
| `GET`/`POST`/`PUT` | `/api/admin/hotels/:id/policies/cancellation[/:policyId]` |
| `GET`/`POST`/`PUT` | `/api/admin/hotels/:id/policies/payment[/:policyId]` |
| `GET` / `PUT` | `/api/admin/hotels/:id/meal-plans` |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/hotels/:id/tax-fees[/:taxFeeId]` |

**Bulk inventory body:**

```json
{
  "from": "2027-12-01", "to": "2027-12-31",
  "weekdays": [1, 2, 3, 4],
  "totalUnits": 5, "stopSell": false, "minStay": 2,
  "closedToArrival": false, "closedToDeparture": false
}
```

**Bulk rates body:**

```json
{
  "from": "2027-12-01", "to": "2027-12-31", "weekdays": [5, 6, 7],
  "netCents": 12500, "sellCents": null,
  "extraAdultCents": 3000, "extraChildCents": null, "singleOccupancyCents": null,
  "closed": false
}
```

`weekdays` is ISO — **1 = Monday**. Omit it to hit every day.

**Expected — 200** — `{ "nights": 20, "days": 31 }`

**Anything you omit keeps its existing value.** This is a partial write, not a
replace. Verify it: set `minStay: 2` on a range, then send a second request
setting only `totalUnits`, and confirm `minStay` is still `2`.

| Scenario | Expected |
| --- | --- |
| Reducing units below what is already sold | **`409`** with `details.conflicts: [{ "date": "2027-12-05", "committed": 3 }]` |
| Range longer than 730 days | `400` (`HOTEL_MAX_BULK_DAYS`) |
| `to` before `from` | `400` |

**Calendar response — 200:**

```json
{
  "roomType": { "id": "clx...", "name": "Deluxe Double", "code": "DBL" },
  "nights": [{
    "date": "2027-12-01",
    "totalUnits": 5, "blockedUnits": 0, "bookedUnits": 1, "heldUnits": 0,
    "availableUnits": 4,
    "stopSell": false, "minStay": null,
    "closedToArrival": false, "closedToDeparture": false,
    "rates": [{ "ratePlanId": "clx...", "ratePlanName": "Breakfast, flexible",
                "netCents": 12500, "sellCents": null, "closed": false }]
  }]
}
```

`availableUnits` is **derived** — `total − blocked − booked − held` — never
stored. If it ever disagrees with that arithmetic, that is a bug.

### Transfer admin

| Method | Path |
| --- | --- |
| `GET`/`POST` | `/api/admin/transfers/points` · `GET`/`PATCH`/`DELETE` `/points/:id` |
| `PUT` | `/api/admin/transfers/points/:id/translations/:locale` |
| `GET`/`POST` | `/api/admin/transfers/vehicles` · `GET`/`PATCH` `/vehicles/:id` · `POST` `/vehicles/:id/archive` |
| `PUT` | `/api/admin/transfers/vehicles/:id/translations/:locale` |
| `GET`/`POST` | `/api/admin/transfers/routes` · `GET`/`PATCH` `/routes/:id` |
| **`PUT`** | `/api/admin/transfers/routes/prices` — the bulk repricer |
| `PUT` | `/api/admin/transfers/routes/:id/prices` · `/stops` · `/translations/:locale` |
| `POST` | `/api/admin/transfers/routes/:id/publish` · `/unpublish` · `/archive` |
| `GET`/`POST`/`PUT`/`DELETE` | `/api/admin/transfers/extras[/:code]` |
| `GET`/`POST`/`DELETE` | `/api/admin/transfers/blackouts[/:id]` |
| `GET` | `/api/admin/transfers/bookings` · `/:reference` · `POST /:reference/cancel` |

**`DELETE /points/:id` retires rather than deletes.** Routes and bookings
reference the row with `Restrict`, and a place that has ever been travelled to
has to stay readable. Expect the point to disappear from the public picker but
still resolve inside existing bookings.

**Route price grid** — a whole-grid `PUT`, so a half-applied grid is impossible:

```json
{ "prices": [{ "vehicleId": "clx...", "oneWayCents": 17500, "returnCents": null, "netCents": null }] }
```

**Bulk repricing:**

```json
{ "tier": "TIER_1", "vehicleIds": ["clx..."], "perKmCents": 150, "overwrite": false }
```

**Expected — 200** — `{ "routes": 42, "written": 120, "kept": 18 }`

| Scenario | Expected |
| --- | --- |
| Both `perKmCents` and `flatCents` | `400` — one or the other, never both |
| **No filter at all** | `400` — a filter (`tier`, `category` or `routeIds`) is **required**. There is deliberately no way to reprice the whole catalogue in one call |
| `overwrite` omitted | Defaults to `false` — fills gaps, leaves every figure someone has already set |
| `POST /routes/:id/publish` with no price at all | `422` with `details.missing` — publishing would silently fall through to the distance estimate |
| Publish with missing copy only | `200` — missing translations are listed in the checklist but do not block |

**Blackouts are how you test `closed: true`.** Create one over a route, then
quote it and expect `200` with `"closed": true` and no offers.

### Everything else

| Method | Path | Notes |
| --- | --- | --- |
| `GET`/`POST` | `/api/admin/destinations`, `GET /api/admin/destinations/tree` | |
| `GET`/`PATCH`/`DELETE` | `/api/admin/destinations/:id` | |
| `PUT` | `/api/admin/destinations/:id/translations/:locale` | |
| `GET`/`POST` | `/api/admin/amenities`, `GET`/`PATCH` `/api/admin/amenities/:id` | `POST` → `201` |
| `GET`/`POST` | `/api/admin/media` | multipart: `file`, `category`, `altText?` |
| `GET`/`DELETE` | `/api/admin/media/:id` | |
| `GET` | `/api/admin/media/:id/url` | signed link, **private categories only** |
| `GET` | `/api/admin/bookings`, `/api/admin/bookings/:reference` | every booking on the platform |
| `POST` | `/api/admin/bookings/:reference/cancel` | |
| `GET`/`POST` | `/api/admin/pricing-rules` | |
| `GET` | `/api/admin/pricing-rules/explain?partnerId&hotelId` | which rule wins, and why |
| `PUT`/`DELETE` | `/api/admin/pricing-rules/:id` | |

**Media visibility is decided by the category, not by the caller:**

| Public — served directly | Private — no URL in the response |
| --- | --- |
| `HOTEL_IMAGE`, `ROOM_IMAGE`, `AMENITY_ICON` | `CONTRACT`, `RATE_SHEET`, `INVOICE`, `VOUCHER`, `IMPORT`, `OTHER` |

A private file has **no `url` field at all**. Fetch `GET /:id/url` for a
60-second signed link. If a `CONTRACT` ever comes back with a plain URL, that is
a security bug.

Upload limits: 10 MB for images, 25 MB for documents. Over the limit → **`413`**
— *"That file is too large"*, not a `500`. Two files at once → `400`. Wrong
field name → `400`.

---

## Part 9 — A suggested test run

Roughly 45 minutes, covering the paths that carry money.

**Smoke (5 min)**
1. `GET /health` → `200`
2. `GET /health/db` → `200`
3. `GET /api/destinations` → `200`, non-empty
4. `GET /api/hotels` → `200`, non-empty

**Auth (10 min)**
5. Login with a wrong password → `401`
6. Login correctly → `200` + `HttpOnly` cookie
7. `GET /api/auth/me` → `200`
8. `GET /api/auth/me` with the cookie removed → `401`
9. `POST /api/auth/logout` → `204`; then `/me` → `401`
10. 11 failed logins in a row → `429` on the last

**Hotel booking (15 min)**
11. `GET /api/search` with valid dates → `200`, capture `cheapestOffer.token`
12. Confirm no `netCents` anywhere in the anonymous response
13. `POST /api/search/offers/quote` → `200`
14. `POST /api/bookings/holds` → `201`, capture the hold token
15. `POST /api/bookings` with an `Idempotency-Key` → `201`, capture the reference
16. **Repeat step 15 unchanged → `200`, same reference**
17. `GET /api/bookings/:reference?email=...` → `200`
18. Same with a wrong email → `404`
19. `GET .../cancellation-quote` → `200`
20. `PATCH` with `"totalCents": 1` → `400`
21. `POST .../cancel` → `200`, status `CANCELLED`
22. Cancel again → `409`

**Transfers (10 min)**
23. `GET /api/transfers/points?search=tbilisi` → `200`
24. `GET /api/transfers/quotes` for a valid journey → `200` with offers
25. Same journey, pick-up in one hour → `422` `TOO_SOON`
26. Same point for `from` and `to` → `409` `SAME_POINT`
27. `POST /api/transfers/bookings` → `201`, capture `TRF-...`
28. Replay with the same key → `200`, same reference

**Authorization (5 min)**
29. `GET /api/admin/partners` anonymously → `401`
30. Same as a partner → `403`
31. Same as an admin → `200`
32. As supplier A, `GET /api/partner/hotels/<supplier B's id>` → `404`
33. As a `PARTNER_AGENT`, `PUT .../inventory` → `403`
34. As an unapproved partner, `GET /api/partner/me` → `200`, but
    `GET /api/partner/dashboard` → `403`

---

## Part 10 — Enum reference

Every value the API will accept or return.

```
PropertyType      Hotel Boutique Resort Guesthouse Lodge Apartment Chalet Hostel Villa
HotelStatus       DRAFT ACTIVE INACTIVE SUSPENDED ARCHIVED
RoomTypeStatus    ACTIVE INACTIVE ARCHIVED
RatePlanStatus    ACTIVE INACTIVE ARCHIVED
MealPlanCode      RO BB HB HB_PLUS FB FB_PLUS AI UAI
CancellationKind  FLEXIBLE NON_REFUNDABLE TIERED
ChargeBasis       PERCENT_OF_TOTAL PERCENT_OF_FIRST_NIGHT FIXED_AMOUNT NIGHTS
PaymentTiming     PAY_NOW PAY_LATER DEPOSIT PAY_AT_HOTEL CREDIT_ACCOUNT
BedTypeCode       SINGLE TWIN DOUBLE QUEEN KING SOFA BUNK FUTON
BathroomType      PRIVATE ENSUITE SHARED
ChildChargeMode   FREE PERCENT_OF_ADULT FIXED_PER_NIGHT FULL_ADULT
TaxFeeBasis       PERCENT PER_NIGHT_PER_PERSON PER_NIGHT_PER_ROOM PER_STAY
BookingStatus     PENDING CONFIRMED CANCELLED COMPLETED NO_SHOW
GuestType         ADULT CHILD INFANT
ImageCategory     Exterior Lobby Restaurant Pool Spa Room Bathroom View Facilities
AmenityCategory   General FoodDrink Wellness Parking Business Family Ski Accessibility Transportation

TransferPointKind     AIRPORT CITY RESORT HOTEL LANDMARK STATION
TransferVehicleClass  ECONOMY COMFORT MINIVAN VAN GROUP JEEP_4X4 VIP
TransferVehicleBody   sedan suv minivan van bus
TransferKind          PRIVATE SHARED
TransferRouteTier     TIER_1 TIER_2 TIER_3
TransferRouteCategory AIRPORT CITY RESORT TOURIST_ROUTE COMBINED
TransferStatus        DRAFT ACTIVE INACTIVE ARCHIVED
TransferBookingStatus PENDING CONFIRMED CANCELLED COMPLETED NO_SHOW
TransferTripType      ONE_WAY RETURN
TransferExtraBasis    FIXED PER_PASSENGER PER_HOUR PERCENT
TransferFeature       airConditioning wifi childSeat englishDriver meetGreet
                      flightTracking bottledWater freeWaiting

UserRole              SUPER_ADMIN ADMIN PARTNER_OWNER PARTNER_ADMIN
                      PARTNER_AGENT PARTNER_FINANCE
PartnerStatus         PENDING_APPROVAL APPROVED REJECTED SUSPENDED
MediaCategory         HOTEL_IMAGE ROOM_IMAGE AMENITY_ICON        (public)
                      CONTRACT RATE_SHEET INVOICE VOUCHER IMPORT OTHER  (private)
Locale                en ka ru he
```

---

## Part 11 — How to report a bug

Include all of these; without them a report usually cannot be acted on.

1. **Request** — method, full URL with query string, headers you set (especially
   `Idempotency-Key` and `Origin`), and the body
2. **Who you were** — anonymous, guest with `?email=`, partner (which role and
   status), or admin
3. **Expected** — quote the line from this guide
4. **Actual** — the status code and the **whole** response body
5. **Server log** — the matching lines from the terminal running `npm run dev`.
   Every request is logged with an id; include it
6. **Reproducible?** — every time, or once? If once, what else was running

**Report these immediately, whatever else you are doing:**

- Any `netCents`, `markupBps`, `marginCents` or `partner` visible to a
  non-staff caller
- Any response body that changes a price based on something you put in the
  request
- Two `201`s from the same `Idempotency-Key`, or two holds on one last room
- Any partner reading another partner's data
- A `500` on any request — those are always bugs
- A `CONTRACT` or `INVOICE` media record coming back with a plain `url`
