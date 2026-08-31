# Postman collection

Two files:

| File | What it is |
| --- | --- |
| `I-am-Georgia.postman_collection.json` | The collection — 8 folders, ~60 requests, every one asserting its expected result |
| `I-am-Georgia.local.postman_environment.json` | The environment — base URL and credentials |

Works in the Postman desktop app, the web app, and `newman` on the command line.

---

## Setting it up (5 minutes)

### 1. Start the API and seed it

From `server/` — the full walkthrough is in [../LOCAL_SETUP.md](../LOCAL_SETUP.md):

```bash
npm run db:up
npm run prisma:migrate
node scripts/seed-reference.js
node scripts/seed-catalogue.js       # hotels — search returns nothing without this
node scripts/seed-transfers.js       # transfer points, routes and prices
node scripts/create-admin.js you@example.com Your Name
npm run dev
```

Keep the password `create-admin.js` prints — it is shown once and cannot be
recovered.

### 2. Import both files

Postman → **Import** → drag both `.json` files in.

### 3. Select the environment

Top-right dropdown → **I am Georgia — Local**.

### 4. Fill in the credentials

Click the environment name → **Edit**, and set:

| Variable | Value |
| --- | --- |
| `baseUrl` | `http://localhost:5000` (already filled) |
| `adminEmail` | the address you passed to `create-admin.js` |
| `adminPassword` | the password it printed |
| `partnerEmail` | *(optional)* a partner account, for folder 05 |
| `partnerPassword` | *(optional)* |

Leave everything else alone — the rest is filled in automatically as you go.

### 5. Check it works

Run **00 · Health → Readiness**. Green means the API and database are both up.
Red means start there before anything else.

---

## Running it

### One request at a time

Open any request, press **Send**, and read the **Test Results** tab. Every
assertion is named after the behaviour it checks, so a failure tells you what
broke rather than just which line it was on.

The **description** panel on each request documents the expected result, the
error cases, and *why* the API behaves that way. Read it before filing a bug —
several results that look wrong are deliberate.

### The whole collection

**Collection → Run**, then:

| Setting | Value | Why |
| --- | --- | --- |
| Iterations | `1` | The booking flow creates real records |
| Delay | `100` ms | Keeps the 100-requests-per-minute global limiter happy |
| Keep variable values | **on** | So captured tokens and references survive the run |
| Folders | all, **in order** | Later folders consume tokens the earlier ones captured |

**Order matters.** Folder 03 needs the offer token folder 03's own search
captured; folder 06 asserts against the booking folder 03 created. Running
folder 06 alone will show a couple of skipped assertions, not failures.

### From the command line

```bash
npm install -g newman

newman run docs/postman/I-am-Georgia.postman_collection.json \
  -e docs/postman/I-am-Georgia.local.postman_environment.json \
  --env-var adminEmail=you@example.com \
  --env-var adminPassword='the-printed-password' \
  --delay-request 100
```

Add `--reporters cli,html --reporter-html-export report.html` for a shareable
report, or `--folder "03 · Hotel search & booking"` to run one folder.

---

## What is in each folder

| Folder | Covers |
| --- | --- |
| **00 · Health** | Liveness and readiness. Start here — if readiness is 503, nothing else will work |
| **01 · Auth** | Login, session cookie, `/me`, logout, forgot-password. Failure cases run **before** the successful login, because the login limiter only counts failures |
| **02 · Public catalogue** | Destinations, hotels, amenities — no authentication, no dates |
| **03 · Hotel search & booking** | The full money path: search → offer token → hold → booking → amend → cancel. Includes the idempotency replay and the "can I send my own price?" attacks |
| **04 · Transfers** | Points, routes, vehicles, quotes, booking, cancellation — plus the window rules (`TOO_SOON`, `BEYOND_HORIZON`, `SAME_POINT`) |
| **05 · Partner portal** | The approval gate, role restrictions, and cross-tenant isolation. Skips itself if no partner account is configured |
| **06 · Admin** | The staff surface, and the other half of the staff-only field test |
| **07 · Security & error contract** | Requests that are *supposed* to fail: 401, 403, 404, 400, 413, 429, and the cross-site write check |

---

## How the chaining works

Nothing needs to be copied by hand. Each request stores what the next one needs:

```
Search           → offerToken, quotedTotalCents, hotelSlug
Create hold      → holdToken
Confirm booking  → bookingReference, bookingTotalCents, bookingIdempotencyKey
Quote a journey  → quoteToken, quotedFareCents
Confirm transfer → transferReference, transferIdempotencyKey
Partner login    → partnerId, partnerStatus, partnerRole
```

Dates are regenerated on **every** request by the collection pre-request script
— a stay 120 days out, a transfer 90 days out — so the collection never expires
and never needs editing.

Authentication needs no setup at all: the session is an `httpOnly` cookie
(`iag_session`) and Postman's cookie jar handles it. There is no bearer token
anywhere in this API, so do not add an `Authorization` header.

---

## Things that look like bugs but are not

Check this list before filing.

| You see | Why |
| --- | --- |
| `404` for another partner's record | Deliberate. A `403` would confirm the record exists |
| `204` from logging out when not signed in | Logging out of nothing has succeeded |
| `204` from releasing a hold that never existed | Same reasoning |
| `204` from forgot-password for an unknown address | Anything else would enumerate accounts |
| `200` with `"closed": true` and no transfer offers | The road is shut. A real answer, not an error |
| `200` with no offers for a large party | Vehicle capacity is a hard constraint, not a filter |
| `200` with `data: []` from search | Nothing available on those dates. Also an answer |
| Different `priceFrom` for anonymous vs partner | Prices are viewer-relative — partner markup differs from the platform default |
| Transfer *revalidate* returning 200 on a moved fare | It is a preview; it shows the new fare. Only *booking* refuses with 409 |
| Postman not blocked by the cross-site check | Postman sends no `Origin`/`Sec-Fetch-Site`, and a browser cannot suppress those. Only requests from a page are checked |
| `429` after a lot of clicking | The global limit is 100/minute per IP. Restart the server to clear it |

---

## Things to report immediately

- Any `netCents`, `netTotalCents`, `markupBps`, `marginCents` or `partner`
  visible to a guest or an anonymous caller — that exposes the platform's margin
- A price that changes because of something you put in the request body
- Two `201`s from the same `Idempotency-Key`, or two successful holds on one
  last room
- One partner reading another partner's data
- Any `500`
- A `CONTRACT` or `INVOICE` media record carrying a plain `url`

The full reporting template is in
[../API_TESTING_GUIDE.md](../API_TESTING_GUIDE.md) §11.
