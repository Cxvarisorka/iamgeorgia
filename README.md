# I am Georgia

**Discover Georgia Beyond the Ordinary.**

A travel booking platform for the country of Georgia — hotels, private tours,
experiences, and airport/city transfers — sold directly to travellers and,
through a supplier extranet, to the partners who actually own the inventory.

The site is multilingual from the ground up (English, Georgian, Russian and
Hebrew, the last of which is right-to-left), because the audience for a
Caucasus holiday is not one that shares a language.

---

## What the project is trying to do

Most small travel operators run on a spreadsheet, a WhatsApp thread and an
inbox. The goal here is a single system that can take a booking without a human
in the loop, and still be honest about what it sold:

- **A traveller can search real availability and book it.** Not an enquiry
  form — dated search across live inventory, a held room, a re-quoted price and
  a confirmed reference.
- **A supplier can manage their own product.** Hotels, room types, rate plans,
  a year of nightly rates and inventory, images, and their own bookings, from
  a portal rather than by emailing us a spreadsheet.
- **An administrator can run the marketplace.** Approve partners, curate the
  catalogue, publish properties against a completeness checklist, price
  transfer routes, and read an audit trail of who changed what.
- **Nothing about money is guessed.** Amounts are integer minor units, every
  amount carries its currency, prices travel as signed tokens so they cannot be
  edited on the way to checkout, and a confirmed booking is a frozen snapshot —
  a hotel that renames a room or tightens its cancellation terms in March
  cannot change what a guest who booked in January is owed.

## What is in the box

| Area | What it covers |
| --- | --- |
| **Public site** | Destinations, hotels, tours, experiences, transfers, about/contact |
| **Hotel booking** | Dated search, room offers, checkout, confirmation, self-service manage & cancel |
| **Transfers** | Route catalogue, point-to-point search, quotes, vehicle classes, booking |
| **Partner portal** | Registration wizard, activation, bookings, profile & account settings |
| **Admin panel** | Hotels (details, rooms, rates, inventory calendar, gallery, location), transfers, partners & applications, bookings |
| **i18n** | `en` · `ka` · `ru` · `he` (RTL), with per-entity translations that fall back to English field by field |

## Architecture

A two-app monorepo. They talk over HTTP and share nothing but a contract.

```
client/   Next.js 16 (App Router) · React 19 · Tailwind v4 · TypeScript
server/   Express 5 · Prisma 7 · PostgreSQL 17 (PostGIS) · zod · pino
```

```
                       ┌─────────────────────────┐
  traveller ──────────▶│                         │
  partner   ──────────▶│   client  (Next.js)     │
  admin     ──────────▶│   /[locale]/…           │
                       └───────────┬─────────────┘
                                   │  fetch, session cookie
                                   ▼
                       ┌─────────────────────────┐      ┌──────────────┐
                       │   server  (Express)     │─────▶│ PostgreSQL   │
                       │   /api/…                │      │ + PostGIS    │
                       └───────────┬─────────────┘      └──────────────┘
                                   │
                          SMTP · Cloudflare R2
```

**Client** — the `[locale]` segment wraps three route groups: `(site)` for the
public product, `(portal)` for partners, `(admin)` for staff. Server Components
fetch by default; client components are the interactive leaves. Colour is a
closed set of design tokens in `app/globals.css` — no component hardcodes a hex
value, and every in-use foreground/background pair meets WCAG AA.

**Server** — `app.js` builds the Express app and deliberately never calls
`listen()`, so the test suite can drive it over an ephemeral port while
`server.js` alone owns the process lifecycle. Routes validate with zod into
`req.valid`, services hold the logic, serializers decide what each role is
allowed to see, and a Prisma client extension validates every `Json` column on
write so seeds and scripts are covered as well as routes.

**Database** — snake_case tables, foreign keys on `id` (slugs stay renameable),
money in integer cents, calendar dates as `@db.Date` rather than instants, and
enum values that match the client's TypeScript string unions exactly. Inventory
availability is derived (`total − blocked − booked − held`) rather than stored,
and overbooking is prevented by a conditional `UPDATE` whose `WHERE` clause *is*
the availability check — no locks, no serialisation retries.

## Getting started

Requires **Node.js 22.18+** and **Docker** (for PostgreSQL).

### 1. Server

```bash
cd server
cp .env.example .env          # adjust credentials if you like
npm install                   # postinstall runs `prisma generate`
npm run db:up                 # start PostgreSQL in Docker
npm run prisma:migrate        # create/apply migrations
node scripts/seed-reference.js                            # amenities, bed types, meal plans
node scripts/create-admin.js you@example.com Your Name    # first administrator
npm run dev                   # http://localhost:5000
```

Check it: `curl http://localhost:5000/health/db` returns the database time.

There is no sign-up for administrators, by design — the first account comes
from `scripts/create-admin.js` (which prints a generated password once), and
every one after it is invited from inside the panel. In development
`MAIL_TRANSPORT` defaults to `log`, so invitation and activation links are
printed through the logger instead of being emailed.

### 2. Client

```bash
cd client
cp .env.local.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:5000
npm install
npm run dev                        # http://localhost:3000
```

The API origin is inlined into the browser bundle at build time, so it must be
a URL a visitor's browser can reach — and the server must list that origin in
its own `CLIENT_ORIGIN`, because the session cookie only travels cross-origin
when CORS allows credentials.

### 3. Optional — seed the catalogue

```bash
cd server
node scripts/seed-catalogue.js   # destinations, hotels, rooms, rate plans, a year of rates & inventory
```

## Tests

```bash
cd server && npm test    # node:test + supertest; DB suites skip if Postgres is down
```

The suite runs against `.env.test`, which pins mail to an in-memory outbox and
media to a scratch directory so no test needs credentials or a network.

## Further reading

| Document | What it covers |
| --- | --- |
| [docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md) | Running the whole platform locally, step by step, with troubleshooting |
| [docs/API_TESTING_GUIDE.md](docs/API_TESTING_GUIDE.md) | Every endpoint with its exact expected result — written for testers |
| [docs/postman/](docs/postman/) | Importable Postman collection, ~80 requests, each asserting its documented result |
| [server/README.md](server/README.md) | Backend stack, layout, data model and every design decision behind it |
| [server/API.md](server/API.md) | Every endpoint under `/api` — what to call, what comes back, who may see what |
| [client/FRONTEND.md](client/FRONTEND.md) | Colour system, accessibility audit, i18n, and the front-end work log |

## Configuration

Both apps refuse to boot on bad configuration rather than starting a server
that cannot serve anything. `server/.env.example` documents every variable in
full; the ones that must be set in any deployed environment (anything other
than `development` or `test`) are `AUTH_TOKEN_PEPPER`,
`HOTEL_OFFER_TOKEN_SECRET`, `TRANSFER_QUOTE_TOKEN_SECRET`, the `SMTP_*`
credentials, and the `MEDIA_S3_*` object-storage settings.

Real `.env` files are never committed. Only the `*.example` templates and
`server/.env.test` are in the repository.
