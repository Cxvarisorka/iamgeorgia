import { addDays, toDateOnly, zonedTimeToInstant } from '../../lib/time.js';
import { isRestDay, restWindowAt, restWindowsBetween } from '../../lib/kosher/shabbat.js';
import { SERVICE_LEVEL_ORDER, deriveKosher, kosherFeaturesOf, kosherInclude } from '../hotel/kosher.service.js';

/**
 * Is this package kosher enough to sell?
 *
 * One rule set, two inputs. At template save the fixed hotels are checked
 * against the profile as things stand today; at quote and at confirmation
 * the *resolved* offers are checked against the actual stay dates — a
 * certificate that lapses mid-stay, a transfer that arrives during Shabbat,
 * a tour on a Saturday. Blockers stop the sale; warnings travel with the
 * quote and are frozen into the order so the voucher can repeat them.
 *
 * Nothing here decides what "certified" means. That is `deriveKosher`, the
 * same derivation the hotel pages use, so a package can never call a hotel
 * certified that its own page would not.
 */

const EXPIRY_WARNING_DAYS = 30;

const levelIndex = (level) => SERVICE_LEVEL_ORDER.indexOf(level);

/** The hotel-side rules for one slot: the profile, with the slot's overrides. */
const rulesFor = (profile, component) => ({
    minServiceLevel: component?.kosherMinServiceLevel ?? profile.minServiceLevel,
    certifiedRequired: component?.kosherCertifiedRequired ?? profile.certifiedRequired,
    certificationScopes:
        component?.kosherCertificationScopes?.length > 0 ? component.kosherCertificationScopes : profile.certificationScopes,
    requireCertValidThroughStay: profile.requireCertValidThroughStay,
    requiredMealPlanCodes: profile.requiredMealPlanCodes ?? [],
    hotelRequestCodes: profile.hotelRequestCodes ?? []
});

/** The include a hotel needs before it can be judged. */
export const kosherHotelInclude = {
    kosher: { include: kosherInclude },
    amenities: { include: { amenity: { select: { code: true, category: true } } } }
};

/**
 * Judges one hotel against the rules, with or without stay dates.
 *
 * Returns blockers and warnings for this slot. Without dates the certificate
 * only has to be live today; with them it has to outlast the stay when the
 * profile says so.
 */
export const judgeHotel = (hotel, rules, { slotIndex, label, today, checkIn, checkOut, mealPlanCode } = {}) => {
    const blockers = [];
    const warnings = [];
    const block = (code, message, extra = {}) => blockers.push({ slotIndex, label, code, message, ...extra });
    const warn = (code, message, extra = {}) => warnings.push({ slotIndex, label, code, message, ...extra });

    const kosher = deriveKosher(hotel.kosher, today);

    if (!kosher || !kosher.offersKosher) {
        block('NOT_KOSHER', `${hotel.name} offers no kosher services`);

        return { blockers, warnings };
    }

    if (levelIndex(kosher.serviceLevel) < levelIndex(rules.minServiceLevel)) {
        block('SERVICE_LEVEL', `${hotel.name} is ${kosher.serviceLevel}; the package needs ${rules.minServiceLevel}`, {
            serviceLevel: kosher.serviceLevel,
            required: rules.minServiceLevel
        });
    }

    if (rules.certifiedRequired) {
        if (!kosher.certified) {
            block('NOT_CERTIFIED', `${hotel.name} has no live kosher certificate for the property`, { state: kosher.state });
        } else if (!rules.certificationScopes.some((scope) => kosher.certifiedScopes.includes(scope))) {
            block('CERTIFICATION_SCOPE', `${hotel.name}'s certificate covers ${kosher.certifiedScopes.join(', ')}, not ${rules.certificationScopes.join(' or ')}`, {
                scopes: kosher.certifiedScopes,
                required: rules.certificationScopes
            });
        } else {
            const expiresOn = kosher.headline?.expiresOn ? toDateOnly(kosher.headline.expiresOn) : null;

            if (expiresOn && checkOut) {
                if (rules.requireCertValidThroughStay && expiresOn < checkOut) {
                    block('CERTIFICATE_EXPIRES_MID_STAY', `${hotel.name}'s certificate expires on ${expiresOn}, before the stay ends`, { expiresOn });
                } else if (expiresOn < addDays(checkOut, EXPIRY_WARNING_DAYS)) {
                    warn('CERTIFICATE_EXPIRING', `${hotel.name}'s certificate is valid until ${expiresOn}`, { expiresOn });
                }
            } else if (expiresOn && kosher.expiresInDays !== null && kosher.expiresInDays <= 60) {
                warn('CERTIFICATE_EXPIRING', `${hotel.name}'s certificate is valid until ${expiresOn}`, { expiresOn });
            }
        }
    }

    if (mealPlanCode && rules.requiredMealPlanCodes.length > 0 && !rules.requiredMealPlanCodes.includes(mealPlanCode)) {
        block('MEAL_PLAN', `The rate is ${mealPlanCode}; the package needs ${rules.requiredMealPlanCodes.join(' or ')}`, {
            mealPlanCode,
            required: rules.requiredMealPlanCodes
        });
    }

    // Request codes the property cannot honour are a warning, not a blocker:
    // the booking service refuses them at confirmation with a 422 naming them,
    // and an admin should hear about it before that.
    const features = new Set([...kosherFeaturesOf(hotel), 'kosherMealOnRequest']);
    const unsupported = rules.hotelRequestCodes.filter((code) => !features.has(code));

    if (unsupported.length > 0) {
        warn('REQUEST_UNSUPPORTED', `${hotel.name} does not offer: ${unsupported.join(', ')}`, { unsupported });
    }

    void checkIn;

    return { blockers, warnings };
};

/**
 * Template save: every fixed hotel slot, as things stand today. Slots with
 * no fixed hotel are judged at quote time, when there is a hotel to judge.
 */
export const validateKosherTemplate = async (client, pkg, profile, { today }) => {
    const blockers = [];
    const warnings = [];

    for (const component of pkg.components ?? []) {
        if (component.componentType !== 'HOTEL_STAY' || !component.hotelId) {
            continue;
        }

        const hotel = await client.hotel.findUnique({ where: { id: component.hotelId }, include: kosherHotelInclude });

        if (!hotel) {
            continue;
        }

        const verdict = judgeHotel(hotel, rulesFor(profile, component), {
            slotIndex: component.slotIndex,
            label: component.label,
            today
        });

        blockers.push(...verdict.blockers);
        warnings.push(...verdict.warnings);
    }

    return { blockers, warnings };
};

/**
 * Quote and confirmation: the resolved components against the real dates.
 *
 * `resolved` carries, per slot, what the quote engine returned: a hotel (with
 * kosher data), a rate plan's meal code and the stay; a transfer's pick-up
 * instants; a tour's date and its kosher profile. Shabbat windows are
 * computed once for the whole trip at the first hotel's coordinates, or the
 * destination's when no hotel is placed.
 */
export const validateKosherQuote = (pkg, profile, resolved, { today, startDate, endDate }) => {
    const blockers = [];
    const warnings = [];
    const timezone = pkg.timezone ?? 'Asia/Tbilisi';

    const anchor =
        resolved.find((slot) => slot.componentType === 'HOTEL_STAY' && slot.hotel?.latitude != null)?.hotel ??
        pkg.destination ??
        null;
    const coords = anchor && anchor.latitude != null ? { lat: anchor.latitude, lng: anchor.longitude } : null;
    const windows = restWindowsBetween(startDate, endDate, timezone, coords, profile);

    for (const slot of resolved) {
        const component = slot.component;

        if (slot.componentType === 'HOTEL_STAY' && slot.hotel) {
            const verdict = judgeHotel(slot.hotel, rulesFor(profile, component), {
                slotIndex: component.slotIndex,
                label: component.label,
                today,
                checkIn: slot.checkIn,
                checkOut: slot.checkOut,
                mealPlanCode: slot.ratePlan?.mealPlanCode ?? null
            });

            blockers.push(...verdict.blockers);
            warnings.push(...verdict.warnings);

            const arrival = zonedTimeToInstant(slot.checkIn, slot.hotel.checkInFrom ?? '14:00', slot.hotel.timezone ?? timezone);
            const window = restWindowAt(arrival, windows);

            if (window) {
                warnings.push({
                    slotIndex: component.slotIndex,
                    label: component.label,
                    code: 'ARRIVAL_IN_SHABBAT',
                    message: `Check-in on ${slot.checkIn} falls during ${window.label}; confirm manual keys with the property`
                });
            }
        }

        if (slot.componentType === 'TRANSFER' && profile.noTransfersInShabbat) {
            for (const leg of slot.legs ?? []) {
                const window = restWindowAt(leg.pickupAt, windows);

                if (window) {
                    blockers.push({
                        slotIndex: component.slotIndex,
                        label: component.label,
                        code: 'TRANSFER_IN_SHABBAT',
                        message: `The ${leg.direction === 'RETURN' ? 'return' : 'outbound'} pick-up falls during ${window.label}`,
                        pickupAt: leg.pickupAt
                    });
                }
            }
        }

        if (slot.componentType === 'TOUR' && profile.noToursOnShabbat) {
            const operates = slot.tourKosher?.operatesOnShabbat ?? false;

            for (let date = slot.date; date <= (slot.endDate ?? slot.date); date = addDays(date, 1)) {
                if (isRestDay(date, windows, profile) && !operates) {
                    blockers.push({
                        slotIndex: component.slotIndex,
                        label: component.label,
                        code: 'TOUR_ON_REST_DAY',
                        message: `The tour runs on ${date}, a rest day`,
                        date
                    });
                    break;
                }
            }

            if (slot.tourKosher && !slot.tourKosher.kosherMealsAvailable) {
                warnings.push({
                    slotIndex: component.slotIndex,
                    label: component.label,
                    code: 'TOUR_MEALS',
                    message: 'The tour does not provide kosher meals'
                });
            }
        }
    }

    // A dated admin override turns blockers into warnings, and says so.
    const overrideUntil = pkg.kosherOverrideUntil ? toDateOnly(pkg.kosherOverrideUntil) : null;

    if (blockers.length > 0 && overrideUntil && overrideUntil >= today) {
        return {
            blockers: [],
            warnings: [
                ...warnings,
                ...blockers.map((blocker) => ({ ...blocker, code: `OVERRIDDEN_${blocker.code}`, overriddenUntil: overrideUntil }))
            ],
            overridden: true
        };
    }

    return { blockers, warnings, overridden: false };
};
