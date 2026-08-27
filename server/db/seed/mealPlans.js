/**
 * Standardised board codes.
 *
 * Global rather than per-hotel so that "every half-board offer in Bakuriani" is
 * a comparable filter across properties. What a particular hotel *means* by HB
 * — which meals, at what times, drinks included or not — lives in
 * HotelMealPlan, because that genuinely does differ property by property.
 *
 * The `_PLUS` variants are the ones people forget: half board plus normally
 * means the same meals with drinks included, and a guest who books HB expecting
 * HB+ has a complaint the platform caused.
 */
export const MEAL_PLANS = [
    { code: 'RO', name: 'Room Only', description: 'No meals included.' },
    { code: 'BB', name: 'Bed & Breakfast', description: 'Breakfast included.' },
    { code: 'HB', name: 'Half Board', description: 'Breakfast and one other meal, usually dinner.' },
    { code: 'HB_PLUS', name: 'Half Board Plus', description: 'Half board with selected drinks included.' },
    { code: 'FB', name: 'Full Board', description: 'Breakfast, lunch and dinner.' },
    { code: 'FB_PLUS', name: 'Full Board Plus', description: 'Full board with selected drinks included.' },
    { code: 'AI', name: 'All Inclusive', description: 'All meals, snacks and most drinks.' },
    { code: 'UAI', name: 'Ultra All Inclusive', description: 'All inclusive with premium drinks and extras.' }
].map((plan, index) => ({ ...plan, sortOrder: index }));
