/**
 * The bed vocabulary.
 *
 * `sleeps` is the load-bearing column: summing it across a room's beds gives
 * that room's real physical capacity, which is what decides whether a family of
 * four needs an extra bed or simply does not fit. A bed configuration stored as
 * the string "1 double bed + sofa" cannot answer that question.
 *
 * A sofa bed sleeps one by default because that is the safe assumption; a
 * property that puts two children on one can say so by setting quantity 2, and
 * that is a per-property decision rather than a fact about sofa beds.
 */
export const BED_TYPES = [
    { code: 'SINGLE', name: 'Single Bed', sleeps: 1, icon: 'bed-single' },
    { code: 'TWIN', name: 'Twin Bed', sleeps: 1, icon: 'bed-single' },
    { code: 'DOUBLE', name: 'Double Bed', sleeps: 2, icon: 'bed-double' },
    { code: 'QUEEN', name: 'Queen Bed', sleeps: 2, icon: 'bed-double' },
    { code: 'KING', name: 'King Bed', sleeps: 2, icon: 'bed-double' },
    { code: 'SOFA', name: 'Sofa Bed', sleeps: 1, icon: 'sofa' },
    { code: 'BUNK', name: 'Bunk Bed', sleeps: 2, icon: 'bunk-bed' },
    { code: 'FUTON', name: 'Futon', sleeps: 1, icon: 'bed' }
].map((bed, index) => ({ ...bed, sortOrder: index }));
