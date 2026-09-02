import { config } from '../../config.js';
import { prisma } from '../../db/index.js';
import { assignmentWindow } from '../../lib/transfer/schedule.js';
import { revalidateQuote } from './quote.service.js';
import { findConflicts } from './schedule.service.js';

/**
 * Who a partner may ask for at checkout.
 *
 * The quote token names the journey, the class and the party; this answers
 * with every driver who could take it as things stand: active and verified,
 * with a car that is on the road, sold as the booked class, big enough for
 * the party, and — driver and car both — free across every leg's occupancy
 * window. Nothing here is a promise. The same checks run again inside the
 * booking transaction, under the driver's row lock, and a driver who was
 * taken in the meantime is a 409 the partner answers by choosing again.
 *
 * Unverified drivers are simply absent: a dispatcher may knowingly override
 * that, a partner may not, and a list a partner cannot act on is noise.
 */

const imageWithVariants = { include: { variants: true } };

const dispatch = () => config.transfer.dispatch;

const fits = (car, { passengers, luggage }) => car.passengerCapacity >= passengers && car.luggageCapacity >= luggage;

const isFree = async (resource, windows) => {
    for (const window of windows) {
        const conflicts = await findConflicts(prisma, {
            ...resource,
            windowStart: window.windowStart,
            windowEnd: window.windowEnd,
            excludeAssignmentId: null
        });

        if (conflicts.length > 0) {
            return false;
        }
    }

    return true;
};

export const availableDriversForQuote = async (token, viewer) => {
    // Not strict: a fare that moved does not change who is free, and the
    // booking call is where a moved fare is refused.
    const { vehicle, quote, decoded } = await revalidateQuote(token, viewer, { strict: false });

    const party = { passengers: decoded.adults + decoded.children, luggage: decoded.luggage };
    const windows = quote.legs.map((leg) =>
        assignmentWindow(leg, {
            preBufferMinutes: dispatch().preBufferMinutes,
            postBufferMinutes: dispatch().postBufferMinutes
        })
    );

    const carFilter = { status: 'ACTIVE', vehicleClassId: vehicle.id };

    const drivers = await prisma.transferDriver.findMany({
        where: {
            isActive: true,
            verificationStatus: 'VERIFIED',
            vehicles: { some: { fleetVehicle: carFilter } }
        },
        include: {
            photo: imageWithVariants,
            provider: { select: { id: true, name: true } },
            vehicles: {
                where: { fleetVehicle: carFilter },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                include: {
                    fleetVehicle: {
                        include: {
                            mainImage: imageWithVariants,
                            images: {
                                orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
                                include: { fileAsset: imageWithVariants }
                            }
                        }
                    }
                }
            }
        },
        orderBy: [{ ratingAvg: 'desc' }, { completedCount: 'desc' }, { lastName: 'asc' }, { firstName: 'asc' }]
    });

    const available = [];

    for (const driver of drivers) {
        if (!(await isFree({ driverId: driver.id, fleetVehicleId: null }, windows))) {
            continue;
        }

        const cars = [];

        for (const link of driver.vehicles) {
            const car = link.fleetVehicle;

            if (fits(car, party) && (await isFree({ driverId: null, fleetVehicleId: car.id }, windows))) {
                cars.push({ car, isPrimary: link.isPrimary });
            }
        }

        if (cars.length > 0) {
            available.push({ driver, cars });
        }
    }

    return { vehicle, legs: quote.legs, windows, drivers: available };
};
