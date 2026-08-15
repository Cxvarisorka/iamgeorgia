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
5. [Outstanding work](#5-outstanding-work)
6. [File reference](#6-file-reference)

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

Accessors take an **optional** locale, and the omission is meaningful. `getTransferLocation(id)` returns the canonical record and is what the pricing engine calls — it only ever reads the coordinates, and a translated name would be dead weight in every quote. `getTransferLocation(id, locale)` returns the reader's version and is what components call.

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

## 5. Outstanding work

Being explicit, because the site is **not** fully translated yet. The app is fully working in English; untranslated components show English rather than breaking.

### Where translation stands

| Section | UI strings | Editorial content |
| --- | --- | --- |
| Chrome, home, index heroes | ✅ | — |
| Transfers | ✅ | ✅ |
| Tours | ✅ | ✅ |
| Hotels | ❌ | ❌ |
| Destinations | ❌ | ❌ |
| Experiences | ❌ | ❌ |
| About, Contact, RequestModal | ❌ | — |
| Admin panel | ❌ | — |

The merge layer described above is now **built and proven** on two verticals, so the remaining work is filling it in rather than designing it. The pattern to copy is `data/i18n/tours.ts` for content and `components/tours/TourExplorer.tsx` for a filter UI.

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
components/admin/*                             15 files, entirely English
```

Two vocabulary maps are still English-in-data and should move to the dictionary the way vehicle classes and features did: `amenityLabels` in `data/amenities.ts` and the `label` fields on `hotelSortOptions` / `propertyTypes` in `data/hotels.ts`.

### Editorial content still English-only

| File | Words | Entities | Status |
| --- | --- | --- | --- |
| `data/tours.ts` | 3,262 | 10 | ✅ translated |
| `data/transfers.ts` | ~1,900 | 9 | ✅ translated |
| `data/transferLocations.ts` | ~200 | 19 | ✅ translated |
| `data/hotels.ts` | 3,768 | 9 | ❌ |
| `data/destinations.ts` | 2,392 | 8 | ❌ |
| `data/experiences.ts` | 1,858 | 8 | ❌ |

So hotel descriptions, room names, guest reviews, destination copy and experience listings still render in English on `/ka`, `/ru` and `/he`.

Hotels are the largest and most awkward of the three: each property carries rooms, policies, category score labels, nearby places and fictional guest reviews. The reviews are worth a decision rather than a default — a translated "verified guest review" is a slightly odd artefact, and leaving them in the reviewer's own language may read as more honest than translating them.

### Two stray `console.log`s

`components/hotels/HotelCard.tsx` and `app/[locale]/(site)/hotels/[slug]/page.tsx` each log on every render. Left in place only because the hotels pass has not run yet; they should not reach a commit.

### RTL is partial

`dir="rtl"` is set and Hebrew mirrors correctly in the header, footer, nav, home sections and the whole transfers and tours flow. The files listed above still use physical `pl-` / `left-` / `text-right` classes, so those areas will not mirror until converted — `HotelRoomCard`, `HotelSearchPanel` and `BookingSummary` are the visible offenders.

### Translation quality

The Georgian, Russian and Hebrew UI copy was **AI-generated, not human-reviewed**. It is accurate and idiomatic, but this is marketing copy for a premium brand, and lines like *"Guests are a gift from God"* carry cultural weight that deserves a native speaker before launch — particularly the Georgian, where the source is quoting a Georgian idiom back to Georgian readers.

### Minor

`text-[0.8125rem]` appears 15 times, duplicating `.type-caption` — worth folding into the type scale for the same centralisation reason. The brand gradient (`#EB6830 → #D95624`) is not implemented; nothing uses it, and adding unused CSS seemed worse than leaving it out.

---

## 6. File reference

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

*Generated with [Claude Code](https://claude.com/claude-code)*
