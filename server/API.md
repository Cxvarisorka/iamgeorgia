# API surface

Every endpoint under `/api`. Written for the client: it says what to call, what
comes back, and which fields depend on who is asking.

**Conventions**

- Auth is an httpOnly session cookie (`iag_session`). Send `credentials: 'include'`.
- Errors are always `{ error: { message, details? } }`. `details` is a zod issue
  array for a 400, or a structured object for a domain conflict.
- **Money is integer minor units** and always travels with a `currency`.
- **Dates are `YYYY-MM-DD` strings**, never instants. Check-out is exclusive.
- Lists are `{ data, total, page, pageSize, totalPages }`.
- Fields marked **staff** are *absent*, not null, unless the viewer is an admin
  or the supplier that owns the hotel.

---

## Public catalogue

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/destinations` | Whole tree, nested. `?locale&countryCode&featured` |
| GET | `/destinations/:slug` | Detail with `parent`, `children` |
| GET | `/hotels` | Browse, no dates. `?search&destinationSlug&destinationPath&propertyType&minStars&amenity&featured&locale&page&pageSize` |
| GET | `/hotels/:slug` | Detail with `roomTypes[]`, `amenities[]`, `images[]`, `childPolicy` |
| GET | `/amenities` | Vocabulary. `?category&scope&locale` |

Only `ACTIVE` hotels are ever returned, whatever the query string says.

## Dated search

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/search` | `?checkIn&checkOut&adults&childAges&rooms` + filters. Repeated params for arrays |
| GET | `/search/hotels/:slug` | Availability for one hotel, grouped by room |
| POST | `/search/offers/quote` | `{ token }` → re-priced offer, or 409 |

`/search` filters: `destinationSlug`, `destinationPath`, `countryCode`,
`propertyType`, `minStars`, `amenity` (repeatable), `mealPlan`, `refundableOnly`,
`locale`, `page`, `pageSize`.

**Search result card**

```jsonc
{
  "id": "...", "slug": "...", "name": "...", "starRating": 4,
  "coverImage": { "url": "...", "variants": [{ "variant": "card", "format": "webp", "url": "..." }] },
  "destination": { "id": "...", "name": "...", "path": "/georgia/..." },
  "startingFrom": { "totalCents": 52500, "perNightCents": 17500, "currency": "GEL" },
  "mealPlans": ["BB"], "refundable": true, "offerCount": 3,
  "cheapestOffer": { /* offer, below */ }
}
```

**Offer** — the unit taken into checkout.

```jsonc
{
  "token": "…signed…",
  "roomTypeId": "...", "ratePlanId": "...", "name": "Breakfast, flexible",
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
```

`quote.nights[].netCents`, `quote.totals.netCents`, `markupBps`, `marginCents`
are **staff** only.

Errors: `409 { reason: 'PRICE_CHANGED', quotedCents, currentCents }`,
`409 { reason: 'UNAVAILABLE' }`, `410` for an expired token.

## Bookings

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/bookings/holds` | `{ token }` → hold. 409 if gone |
| DELETE | `/bookings/holds/:token` | Always 204 |
| POST | `/bookings` | `{ holdToken \| offerToken, leadGuest, guests?, specialRequests? }`. Send `Idempotency-Key` |
| GET | `/bookings/:reference` | Guests must add `?email=` |
| PATCH | `/bookings/:reference` | Amend paperwork only. `{ leadGuest?, specialRequests?, email? }` |
| GET | `/bookings/:reference/cancellation-quote` | `?email=` for guests |
| POST | `/bookings/:reference/cancel` | `{ reason?, email? }` |
| GET | `/partner/bookings` | Own bookings. `?status&from&to&search&page&pageSize` |
| GET | `/partner/dashboard` | `{ partner, stats: { listings, bookings, upcoming, cancelled } }` |

**There is no field for an amount.** The schema is strict; sending one is a 400.
`201` on create, `200` when a replay.

**Amendments are paperwork only.** `PATCH` reaches the lead guest's name,
email and phone, and the special requests — nothing that was priced. Dates,
rooms, board and party are not in the schema, because changing them means
releasing inventory and re-quoting: cancel and book again. Allowed while the
booking is `PENDING` or `CONFIRMED`; anything else is a `409` carrying the
status. Authorization is the same as a read, so a partner amends its own and a
guest amends theirs by quoting `email`.

**Booking detail**

```jsonc
{
  "reference": "BKG-000001", "status": "CONFIRMED",
  "hotel": { "id": "...", "name": "...", "slug": "..." },
  "hotelSnapshot": { /* name, address, phone, timezone, checkIn/checkOut times */ },
  "checkIn": "2027-06-01", "checkOut": "2027-06-04", "nights": 3, "rooms": 1,
  "leadGuestName": "...", "leadGuestEmail": "...",
  "currency": "GEL", "totalCents": 52500, "payableAtPropertyCents": 0,
  "bookingRooms": [{
    "id": "...", "status": "CONFIRMED",
    "roomTypeName": "Deluxe Double", "ratePlanName": "...",
    "mealPlan": { "code": "BB", "name": "..." },
    "bedConfiguration": "1 x King Bed",
    "cancellation": { "freeUntil": "...", "windows": [{ "fromAt": null, "toAt": "...", "chargeCents": 0 }] },
    "sellSubtotalCents": 52500,
    "nights": [{ "date": "2027-06-01", "sellCents": 17500 }],
    "guests": [{ "type": "ADULT", "firstName": "...", "isLead": true }]
  }]
}
```

Names come from the **snapshot**, not the live hotel. **staff**:
`netTotalCents`, `markupBps`, `marginCents`, `partner`, per-night `netCents`.

## Transfers

Point-to-point ground transport. The shape mirrors hotels — a signed quote
carried into an idempotent booking — with one structural difference: **there is
no inventory and there are no holds.** A private transfer is dispatched from an
elastic fleet, so nothing has to be claimed. What can stop a sale is a road
closing, which is a blackout.

### Catalogue

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/transfers/points` | The picker. `?search&kind&popular&locale`. Matches names, regions, IATA codes and every translation |
| GET | `/transfers/routes` | `?tier&category&featured&fromSlug&toSlug&search&locale&page&pageSize` |
| GET | `/transfers/routes/:slug` | Route landing page, with `stops[]` |
| GET | `/transfers/vehicles` | The fleet. `?vehicleClass&kind&locale` |
| GET | `/transfers/vehicles/:slug` | |
| GET | `/transfers/extras` | Child seats, ski carriage, extra stops |

Only `ACTIVE` rows are returned. A vehicle class is B2B by default — an
anonymous visitor sees only `b2cEnabled` classes, a signed-in partner sees the
whole active fleet, exactly as hotels work.

### Quotes

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/transfers/quotes` | `?from&to&date&time&tripType&returnDate&returnTime&adults&children&luggage&cabinBags&extra&locale` |
| POST | `/transfers/quotes/revalidate` | `{ token }` → re-priced offer. Not strict: it shows the new fare rather than refusing |

`from` and `to` are point slugs or ids. `extra` repeats: `?extra=childSeat&extra=skiEquipment`.

**Pricing is two-tier.** A curated `TransferRoutePrice` is used when one exists;
otherwise the fare is `max(minimumFare, distanceKm × perKm) + airportFee` from
the vehicle class. So every pair of points is bookable, and the ones that matter
commercially are priced by hand. The response says which was used — but only to
staff, in `quote.legs[].source`.

**Quote result**

```jsonc
{
  "from": { "id": "...", "slug": "tbilisi-airport", "name": "...", "kind": "AIRPORT", "code": "TBS", "region": "Tbilisi", "timezone": "Asia/Tbilisi" },
  "to": { /* the same shape */ },
  "route": { "slug": "tbilisi-airport-to-gudauri", "tier": "TIER_1", "distanceKm": 128, "startingFromCents": 12776 },
  "closed": false,
  "offers": [{
    "token": "…signed…",
    "vehicle": { "slug": "comfort-sedan-private-transfer", "name": "Comfort Sedan", "vehicleClass": "COMFORT", "body": "sedan", "kind": "PRIVATE", "maxPassengers": 3, "features": ["airConditioning"] },
    "quote": {
      "currency": "GEL",
      "perSeat": false,
      "legs": [{
        "direction": "OUTBOUND", "from": "…", "to": "…",
        "pickupAt": "2027-02-10T05:00:00.000Z",
        "distanceKm": 128, "durationMinutes": 135, "isNight": false,
        "baseFareCents": 17116, "nightSurchargeCents": 0,
        "extras": [{ "code": "childSeat", "quantity": 1, "totalCents": 2000 }],
        "sellCents": 17116
      }],
      "totals": { "sellCents": 17116, "totalCents": 17116 }
    }
  }]
}
```

`legs[].netCents`, `legs[].source`, `totals.netCents`, `markupBps`,
`marginCents` and the vehicle's `fallbackPricing` are **staff** only.

`closed: true` with an empty `offers` array means the road is shut for those
dates — a real answer, not an error.

Errors: `404` for a point we do not serve, `409 { reason: 'SAME_POINT' }`,
`422 { reason: 'TOO_SOON' | 'BEYOND_HORIZON' | 'RETURN_BEFORE_OUTBOUND' | 'PARTY_TOO_LARGE' }`,
`410` for an expired token.

A party that no vehicle can carry returns `200` with no offers. Capacity is a
hard constraint, not a filter.

### Transfer bookings

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/transfers/bookings` | `{ quoteToken, leadPassenger, flightNumber?, pickupAddress?, dropoffAddress?, specialRequests? }`. Send `Idempotency-Key` |
| GET | `/transfers/bookings/:reference` | Travellers must add `?email=` |
| PATCH | `/transfers/bookings/:reference` | Paperwork only |
| GET | `/transfers/bookings/:reference/cancellation-quote` | |
| POST | `/transfers/bookings/:reference/cancel` | `{ reason?, email? }` |
| GET | `/partner/transfers/bookings` | Own bookings. `?status&from&to&search&page&pageSize` |

References are `TRF-000001`. **There is no field for an amount**; the schema is
strict, so sending one is a 400. `201` on create, `200` on a replay.

**Amendments are paperwork only** — the lead passenger, their phone, the flight
number and the two addresses. The journey, the vehicle, the date and the party
are not in the schema, because changing any of them changes the fare: cancel and
book again. Allowed while `PENDING` or `CONFIRMED`, otherwise a `409` carrying
the status.

**Cancellation reads only the schedule frozen at confirmation.** The vehicle's
current policy is never consulted, so terms tightened later cannot change what
an earlier traveller is owed.

**Booking detail**

```jsonc
{
  "reference": "TRF-000001", "status": "CONFIRMED", "tripType": "ONE_WAY",
  "pickupAt": "2027-02-10T05:00:00.000Z", "returnPickupAt": null,
  "route": { /* snapshot: fromName, toName, distanceKm, stops[] */ },
  "vehicle": { /* snapshot: name, vehicleClass, providerName, pickupProcedure */ },
  "adults": 2, "children": 0, "luggage": 2,
  "leadPassengerName": "...", "leadPassengerEmail": "...",
  "flightNumber": "TK378", "pickupAddress": "Terminal 1, arrivals",
  "currency": "GEL", "totalCents": 17116,
  "cancellation": { "freeUntil": "...", "windows": [{ "fromAt": null, "toAt": "...", "chargeCents": 0 }] },
  "legs": [{ "legIndex": 0, "direction": "OUTBOUND", "from": "...", "to": "...", "pickupAt": "...", "sellCents": 17116 }],
  "extras": [{ "code": "childSeat", "quantity": 1, "totalCents": 2000 }]
}
```

Names come from the **snapshot**, not the live route. **staff**:
`netTotalCents`, `markupBps`, `marginCents`, `partner`, per-leg `netCents`.

### Transfer admin

All under `/admin/transfers/*`, guarded by `authenticate + requireAdmin`.

| Method | Path |
| --- | --- |
| GET/POST | `/admin/transfers/points` · GET/PATCH/DELETE `/points/:id` |
| PUT | `/admin/transfers/points/:id/translations/:locale` |
| GET/POST | `/admin/transfers/vehicles` · GET/PATCH `/vehicles/:id` · POST `/vehicles/:id/archive` |
| PUT | `/admin/transfers/vehicles/:id/translations/:locale` |
| GET/POST | `/admin/transfers/routes` · GET/PATCH `/routes/:id` |
| **PUT** | `/admin/transfers/routes/prices` — the bulk editor |
| PUT | `/admin/transfers/routes/:id/prices` · `/stops` · `/translations/:locale` |
| POST | `/admin/transfers/routes/:id/publish` · `/unpublish` · `/archive` |
| GET/POST/PUT/DELETE | `/admin/transfers/extras[/:code]` |
| GET/POST/DELETE | `/admin/transfers/blackouts[/:id]` |
| GET | `/admin/transfers/bookings` · `/:reference` · POST `/:reference/cancel` |

### Seeding the transfer catalogue

```
node scripts/seed-reference.js              # first — shared policy templates
node scripts/seed-transfers.js              # 67 points, 9 classes, 396 routes, 3,564 prices
node scripts/seed-transfer-translations.js  # ka/ru/he, recovered from git history
node scripts/seed-transfer-bookings.js      # demo bookings, for a panel with data in it
node scripts/seed-transfer-bookings.js --clear
```

All four are idempotent and none of them deletes anything an operator has
changed — a re-run refreshes editorial fields and leaves every curated price
where it was. `seed-transfer-bookings.js` goes through the real quote and
confirmation path rather than inserting rows, so if it runs, the booking path
runs; its records carry `source: 'demo'` and `@demo.iamgeorgia.test` addresses,
which is what `--clear` matches.

`DELETE /points/:id` **retires** rather than deletes — routes and bookings
reference the row with `Restrict`, and a place that has ever been travelled to
has to stay readable.

Every route mutation returns the route plus `publishChecklist: [{ code, message }]`.
`POST /publish` answers **422** with `details.missing` when a route has no price
at all, because publishing one would silently fall through to the distance
estimate. Missing copy is listed but does not block.

**Route price grid** (whole-grid PUT, so a half-applied grid is impossible):

```jsonc
{ "prices": [{ "vehicleId": "...", "oneWayCents": 17500, "returnCents": null, "netCents": null }] }
```

**Bulk repricing:**

```jsonc
{ "tier": "TIER_1", "vehicleIds": ["..."], "perKmCents": 150, "overwrite": false }
```

Either `perKmCents` or `flatCents`, never both. **A filter is required** —
`tier`, `category` or `routeIds` — there is deliberately no way to reprice the
whole catalogue in one call. `overwrite` defaults to false, so the ordinary use
fills gaps and leaves every figure someone has already set. Returns
`{ routes, written, kept }`.

---

## Admin

All under `/admin/*`, guarded by `authenticate + requireAdmin`.

### Hotels

| Method | Path |
| --- | --- |
| GET / POST | `/admin/hotels` |
| GET / PATCH | `/admin/hotels/:id` |
| POST | `/admin/hotels/:id/publish` · `/unpublish` · `/archive` |
| PUT | `/admin/hotels/:id/amenities` — `{ amenities: [{ amenityId, note? }] }` |
| POST / PATCH / DELETE | `/admin/hotels/:id/images` · `/images/:imageId` |
| PUT | `/admin/hotels/:id/images/order` — `{ order: [imageId] }` |
| PUT | `/admin/hotels/:id/translations/:locale` |

`GET /admin/hotels/:id` and every mutation return the hotel plus
`publishChecklist: [{ code, message }]`. `POST /publish` answers **422** with
`details.missing` when it is not empty. There is no DELETE.

Create takes only: `slug, name, propertyType, destinationId, starRating,
supplierId?, countryCode?, timezone?, currency?`. Everything else is PATCH.

### Rooms, rates, inventory

| Method | Path |
| --- | --- |
| GET / POST | `/admin/hotels/:hotelId/room-types` |
| GET / PATCH | `…/room-types/:roomTypeId` |
| POST | `…/room-types/:roomTypeId/archive` |
| PUT | `…/room-types/:id/beds` — `{ beds: [{ bedTypeCode, quantity, groupIndex }] }` |
| PUT | `…/room-types/:id/amenities` |
| POST/PATCH/DELETE/PUT | `…/room-types/:id/images`, `/images/:imageId`, `/images/order` |
| GET / POST | `…/room-types/:id/rate-plans` |
| GET / PATCH | `…/rate-plans/:ratePlanId` |
| POST | `…/rate-plans/:id/archive` |
| POST/PUT/DELETE | `…/rate-plans/:id/restrictions[/:restrictionId]` |
| **PUT** | `…/room-types/:id/inventory` — the bulk editor |
| **GET** | `…/room-types/:id/inventory/calendar?from&to` |
| **PUT** | `…/rate-plans/:id/rates` — the bulk editor |
| GET / PUT | `/admin/hotels/:id/child-policy` |
| GET/POST/PUT | `/admin/hotels/:id/policies/cancellation[/:policyId]` |
| GET/POST/PUT | `/admin/hotels/:id/policies/payment[/:policyId]` |
| GET / PUT | `/admin/hotels/:id/meal-plans` |
| GET/POST/PUT/DELETE | `/admin/hotels/:id/tax-fees[/:taxFeeId]` |

**Bulk range body** (both inventory and rates):

```jsonc
{ "from": "2027-12-01", "to": "2027-12-31",
  "weekdays": [1,2,3,4],           // ISO, 1=Mon. Omit for every day
  "totalUnits": 5, "stopSell": false, "minStay": 2,
  "closedToArrival": false, "closedToDeparture": false }
```

```jsonc
{ "from": "2027-12-01", "to": "2027-12-31", "weekdays": [5,6,7],
  "netCents": 12500, "sellCents": null,
  "extraAdultCents": 3000, "extraChildCents": null, "singleOccupancyCents": null,
  "closed": false }
```

**Anything omitted keeps its existing value.** Returns `{ nights, days }`.
409 with `details.conflicts[{ date, committed }]` if a reduction would oversell.

**Calendar response**

```jsonc
{ "roomType": { "id": "...", "name": "...", "code": "..." },
  "nights": [{
    "date": "2027-12-01",
    "totalUnits": 5, "blockedUnits": 0, "bookedUnits": 1, "heldUnits": 0,
    "availableUnits": 4,
    "stopSell": false, "minStay": null, "closedToArrival": false, "closedToDeparture": false,
    "rates": [{ "ratePlanId": "...", "ratePlanName": "...", "netCents": 12500, "sellCents": null, "closed": false }]
  }] }
```

### Everything else

| Method | Path |
| --- | --- |
| GET/POST | `/admin/destinations`, `GET /admin/destinations/tree` |
| GET/PATCH/DELETE | `/admin/destinations/:id` |
| PUT | `/admin/destinations/:id/translations/:locale` |
| GET/POST | `/admin/amenities`, `GET/PATCH /admin/amenities/:id` |
| GET/POST | `/admin/media` (multipart: `file`, `category`, `altText?`) |
| GET/DELETE | `/admin/media/:id`, `GET /admin/media/:id/url` (signed, private only) |
| GET | `/admin/bookings`, `/admin/bookings/:reference` |
| POST | `/admin/bookings/:reference/cancel` |
| GET/POST | `/admin/pricing-rules`, `GET /admin/pricing-rules/explain?partnerId&hotelId` |
| PUT/DELETE | `/admin/pricing-rules/:id` |

Media categories decide visibility, not the caller: `HOTEL_IMAGE`, `ROOM_IMAGE`,
`AMENITY_ICON` are public; `CONTRACT`, `RATE_SHEET`, `INVOICE`, `VOUCHER`,
`IMPORT`, `OTHER` are private and have **no URL** — fetch `/url` for a
60-second signed link.

## Supplier extranet

`/partner/hotels`, guarded by `authenticate + requireApprovedPartner`, scoped to
the caller's own properties. Another supplier's id returns **404, not 403**.

| Method | Path | Role |
| --- | --- | --- |
| GET | `/partner/hotels` | any partner role |
| GET | `/partner/hotels/:hotelId` | any |
| GET | `/partner/hotels/:hotelId/room-types` | any |
| GET | `…/room-types/:id/inventory/calendar` | any |
| PUT | `…/room-types/:id/inventory` | **OWNER / ADMIN only** |
| PUT | `…/rate-plans/:id/rates` | **OWNER / ADMIN only** |
| GET | `/partner/hotels/:hotelId/bookings` | any |

A `PARTNER_AGENT` gets 403 on the two writes.

## Enums the client needs

```
PropertyType   Hotel Boutique Resort Guesthouse Lodge Apartment Chalet Hostel Villa
HotelStatus    DRAFT ACTIVE INACTIVE SUSPENDED ARCHIVED
RoomTypeStatus ACTIVE INACTIVE ARCHIVED
RatePlanStatus ACTIVE INACTIVE ARCHIVED
MealPlanCode   RO BB HB HB_PLUS FB FB_PLUS AI UAI
CancellationKind FLEXIBLE NON_REFUNDABLE TIERED
ChargeBasis    PERCENT_OF_TOTAL PERCENT_OF_FIRST_NIGHT FIXED_AMOUNT NIGHTS
PaymentTiming  PAY_NOW PAY_LATER DEPOSIT PAY_AT_HOTEL CREDIT_ACCOUNT
BedTypeCode    SINGLE TWIN DOUBLE QUEEN KING SOFA BUNK FUTON
BathroomType   PRIVATE ENSUITE SHARED
ChildChargeMode FREE PERCENT_OF_ADULT FIXED_PER_NIGHT FULL_ADULT
TaxFeeBasis    PERCENT PER_NIGHT_PER_PERSON PER_NIGHT_PER_ROOM PER_STAY
BookingStatus  PENDING CONFIRMED CANCELLED COMPLETED NO_SHOW
ImageCategory  Exterior Lobby Restaurant Pool Spa Room Bathroom View Facilities
AmenityCategory General FoodDrink Wellness Parking Business Family Ski Accessibility Transportation

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
TransferFeature       airConditioning wifi childSeat englishDriver meetGreet flightTracking bottledWater freeWaiting
```
