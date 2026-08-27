/**
 * The amenity vocabulary.
 *
 * Amenities were a Postgres enum in the prototype, which meant adding "Ski
 * Storage" was a schema migration and a per-property note like "Parking, 15 GEL
 * per night" had nowhere to live. They are rows now, and this file is the seed
 * that gets a fresh database to a usable state.
 *
 * The first fourteen codes are spelled exactly as the union in
 * `client/types/common.ts`, so the icon map on the client keeps resolving
 * without a translation layer. Everything after them is new; adding more is an
 * INSERT, and `scripts/seed-amenities.js` is idempotent, so extending this list
 * and re-running is the supported way to do it.
 *
 * `scope` is what stops "Airport Shuttle" being offered as a room amenity.
 */
export const AMENITIES = [
    // --- carried over from the client's AmenityId union -------------------
    { code: 'wifi', name: 'Wi-Fi', category: 'General', scope: 'BOTH', icon: 'wifi' },
    { code: 'breakfast', name: 'Breakfast', category: 'FoodDrink', scope: 'HOTEL', icon: 'coffee' },
    { code: 'pool', name: 'Swimming Pool', category: 'Wellness', scope: 'HOTEL', icon: 'waves' },
    { code: 'parking', name: 'Parking', category: 'Parking', scope: 'HOTEL', icon: 'car' },
    { code: 'restaurant', name: 'Restaurant', category: 'FoodDrink', scope: 'HOTEL', icon: 'utensils' },
    { code: 'spa', name: 'Spa', category: 'Wellness', scope: 'HOTEL', icon: 'flower' },
    { code: 'airConditioning', name: 'Air Conditioning', category: 'General', scope: 'BOTH', icon: 'wind' },
    { code: 'gym', name: 'Gym', category: 'Wellness', scope: 'HOTEL', icon: 'dumbbell' },
    { code: 'bar', name: 'Bar', category: 'FoodDrink', scope: 'HOTEL', icon: 'wine' },
    { code: 'petFriendly', name: 'Pet Friendly', category: 'General', scope: 'HOTEL', icon: 'paw-print' },
    { code: 'familyRooms', name: 'Family Rooms', category: 'Family', scope: 'HOTEL', icon: 'users' },
    { code: 'airportShuttle', name: 'Airport Shuttle', category: 'Transportation', scope: 'HOTEL', icon: 'plane' },
    { code: 'terrace', name: 'Terrace', category: 'General', scope: 'BOTH', icon: 'sun' },
    { code: 'roomService', name: 'Room Service', category: 'FoodDrink', scope: 'HOTEL', icon: 'concierge-bell' },

    // --- General ----------------------------------------------------------
    { code: 'reception24h', name: '24-hour Reception', category: 'General', scope: 'HOTEL', icon: 'clock' },
    { code: 'elevator', name: 'Elevator', category: 'General', scope: 'HOTEL', icon: 'move-vertical' },
    { code: 'nonSmoking', name: 'Non-smoking Rooms', category: 'General', scope: 'BOTH', icon: 'cigarette-off' },
    { code: 'luggageStorage', name: 'Luggage Storage', category: 'General', scope: 'HOTEL', icon: 'briefcase' },
    { code: 'laundry', name: 'Laundry Service', category: 'General', scope: 'HOTEL', icon: 'shirt' },
    { code: 'heating', name: 'Heating', category: 'General', scope: 'BOTH', icon: 'thermometer' },
    { code: 'garden', name: 'Garden', category: 'General', scope: 'HOTEL', icon: 'trees' },

    // --- Food & Drink -----------------------------------------------------
    { code: 'kitchenette', name: 'Kitchenette', category: 'FoodDrink', scope: 'ROOM', icon: 'chef-hat' },
    { code: 'minibar', name: 'Minibar', category: 'FoodDrink', scope: 'ROOM', icon: 'refrigerator' },
    { code: 'coffeeMaker', name: 'Coffee Maker', category: 'FoodDrink', scope: 'ROOM', icon: 'coffee' },

    // --- Wellness ---------------------------------------------------------
    { code: 'sauna', name: 'Sauna', category: 'Wellness', scope: 'HOTEL', icon: 'flame' },
    { code: 'hotTub', name: 'Hot Tub', category: 'Wellness', scope: 'BOTH', icon: 'bath' },
    { code: 'massage', name: 'Massage', category: 'Wellness', scope: 'HOTEL', icon: 'hand' },

    // --- Parking ----------------------------------------------------------
    { code: 'freeParking', name: 'Free Parking', category: 'Parking', scope: 'HOTEL', icon: 'circle-parking' },
    { code: 'valetParking', name: 'Valet Parking', category: 'Parking', scope: 'HOTEL', icon: 'car-front' },
    { code: 'evCharging', name: 'EV Charging', category: 'Parking', scope: 'HOTEL', icon: 'plug-zap' },

    // --- Business ---------------------------------------------------------
    { code: 'meetingRooms', name: 'Meeting Rooms', category: 'Business', scope: 'HOTEL', icon: 'presentation' },
    { code: 'businessCentre', name: 'Business Centre', category: 'Business', scope: 'HOTEL', icon: 'building-2' },
    { code: 'workspace', name: 'Desk / Workspace', category: 'Business', scope: 'ROOM', icon: 'laptop' },

    // --- Family -----------------------------------------------------------
    { code: 'kidsClub', name: 'Kids Club', category: 'Family', scope: 'HOTEL', icon: 'baby' },
    { code: 'playground', name: 'Playground', category: 'Family', scope: 'HOTEL', icon: 'toy-brick' },
    { code: 'crib', name: 'Cribs Available', category: 'Family', scope: 'ROOM', icon: 'bed-single' },

    // --- Ski. Bakuriani and Gudauri are why this category exists. ---------
    { code: 'skiStorage', name: 'Ski Storage', category: 'Ski', scope: 'HOTEL', icon: 'package' },
    { code: 'skiInSkiOut', name: 'Ski-in / Ski-out', category: 'Ski', scope: 'HOTEL', icon: 'mountain-snow' },
    { code: 'skiSchool', name: 'Ski School', category: 'Ski', scope: 'HOTEL', icon: 'graduation-cap' },
    { code: 'skiRental', name: 'Equipment Rental', category: 'Ski', scope: 'HOTEL', icon: 'shopping-bag' },
    { code: 'skiShuttle', name: 'Ski Lift Shuttle', category: 'Ski', scope: 'HOTEL', icon: 'bus' },

    // --- Accessibility ----------------------------------------------------
    { code: 'wheelchairAccessible', name: 'Wheelchair Accessible', category: 'Accessibility', scope: 'BOTH', icon: 'accessibility' },
    { code: 'accessibleBathroom', name: 'Accessible Bathroom', category: 'Accessibility', scope: 'ROOM', icon: 'shower-head' },
    { code: 'stepFreeAccess', name: 'Step-free Access', category: 'Accessibility', scope: 'HOTEL', icon: 'door-open' },

    // --- Transportation ---------------------------------------------------
    { code: 'carRental', name: 'Car Rental', category: 'Transportation', scope: 'HOTEL', icon: 'key' },
    { code: 'bicycleRental', name: 'Bicycle Rental', category: 'Transportation', scope: 'HOTEL', icon: 'bike' },
    { code: 'transferService', name: 'Transfer Service', category: 'Transportation', scope: 'HOTEL', icon: 'route' }
].map((amenity, index) => ({ ...amenity, sortOrder: index }));

export const AMENITY_CODES = AMENITIES.map(({ code }) => code);
