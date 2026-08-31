# I'am Georgia — Front-End Work Log

Everything changed on the front end, why it changed, and what is still outstanding.

**Stack:** Next.js 16.3 (App Router, Turbopack) · React 19.2 · Tailwind CSS v4 · Framer Motion 13 · TypeScript 5

**Status at time of writing:** `tsc --noEmit` clean · `eslint` clean · `next build` succeeds.

---

## Table of contents

1. [Colour system](#1-colour-system)
2. [Layout fixes](#2-layout-fixes)
3. [Brand identity — logo and page titles](#3-brand-identity--logo-and-page-titles)
4. [Internationalisation](#4-internationalisation)
5. [Transfers went live](#5-transfers-went-live)
6. [Outstanding work](#6-outstanding-work)
7. [File reference](#7-file-reference)
8. [Error handling](#8-error-handling)
9. [Admin navigation](#9-admin-navigation)

---

## 1. Colour system

Built around the logo orange, implemented as centralised design tokens in `app/globals.css` (**39 colour tokens**). No component hardcodes a hex value — verified: zero hex literals in any `.tsx` file.

### Foundation

| Token | Value | Role |
| --- | --- | --- |
| `--color-brand` | `#eb6830` | Logo orange. Fills, buttons, icons |
| `--color-brand-hover` | `#c8501f` | Hover / pressed |
| `--color-brand-text` | `#b4471b` | Orange **text** on light surfaces |
| `--color-brand-soft` | `#fff0e8` | Brand-tinted panels |
| `--color-background` | `#fff9f3` | Warm white page ground |
| `--color-surface` | `#ffffff` | Cards, modals, form fields |
| `--color-surface-earth` | `#f1e8de` | Editorial / cultural sections |
| `--color-sand` | `#e8d6c2` | Georgian earth accent |
| `--color-line` | `#e8ded4` | Borders and dividers |
| `--color-ink` | `#20201d` | Primary text, dark sections |
| `--color-body` | `#4a463f` | Body copy |
| `--color-muted` | `#625f59` | Secondary text |
| `--color-subtle` | `#78716a` | Tertiary metadata |
| `--color-accent-green` | `#496458` | Nature / mountain categories |
| `--color-accent-gold` | `#b8873f` | Ratings, premium markers |

A full 10-step orange scale (`--color-brand-50` … `--color-brand-900`) sits behind the semantic aliases. The intended distribution is roughly **60% warm neutrals / 25% charcoal and photography / 10% brand orange / 5% supporting accents** — orange is the signature, not the page.

### Accessibility fixes

Three tokens were failing WCAG AA on live text. I measured every foreground/background pair that actually occurs in the codebase (checking usage sites individually, not just the token table — several tokens pass on white but fail on the earth surfaces).

| Token | Before | After | Problem |
| --- | --- | --- | --- |
| `--color-subtle` | `#a39c92` — **2.60:1** | `#78716a` — 4.60:1 | 13px metadata (review dates, place types) below AA |
| `--color-accent-gold` | `#c89a5b` — **2.55:1** | `#b8873f` — 3.19:1 | Stars are the primary rating signal, under the 3:1 floor for meaningful marks |
| `--color-success` | `#3f7d5a` — **4.40:1** | `#3a7353` — 5.03:1 | Fell below AA once it landed on a soft/earth panel |

`--color-accent-gold-on-dark` (`#c89a5b`) keeps the original lighter gold for the charcoal footer, where it reads correctly at 6.40:1.

`--color-subtle` is documented as the floor: it must not be used on `--color-surface-earth` or `--color-sand`, where it drops below AA. One usage on an earth section was switched to `--color-muted`.

**Result: all 27 in-use combinations meet WCAG AA** (4.5:1 for text, 3:1 for meaningful non-text marks).

### Semantic leakage fixes

Brand orange was doing status work, which conflated identity with meaning:

- **Form errors** used `border-brand` / `text-brand-text` — an invalid field looked like a call to action. Now `border-error` / `text-error-text`, plus `--color-error-on-dark` (`#e0776d`) for the footer newsletter, where `#c94b42` drops to 3.5:1 on charcoal.
- **`Badge` tone `forest`** used `bg-success` for a *category* — making "mountain" and "breakfast included" read as the same kind of information. Now `bg-accent-green`.
- **Room `availabilityNote`** ("limited availability") rendered in brand orange. Now `--color-warning-text` (`#9c621c`), since `#d28a32` is only 2.71:1 as text.

Each semantic state keeps its reference hue for fills and icons, plus a darker `-text` shade for small type on light surfaces — the same split as `--color-brand` / `--color-brand-text`.

### Naming

`Badge` tones were renamed for meaning rather than appearance: `wine` → `brand`, `forest` → `nature`. `accent-green` was defined but entirely unused; it is now wired to nature-led tour categories.

`guestScoreLabel()` in `lib/utils.ts` was changed to return a dictionary key (`"exceptional"`, `"veryGood"`) rather than an English word, so the verdict beside a guest score can be translated.

---

## 2. Layout fixes

### "Where to go" — dead space removed

**Top row.** The lead destination card was locked to `aspect-16/10` (447px tall) while the stacked pair beside it came to 659px, leaving ~212px of empty space beneath it. Added a `stretch` prop to `DestinationCard` that drops the aspect ratio at `lg` and fills the grid row instead. Measured after: lead 659px, pair 659px — flush.

**Bottom rail.** Was `lg:grid-cols-5` holding 4 cards, so one column was always empty. Rather than hardcode `grid-cols-4`, it now uses `lg:grid-flow-col lg:auto-cols-fr` — one equal column per card, so the row spans the full width whatever the count.

> **Latent bug found and fixed:** the rail rendered `!featured` destinations while the top row used only 3 of the 4 featured ones, so **one destination appeared nowhere on the homepage**. The rail now derives its list by exclusion, so nothing is dropped.

### "The Georgian table" — crop and clipping

Two separate causes, found by checking the source image dimensions:

- The photos are landscape (`1800×1196`, `1800×1200`, `1800×1200`) but the containers were `aspect-square`, so `object-cover` was **discarding roughly a third of the width of every image**. Containers are now `aspect-3/2`, matching the sources almost exactly (1.500 vs 1.500 / 1.505) — they render essentially uncropped.
- The strip was inset in a padded container while the block above it is full-bleed, and butted directly against it. It is now near full-bleed with uniform padding all round, so the first and last frames sit fully inside the viewport.

| | Before | After |
| --- | --- | --- |
| Frame height | 371px | 243px |
| First frame starts | x = 0 (flush) | x = 12 |
| Last frame ends | x = 1521 (flush) | x = 1509 |
| Crop on landscape sources | ~33% of width | none |

The 12px inset matches the 12px gap between frames, so the spacing reads as one rhythm.

### "Why travel with us" — pinned intro

Added `lg:sticky lg:top-32 lg:self-start`. **`self-start` is the part that matters**: a grid item is stretched to the full row height by default, so `sticky` would have had no travel.

The sticky box and the reveal animation were also separated into two elements — the Framer Motion entrance was putting a `translateY(24px)` transform on the same element being positioned, which offset the pin by 24px. The sticky element now has `transform: none` and pins at exactly 128px.

Applied to the identical section on the About page ("What we hold to") for consistency.

---

## 3. Brand identity — logo and page titles

### Logo

**No logo asset existed anywhere in the repo** (no SVG, ICO, or anything matching `*logo*` / `*brand*`). I designed a mark from the brand palette: the orange tile carrying a warm-white Caucasus ridge and sun.

The first version read as the generic photo-placeholder glyph, so it was redrawn with the ridge bleeding off the tile edges.

- `components/layout/Logo.tsx` — inlined SVG component (no extra request, scales cleanly, and `next/image` refuses SVG without `dangerouslyAllowSVG`). Used in the header, mobile nav and footer.
- `app/icon.svg` — the browser tab icon, via the Next file convention.

> **Replace this with the real artwork when you have it.** Swap those two files; nothing else needs touching. Colours are literal hex in the mark on purpose — it is logo artwork and must not shift if a UI token is retuned.

### Page titles

`app/[locale]/page.tsx` and `not-found.tsx` were the only routes missing metadata. All routes now return distinct, translated titles:

```
/                     I'am Georgia — Discover Georgia Beyond the Ordinary
/tours                Tours — I'am Georgia
/hotels/vera-house…   Vera House Tbilisi — I'am Georgia
/no-such-page         Page not found — I'am Georgia
```

Home uses `title: { absolute }` so it reads as brand + tagline rather than "Home — I'am Georgia".

---

## 4. Internationalisation

Four languages: **English, ქართული (Georgian), Русский (Russian), עברית (Hebrew)**. German was removed from the switcher — it had no translations and would have shown as a half-English language.

### Routing

Locale-prefixed routes. Every page moved under `app/[locale]/`; all four locales prerender for all 35 detail pages.

```
iamgeorgia.travel/tours          → English   (default, unprefixed)
iamgeorgia.travel/ka/tours       → ქართული
iamgeorgia.travel/ru/tours       → Русский
iamgeorgia.travel/he/tours       → עברית
```

**`proxy.ts`** handles three cases. Note that Next 16 renamed the `middleware` file convention to `proxy` — this is the same request hook under the new name.

| Request | Behaviour |
| --- | --- |
| `/ka/tours` | Served as-is — the `[locale]` segment already matches |
| `/en/tours` | **307 redirect** to `/tours`, so English has one canonical URL |
| `/tours` | **Rewritten** internally to `/en/tours`; the address bar keeps `/tours` |

The rewrite is what lets English stay unprefixed without duplicating the route tree. `Accept-Language` and a stored cookie are honoured **only on the bare root**, so a shared in-language link always opens in the language it names.

### Locale plumbing

The problem: 71 components need the locale, and prop-drilling it through every card and section would be unworkable.

- **Server components** use `getI18n()` (`lib/i18n/server.ts`), built on Next 16's `next/root-params`. Because `[locale]` sits above the root layout it is a *root parameter*, readable from any server component without props. Returns `{ locale, t, path, fill, dir, intlLocale }`.
- **Client components** use `useI18n()` from `lib/i18n/provider.tsx`. `next/root-params` is server-only, so the root layout resolves the locale once and seeds a context. Adds no extra fetch — the dictionary is already in the server-rendered payload.

`path()` / `useLocalePath()` prefix a canonical href with the active locale. **Every `Link` must use it** — a raw `href="/tours"` drops a Georgian reader back into English mid-journey.

### Dictionaries

`lib/i18n/ui/{en,ka,ru,he}.ts` — ~430 lines each, same shape. `UiDictionary` is derived from the English object, so **adding a key to `en.ts` makes TypeScript fail the build until ka, ru and he supply it**. Deliberately not `as const`: literal types would demand the English *words* from every translation rather than just the same keys.

`fill()` handles `{placeholder}` substitution (`"{count} reviews"` → `"128 reviews"`) — a few lines rather than pulling in an ICU formatter for a handful of single-value slots.

### Plurals

`${count} ${noun}s` is an English assumption. Russian needs three forms of the same noun (1 турист / 2 туриста / 5 туристов), Hebrew has a dual, Georgian has one form for every count. Countable nouns are therefore stored as `PluralForms` under `t.units`, and `plural(locale, count, forms)` (`lib/i18n/plural.ts`) picks the variant through `Intl.PluralRules` — which already knows the rules for all four locales.

The old `pluralize()` helper in `lib/utils.ts` hard-coded the English `-s` and has been replaced at every call site it reached.

### Editorial content — the merge layer

The other half of translation: words that belong to a *thing* — a tour, a transfer class, a pick-up point — which cannot sit in a flat dictionary because they multiply with the data.

`data/i18n/merge.ts` holds the mechanism. The English record in `data/` stays the source of truth for everything that is **not** language — ids, slugs, prices, coordinates, images, capacities, ratings, day counts — and a translation supplies only the prose fields, merged over the English record at read time:

```ts
localise(base, locale, content)      // one entity
localiseAll(items, locale, content)  // a collection
```

Three consequences, all of them the point:

- A missing translation degrades to English **for that one field**, rather than breaking the page.
- Pricing, filtering and sorting logic never has to know a locale exists. `quotesForQuery()` computes a fare from the English record; the result is localised at the very end.
- Adding a language is a new key in one file per collection, not a fork of the data.

Accessors take an **optional** locale, and the omission is meaningful — the canonical record is what logic reads, the localised one is what components render.

> **Transfers no longer use this layer.** The whole vertical moved to the database (see §5), and its translations moved with it: `transfer_point_translations`, `transfer_vehicle_translations` and `transfer_route_translations` hold the same per-field overlay, merged server-side by `serializers/localise.js`. The contract is identical — a missing field degrades to English, not the whole record — but it now scales to four hundred routes instead of nineteen hardcoded places. Tours are the remaining user of the client-side merge.

Two traps worth naming, because both fail silently:

- The merge is **shallow**, on purpose — a deep merge over arrays would splice a translated list into an English one of a different length. So a translated `gallery` must restate every frame including its `src`, and a translated `itinerary` must restate every day.
- Closed vocabularies do **not** belong in per-entity content. Meals were free text repeated across 30 itinerary days; they are now `MealKey`s (`"breakfast" | "lunch" | "dinner"`) rendered through `t.tours.mealNames`. Same reasoning moved vehicle classes, transfer features, property types, amenities, tour categories and difficulty out of `data/` and into the dictionary.

### Locale-aware formatting

Numbers and dates were formatted against hard-coded English locales, so a Russian page said `$1,240` where it should say `1 240 $`. `formatPrice()` now takes an `intlLocale`, and `useI18n()` exposes it alongside `getI18n()` so client and server components format identically.

`formatDuration()` takes its `h`/`m` abbreviations as an argument rather than looking them up, because it is called from the pricing engine, which must stay locale-free. Languages that set the abbreviation off from the digits carry the space in the string itself (`" ч"`, `" სთ"`).

### Errors travel as keys, not sentences

Validation lives next to the rules it enforces — `validateTransferQuery()` in `lib/transfers/query.ts`, and the checkout form's own `validate()`. Both are imported by modules that have no locale and should not acquire one, so they return **keys** into `t.transfers.errors` / `t.transfers.booking.errors`. The component that renders a message is the one that knows the reader's language, so it does the lookup:

```ts
const messageFor = (key?: string) => (key ? t.transfers.errors[key] : undefined);
```

The rules are the same in every language; only the wording moves.

### Right-to-left

Hebrew sets `dir="rtl"` on `<html>`. Converted areas use logical properties (`ps-`/`pe-`, `ms-`/`me-`, `start-`/`end-`, `text-start`) instead of physical ones, and directional arrows carry `rtl:-scale-x-100` so they point along the reading direction. The nav's active underline uses `after:origin-[inline-start]`.

### Fonts

Fraunces and Inter have no Georgian or Hebrew glyphs — without intervention those pages would fall back to whatever the OS picked, which is exactly the "translated but not designed" look to avoid. Added **Noto Sans Georgian** and **Noto Sans Hebrew**, placed after the Latin faces in the stack:

```css
--font-sans: var(--font-inter), var(--font-georgian), var(--font-hebrew),
  ui-sans-serif, system-ui, sans-serif;
```

A browser walks the stack per character, so Latin text still renders in Inter while Georgian and Hebrew resolve to a designed face.

### SEO

`hreflang` alternates on every page mark the four URLs as the same page in different languages, with `x-default` pointing at English. Per-locale `openGraph.locale` and translated meta titles and descriptions.

### Verified

Against a running production build:

| URL | `lang` | `dir` | Sample content |
| --- | --- | --- | --- |
| `/` | `en` | `ltr` | Where to go · Plan your trip |
| `/ka` | `ka` | `ltr` | სად წავიდეთ · დაგეგმე მოგზაურობა |
| `/ru` | `ru` | `ltr` | Куда поехать · Спланировать поездку |
| `/he` | `he` | **`rtl`** | לאן לנסוע · לתכנן את הטיול |

### Localised so far

**Chrome and shared UI.** Header · Footer · MobileNavigation · LanguageMenu · NewsletterForm · Logo · all 10 home sections · Breadcrumbs · EmptyState · Rating / ScoreBadge / Stars · Modal · MediaGallery · SearchField · ShareSave · the four index pages · not-found · root layout metadata.

**Transfers — complete, UI and content.** Landing, search results, detail, checkout, confirmation and the segment error boundary; TransferSearch, LocationSelector, PassengerSelector, TransferCard, TransferFilters, TransferResults, TransferJourneyBar, TransferGallery, TransferBookingForm, TransferBookingSummary, TransferConfirmation, TransferSteps, TrustRow. All 9 offers and all 19 pick-up points translated.

**Tours — complete, UI and content.** Index, detail, TourCard, TourExplorer, TourPlanningCard. All 10 tours translated, including itineraries, highlights, inclusions and gallery alt text.

Both verticals were verified against a production build: all four locales prerender, and `/ka`, `/ru`, `/he` render translated route names, vehicle classes, itinerary days and prices in local number format.

---

## 5. Transfers went live

The transfers vertical was the most finished part of the front end and the least
real: six pages, four languages, and every price computed in the browser from
two sets of coordinates in `data/transferLocations.ts`. Checkout wrote a draft
to `sessionStorage`, invented a reference like `IG-8F2K4Q`, and told the
traveller they were booked. Its own source said so — *"Nothing is sent anywhere;
there is no request and no server."*

It is now a real product, backed by `server/`.

### What moved, and why

**Pricing left the browser.** `getRouteMetrics`, `quoteFor`, `quotesForQuery`
and `totalFor` are gone from `lib/transfers/query.ts`. The arithmetic was not
wrong — it is the same maths, in `server/services/transfer/pricing.service.js`,
in integer cents. What was wrong was where it ran: a price the browser computes
is a price the browser can change, and a catalogue the browser carries goes
stale the moment an operator edits it.

The module kept everything that never needed a fare — reading the journey out
of the URL, validating it, formatting it — and a comment where the engine used
to be, saying where it went.

**Money became minor units.** `types/transfer.ts` carried plain-number dollars;
every figure is now integer cents with a currency beside it, matching
`types/catalogue.ts` and the API. Components format through `lib/money.ts`
rather than `formatPrice`.

**The catalogue became a database.** Nineteen hardcoded pick-up points and nine
offers became 67 points, 9 vehicle classes and **396 routes** seeded from the
operator's own brief, with 3,564 prices. `data/transfers.ts`,
`data/transferLocations.ts` and their two `data/i18n` companions are deleted;
the vocabulary they also held — filter chips, sort options, passenger bands —
moved to `lib/transfers/vocabulary.ts`, because it is interface, not data.

The ka/ru/he prose in those files was not thrown away. `server/scripts/
seed-transfer-translations.js` reads it out of the last commit that held it and
writes it into the translation tables, mapping the four ids that changed
(`tbs-airport` → `tbilisi-airport`, and so on).

**Checkout posts.** `lib/transfers/booking.ts` and its `sessionStorage` draft
are deleted. The form sends a signed quote token with an idempotency key, and
handles the two answers that are conversations rather than failures: `409
PRICE_CHANGED` when the fare moved while the traveller was typing, and `410`
when the quote went stale.

`transfers/confirmation?ref=…` became `transfers/confirmation/[reference]`,
reading a real booking. The email in the query string is not decoration:
references come from a sequence and are enumerable, so the server requires the
address the booking was made under.

### New pages

- **`/transfers/routes/[slug]`** — a landing page per route, with translated
  copy, a from price and `Service` structured data. This is what a catalogue of
  named routes is *for*: a result set has nothing to offer an index, but
  "Tbilisi Airport to Gudauri transfer" is a thing people search for.
- **The panel**, at `/admin/transfers/…`: `routes` (with a bulk repricer),
  `routes/[id]`, `vehicles`, `vehicles/[id]`, `points`, `extras`, `bookings`
  and `bookings/[reference]`.

  The route screen is the one that earns its keep. It carries the price grid
  across every vehicle class — saved whole, so a half-applied set of fares
  cannot happen — the landing-page copy, the stops editor, and the closed-date
  windows that stand in for inventory. A publish checklist refuses a route with
  no price at all, because publishing one would silently fall through to the
  distance estimate.

  The bulk repricer on the list screen exists because 396 routes × 9 classes is
  over three thousand fares. It requires a filter (there is no "everything"
  option, here or in the API) and fills gaps by default rather than overwriting.

### Finding a transfer booking

`BookingLookupForm` routes by reference prefix: `TRF-` goes to the transfer
confirmation page, `BKG-` to the hotel one. They are separate records with
separate endpoints, so a single page that tried both and saw which answered
would 404 half the time on its way to succeeding.

### The picker had to change

`LocationSelector` filtered nineteen places in memory. It now asks the server,
debounced and guarded against out-of-order replies. That is not just a data
source change: the server matches names, regions, IATA codes **and every
translation**, so a Russian reader typing "Кутаиси" finds the row an English
reader finds typing "Kutaisi" — which a client-side filter over English
fixtures could never do.

### Still true

Four locales, RTL Hebrew, the design tokens, the URL-as-state search: all
unchanged. `tsc --noEmit` clean, `eslint` clean, `next build` succeeds, and the
server suite is 599 green.

---

## 6. Outstanding work

Being explicit, because the site is **not** fully translated yet. The app is fully working in English; untranslated components show English rather than breaking.

### Where translation stands

| Section | UI strings | Editorial content |
| --- | --- | --- |
| Chrome, home, index heroes | ✅ | — |
| Transfers | ✅ | ✅ (in the database) |
| Tours | ✅ | ✅ |
| Hotels | ❌ | ❌ |
| Destinations | ❌ | ❌ |
| Experiences | ❌ | ❌ |
| About, Contact, RequestModal | ❌ | — |
| Admin panel | ❌ | — |

The merge layer is built and proven, in both forms: `data/i18n/tours.ts` for content the client still carries, and the `transfer_*_translations` tables for content that has moved to the database. Which one a vertical should use is decided by whether an operator needs to edit it — hotels are already live records, so they follow transfers; tours are still fixtures, so they follow tours.

### Files that still hold hardcoded English UI text

The dictionaries already contain most of these keys — the files simply do not read from them yet.

```
components/hotels/*            BookingSummary, HotelFilters, HotelExplorer,
                               HotelCard, HotelListItem, HotelRoomCard,
                               HotelPolicies, HotelReviews, HotelAmenities,
                               HotelSearchPanel, HotelSectionNav
app/[locale]/(site)/hotels/[slug]/page.tsx
app/[locale]/(site)/destinations/**            DestinationCard, DestinationFeature
app/[locale]/(site)/experiences/**             ExperienceCard, ExperienceExplorer,
                                               ExperienceBookingCard
app/[locale]/(site)/about/page.tsx
app/[locale]/(site)/contact/page.tsx           + components/contact/ContactForm
components/ui/RequestModal.tsx
components/admin/*                             the older 15 files, entirely English
```

Two vocabulary maps are still English-in-data and should move to the dictionary the way vehicle classes and features did: `amenityLabels` in `data/amenities.ts` and the `label` fields on `hotelSortOptions` / `propertyTypes` in `data/hotels.ts`.

### Editorial content still English-only

| File | Words | Entities | Status |
| --- | --- | --- | --- |
| `data/tours.ts` | 3,262 | 10 | ✅ translated |
| ~~`data/transfers.ts`~~ | — | — | moved to `transfer_vehicles` |
| ~~`data/transferLocations.ts`~~ | — | — | moved to `transfer_points` |
| `data/hotels.ts` | 3,768 | 9 | ❌ |
| `data/destinations.ts` | 2,392 | 8 | ❌ |
| `data/experiences.ts` | 1,858 | 8 | ❌ |

So hotel descriptions, room names, guest reviews, destination copy and experience listings still render in English on `/ka`, `/ru` and `/he`.

Hotels are the largest and most awkward of the three: each property carries rooms, policies, category score labels, nearby places and fictional guest reviews. The reviews are worth a decision rather than a default — a translated "verified guest review" is a slightly odd artefact, and leaving them in the reviewer's own language may read as more honest than translating them.

### RTL is partial

`dir="rtl"` is set and Hebrew mirrors correctly in the header, footer, nav, home sections and the whole transfers and tours flow. The files listed above still use physical `pl-` / `left-` / `text-right` classes, so those areas will not mirror until converted — `HotelRoomCard`, `HotelSearchPanel` and `BookingSummary` are the visible offenders.

### Translation quality

The Georgian, Russian and Hebrew UI copy was **AI-generated, not human-reviewed**. It is accurate and idiomatic, but this is marketing copy for a premium brand, and lines like *"Guests are a gift from God"* carry cultural weight that deserves a native speaker before launch — particularly the Georgian, where the source is quoting a Georgian idiom back to Georgian readers.

### Minor

`text-[0.8125rem]` appears 15 times, duplicating `.type-caption` — worth folding into the type scale for the same centralisation reason. The brand gradient (`#EB6830 → #D95624`) is not implemented; nothing uses it, and adding unused CSS seemed worse than leaving it out.

---

## 7. File reference

### Created

```
proxy.ts                          Locale routing (Next 16 middleware convention)
lib/i18n/config.ts                Locales, direction, URL helpers
lib/i18n/server.ts                getI18n() for Server Components
lib/i18n/provider.tsx             LocaleProvider + useI18n() for Client Components
lib/i18n/dictionaries.ts          Dictionary lookup + fill()
lib/i18n/cookie.ts                Locale preference persistence
lib/i18n/ui/en.ts                 English — source of truth for the schema
lib/i18n/ui/ka.ts                 ქართული
lib/i18n/ui/ru.ts                 Русский
lib/i18n/ui/he.ts                 עברית
components/layout/Logo.tsx        Brand mark (placeholder — replace with real artwork)
app/icon.svg                      Browser tab icon
```

### Substantially rewritten

```
app/globals.css                   Design tokens, type scale, scrims, RTL-safe utilities
app/[locale]/layout.tsx           Root layout — lang/dir, fonts, provider, hreflang
lib/navigation.ts                 Nav items now carry dictionary keys, not labels
components/layout/Header.tsx
components/layout/Footer.tsx
components/layout/LanguageMenu.tsx
components/layout/MobileNavigation.tsx
components/home/*.tsx             All 10 sections
```

### Structural change

Every route moved from `app/*` to `app/[locale]/*`. `app/globals.css` and `app/icon.svg` stay at the `app/` root.

---

## 8. Error handling

What happens when the API does not answer, decided once rather than per screen.

### The client

`lib/api/client.ts` remains the only `fetch` against the API, and now also decides what "no answer" means:

- **Every request has a timeout** — 15 s by default, overridable per call with `timeoutMs`. It applies to Server Components too, so a socket that never answers cannot hold a page render open indefinitely. A caller-supplied `signal` is still honoured; the two are combined.
- **`NetworkError extends ApiError`** with `status: 0` and `kind: "network" | "timeout"`. A rejected `fetch` (offline, DNS, connection refused) and a fired timeout both become one, carrying a message fit to show. Only the `fetch` promise is wrapped, so `redirect()` / `notFound()` thrown by callers are untouched. A caller's own abort is re-thrown as-is.
- **`describeError(error, fallback?)`** is the one way to turn a caught error into a sentence. An `ApiError` (including `NetworkError`) speaks for itself; anything else — a bug — gets the generic fallback, or a domain-specific one where the screen has more to say ("Could not close those dates."). The previous ~26 hand-rolled ternaries all use it.

### Boundaries

| File | Catches | Chrome kept |
| --- | --- | --- |
| `app/global-error.tsx` | The root layout itself | None — brings its own `<html>`, imports `globals.css`, English only |
| `app/[locale]/(site)/error.tsx` | Any public page | Header and footer; localised via `t.error.*` |
| `app/[locale]/(site)/transfers/error.tsx` | Transfers, with its own wording | As above |
| `app/[locale]/(admin)/admin/(panel)/error.tsx` | Any panel screen | Sidebar and top bar |
| `app/[locale]/(admin)/admin/error.tsx` | The panel shell and the sign-in screen | None |
| `app/[locale]/(portal)/portal/error.tsx` | Any portal page | Portal header and nav |

The new boundaries use Next 16.3's `retry` prop rather than `reset`: the failing content is server-rendered, and re-rendering the same failed payload would only fail again. `app/[locale]/(portal)/portal/not-found.tsx` gives a partner who hits a bad reference a portal-styled 404 instead of the marketing one.

### What is guarded, and what is not

Primary content is left to the boundary — a hotel list, a bookings register or an admin table that cannot load *is* the failure, and a page pretending otherwise is worse. Decoration is guarded: the panel's sidebar counts render as zeros, the hotel page drops its "more properties" rail, and the partner dashboard says its recent-bookings list is unavailable while still showing the figures above it. `useViewer` no longer treats a failed `/api/auth/me` probe as "signed out" — only a 401/403 does; anything else leaves the answer unknown and is retried on the next mount.

---

## 9. Admin navigation

The sidebar had gone flat and lopsided. Inventory listed seven destinations, four of which were transfers — routes, fleet, pick-up points, extras — so the vertical that happened to own the most screens visually outweighed hotels, destinations and tours put together. It was also the reason `/admin/transfers/bookings` had no entry at all: there was nowhere left to put it.

### Three levels, each earning its place

`lib/admin/navigation.ts` now describes **groups** (Operations, Inventory, Network), **sections** (a vertical with several screens) and **items** (the screens). `AdminNavEntry` is a union of item and section, narrowed by `isAdminNavSection`, so a group can hold either and the sidebar renders whichever it finds.

A vertical stays flat until it has more than one catalogue screen. Hotels, destinations and tours each have exactly one way in, and a disclosure wrapping a single link is a control that hides one thing. Only Transfers is a section today.

| Group | Contents |
| --- | --- |
| Operations | Overview · Hotel bookings · Transfer bookings |
| Inventory | Destinations · Hotels · **Transfers** (Routes, Fleet, Pick-up points, Extras) · Tours |
| Network | Partners · Applications |

### The active-state trap

The old file carried a comment explaining why Transfers could not be a parent: `isAdminPathActive` matches on a path prefix, so an entry at `/admin/transfers` stayed lit while a child screen was open and two rows looked selected. That constraint is gone, not worked around — `isAdminSectionActive` asks whether **any child** is active rather than testing the shared prefix.

That distinction is now load-bearing. Transfer bookings sits at `/admin/transfers/bookings`, under the same prefix, but it is an Operations screen and belongs to no catalogue section. A prefix test would light up Inventory → Transfers every time an operator opened a transfer booking. The child test does not.

The section header is a `button`, not a link — `/admin/transfers` only redirects, and a disclosure that is also a link is a control whose click does two different things depending on where it lands. The redirect stays as a bookmark catcher.

### Two registers, both named

Adding Transfer bookings meant "Bookings" stopped being unambiguous, so it is now **Hotel bookings**. A `TRF-` reference is not a `BKG-` one — the two registers share no identifier space and were never going to merge.

### Behaviour

- **Expanded by default.** The panel is worked by keyboard all day; hiding four screens behind a click to save four lines is a bad trade. The collapse is for an operator who never touches transfers.
- **A collapsed section opens itself** when the route moves inside it, so the sidebar can never hide the screen you are looking at. Done by adjusting state during render, not in an effect — it has to be true on the first paint after the navigation, not one frame later.
- **Collapse survives navigation.** `AdminShell` is a persistent client layout, so `AdminSidebar` is not remounted between panel screens. No storage, no hydration mismatch.
- **Badges roll up.** A collapsed section shows the sum of its children's queue counts, or collapsing would be a way to lose work. Nothing under Transfers is badged yet; the mechanism is there so the first one that is cannot go unnoticed.

### RTL and a11y

The disclosure chevron uses `rotate-180` rather than a left/right glyph — a rotation, not a direction, so it must not flip in Hebrew. The child run is indented with `ms-[1.3125rem]` against a `border-s` rail aligned to the parent's icon; both move to the right in Hebrew with everything else.

Each group's `<ul>` is now `aria-labelledby` its heading, the section button carries `aria-expanded` and `aria-controls`, and `aria-current="page"` stays on the leaf link — never on the section, which is not a destination.

---

*Generated with [Claude Code](https://claude.com/claude-code)*
