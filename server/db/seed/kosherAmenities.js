/**
 * The kosher facility vocabulary.
 *
 * These are amenities, not a parallel feature system, and that is the whole
 * design decision: search filtering, the admin checklist, icons, per-hotel
 * notes and translations already work for amenities, so "every property in
 * Tbilisi with a Shabbat elevator" is an indexed filter on day one rather than
 * a new query path.
 *
 * They live in their own file rather than at the end of `amenities.js` because
 * `sortOrder` there is derived from array position, and appending fifty rows to
 * that list would renumber nothing but would make the two groups impossible to
 * read apart. Sort order here continues after the general vocabulary.
 *
 * What is deliberately *not* here:
 *
 *   * Anything that carries assurance. "Kosher certified" is not an amenity —
 *     it is derived from a verified, unexpired certificate. An amenity is the
 *     property's own statement about itself, and nothing more.
 *   * Board codes. A kosher breakfast is still `BB`; whether the kitchen that
 *     serves it is kosher is a fact about the kitchen. Adding KOSHER_BB to
 *     MealPlanCode would double the board vocabulary and stop a kosher
 *     half-board matching a search for half board.
 *
 * `scope` is HOTEL throughout: none of these describe one room. The one that
 * comes closest — physical room keys — is a property-wide operational choice
 * ("we can issue mechanical keys"), not a per-room attribute, and modelling it
 * per room would mean every room type of every kosher hotel had to repeat it.
 */

/** Where the general vocabulary in `amenities.js` stops. */
const SORT_BASE = 1000;

export const KOSHER_AMENITIES = [
    // --- Food & kitchen ---------------------------------------------------
    { code: 'kosherRestaurant', name: 'Kosher Restaurant', category: 'KosherFood', scope: 'HOTEL', icon: 'utensils' },
    { code: 'kosherKitchen', name: 'Kosher Kitchen', category: 'KosherFood', scope: 'HOTEL', icon: 'chef-hat' },
    { code: 'kosherBreakfast', name: 'Kosher Breakfast', category: 'KosherFood', scope: 'HOTEL', icon: 'croissant' },
    { code: 'kosherLunch', name: 'Kosher Lunch', category: 'KosherFood', scope: 'HOTEL', icon: 'sandwich' },
    { code: 'kosherDinner', name: 'Kosher Dinner', category: 'KosherFood', scope: 'HOTEL', icon: 'soup' },
    {
        code: 'separateMeatDairy',
        name: 'Separate Meat & Dairy Preparation',
        category: 'KosherFood',
        scope: 'HOTEL',
        icon: 'split'
    },
    {
        code: 'kosherMealOnRequest',
        name: 'Kosher Meal on Request',
        category: 'KosherFood',
        scope: 'HOTEL',
        icon: 'clipboard-list'
    },
    { code: 'passoverKosher', name: 'Kosher for Passover', category: 'KosherFood', scope: 'HOTEL', icon: 'wheat-off' },
    { code: 'kosherWine', name: 'Kosher Wine', category: 'KosherFood', scope: 'HOTEL', icon: 'wine' },

    // --- Shabbat ----------------------------------------------------------
    { code: 'shabbatElevator', name: 'Shabbat Elevator', category: 'Shabbat', scope: 'HOTEL', icon: 'move-vertical' },
    { code: 'shabbatMeals', name: 'Shabbat Meals', category: 'Shabbat', scope: 'HOTEL', icon: 'utensils-crossed' },
    { code: 'manualRoomKeys', name: 'Physical Room Keys', category: 'Shabbat', scope: 'HOTEL', icon: 'key-round' },
    { code: 'shabbatLighting', name: 'Shabbat Room Lighting', category: 'Shabbat', scope: 'HOTEL', icon: 'lamp' },
    { code: 'shabbatHotPlate', name: 'Shabbat Hot Plate', category: 'Shabbat', scope: 'HOTEL', icon: 'flame' },
    {
        code: 'shabbatLateCheckout',
        name: 'Late Saturday Checkout',
        category: 'Shabbat',
        scope: 'HOTEL',
        icon: 'clock'
    },

    // --- Religious facilities ---------------------------------------------
    // The `*Nearby` pair are filterable booleans; which synagogue, how far and
    // where it is lives in `Hotel.nearby`, which is read whole with the detail
    // page and never queried on its own.
    { code: 'synagogueOnSite', name: 'Synagogue on Property', category: 'Religious', scope: 'HOTEL', icon: 'church' },
    { code: 'synagogueNearby', name: 'Synagogue Nearby', category: 'Religious', scope: 'HOTEL', icon: 'map-pin' },
    { code: 'prayerRoom', name: 'Prayer Room', category: 'Religious', scope: 'HOTEL', icon: 'book-open' },
    { code: 'minyanDaily', name: 'Daily Minyan', category: 'Religious', scope: 'HOTEL', icon: 'users' },
    { code: 'mikvehOnSite', name: 'Mikveh on Property', category: 'Religious', scope: 'HOTEL', icon: 'droplets' },
    { code: 'mikvehNearby', name: 'Mikveh Nearby', category: 'Religious', scope: 'HOTEL', icon: 'map-pin' },
    { code: 'eruv', name: 'Within an Eruv', category: 'Religious', scope: 'HOTEL', icon: 'spline' }
].map((amenity, index) => ({ ...amenity, sortOrder: SORT_BASE + index }));

export const KOSHER_AMENITY_CODES = KOSHER_AMENITIES.map(({ code }) => code);

/**
 * The three categories that make up the kosher panel.
 *
 * Exported as data rather than written out at each call site because four
 * places need the same list — the admin panel's kosher sections, the general
 * amenity checklist that must *exclude* them, the serializer that projects a
 * hotel's kosher features, and the booking-request capability check.
 */
export const KOSHER_AMENITY_CATEGORIES = ['KosherFood', 'Shabbat', 'Religious'];

/**
 * Codes an agency may request on a booking beyond what the hotel has ticked.
 *
 * A property that serves kosher food can be asked for a kosher meal even if
 * nobody remembered to tick `kosherMealOnRequest`; refusing that would make the
 * request form useless for the properties it matters most to. Everything else
 * has to be a capability the hotel actually claims.
 */
export const ALWAYS_REQUESTABLE_CODES = ['kosherMealOnRequest'];
