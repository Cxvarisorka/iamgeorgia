import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../app.js';
import { prisma, disconnect } from '../db/index.js';
import {
    createTracker,
    databaseAvailable,
    makeAdmin,
    makeAmenity,
    makeDestination,
    makeFileAsset,
    makeHotel,
    makePartner,
    makePartnerUser,
    signIn,
    unique
} from './support/factories.js';

const app = createApp();
const dbAvailable = await databaseAvailable();

describe('room types', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    const tracker = createTracker();
    let adminCookie;
    let partnerCookie;
    let hotel;

    before(async () => {
        const admin = await makeAdmin(tracker);
        adminCookie = (await signIn(app, admin.email)).cookie;

        const partner = await makePartner(tracker);
        const partnerUser = await makePartnerUser(tracker, partner);
        partnerCookie = (await signIn(app, partnerUser.email)).cookie;

        hotel = await makeHotel(tracker, { destination: await makeDestination(tracker) });
    });

    after(async () => {
        await tracker.cleanup();
        await disconnect();
    });

    const asAdmin = (method, path) => request(app)[method](path).set('Cookie', adminCookie);
    const roomsPath = (hotelId = hotel.id) => `/api/admin/hotels/${hotelId}/room-types`;

    const createRoom = (body = {}, hotelId = hotel.id) =>
        asAdmin('post', roomsPath(hotelId)).send({
            code: unique('rt').slice(0, 40),
            name: 'Deluxe Double',
            maxOccupancy: 3,
            maxAdults: 2,
            maxChildren: 1,
            standardOccupancy: 2,
            extraBedCapacity: 1,
            ...body
        });

    describe('authorization', () => {
        it('refuses an unauthenticated caller and a partner user', async () => {
            assert.equal((await request(app).get(roomsPath())).status, 401);
            assert.equal((await request(app).get(roomsPath()).set('Cookie', partnerCookie)).status, 403);
        });

        // Scoping is the ownership check that Phase 7 will lean on: a room type
        // is only ever addressable through the hotel that owns it.
        it('will not read a room type through the wrong hotel', async () => {
            const mine = await createRoom();
            const other = await makeHotel(tracker, { destination: await makeDestination(tracker) });

            const response = await asAdmin('get', `${roomsPath(other.id)}/${mine.body.id}`);

            assert.equal(response.status, 404);
        });
    });

    describe('creating', () => {
        it('creates a room type with workable defaults', async () => {
            const response = await createRoom({ name: 'Standard Twin' });

            assert.equal(response.status, 201);
            assert.equal(response.body.status, 'ACTIVE');
            assert.equal(response.body.occupancy.max, 3);
            assert.equal(response.body.occupancy.minAdults, 1);
            assert.equal(response.body.bathroomType, 'PRIVATE');
        });

        it('keeps codes unique within a hotel but not across hotels', async () => {
            const code = unique('shared').slice(0, 40);

            assert.equal((await createRoom({ code })).status, 201);
            assert.equal((await createRoom({ code })).status, 409, 'twice in one hotel is a conflict');

            const other = await makeHotel(tracker, { destination: await makeDestination(tracker) });
            assert.equal(
                (await createRoom({ code }, other.id)).status,
                201,
                'the same supplier code in another property is fine'
            );
        });

        it('refuses occupancy numbers that contradict each other', async () => {
            const response = await createRoom({ maxOccupancy: 2, maxAdults: 4 });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /Invalid request body/);
        });

        // maxOccupancy is deliberately not maxAdults + maxChildren.
        it('allows 2 adults and 2 children in a room that sleeps only 3', async () => {
            const response = await createRoom({ maxOccupancy: 3, maxAdults: 2, maxChildren: 2 });

            assert.equal(response.status, 201, 'the caps are independent of the total');
        });
    });

    describe('updating', () => {
        // A PATCH that changes one occupancy number has to be checked against
        // the three it did not send.
        it('refuses a patch that contradicts the numbers it did not send', async () => {
            const room = await createRoom({ maxOccupancy: 4, maxAdults: 3 });

            const response = await asAdmin('patch', `${roomsPath()}/${room.body.id}`).send({ maxOccupancy: 2 });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /contradict/);

            const unchanged = await prisma.roomType.findUnique({ where: { id: room.body.id } });
            assert.equal(unchanged.maxOccupancy, 4);
        });

        it('accepts a coherent patch', async () => {
            const room = await createRoom({ maxOccupancy: 4, maxAdults: 3 });

            const response = await asAdmin('patch', `${roomsPath()}/${room.body.id}`).send({
                maxOccupancy: 3,
                maxAdults: 2
            });

            assert.equal(response.status, 200);
            assert.equal(response.body.occupancy.max, 3);
        });

        it('archives instead of deleting, and refuses to edit afterwards', async () => {
            const room = await createRoom();

            const archived = await asAdmin('post', `${roomsPath()}/${room.body.id}/archive`);
            assert.equal(archived.status, 200);
            assert.equal(archived.body.status, 'ARCHIVED');

            const edit = await asAdmin('patch', `${roomsPath()}/${room.body.id}`).send({ name: 'Renamed' });
            assert.equal(edit.status, 409);

            assert.equal(await prisma.roomType.count({ where: { id: room.body.id } }), 1);
        });
    });

    describe('bed configuration', () => {
        it('stores beds as structured rows and reports what they sleep', async () => {
            const room = await createRoom();

            const response = await asAdmin('put', `${roomsPath()}/${room.body.id}/beds`).send({
                beds: [
                    { bedTypeCode: 'KING', quantity: 1 },
                    { bedTypeCode: 'SOFA', quantity: 1 }
                ]
            });

            assert.equal(response.status, 200);
            assert.equal(response.body.bedGroups.length, 1);
            assert.equal(response.body.bedGroups[0].sleeps, 3, 'a king sleeps two, a sofa bed one');
        });

        // Groups are alternative make-ups of one room, which is what stops a
        // "double or twin" room having to be duplicated as two room types.
        it('keeps alternative make-ups apart instead of adding them up', async () => {
            const room = await createRoom();

            const response = await asAdmin('put', `${roomsPath()}/${room.body.id}/beds`).send({
                beds: [
                    { bedTypeCode: 'KING', quantity: 1, groupIndex: 0 },
                    { bedTypeCode: 'TWIN', quantity: 2, groupIndex: 1 }
                ]
            });

            assert.equal(response.body.bedGroups.length, 2);
            assert.equal(response.body.bedGroups[0].sleeps, 2);
            assert.equal(response.body.bedGroups[1].sleeps, 2);
        });

        it('replaces the configuration rather than adding to it', async () => {
            const room = await createRoom();
            const path = `${roomsPath()}/${room.body.id}/beds`;

            await asAdmin('put', path).send({ beds: [{ bedTypeCode: 'KING', quantity: 1 }] });
            const replaced = await asAdmin('put', path).send({ beds: [{ bedTypeCode: 'TWIN', quantity: 2 }] });

            assert.equal(replaced.body.bedGroups[0].beds.length, 1);
            assert.equal(replaced.body.bedGroups[0].beds[0].code, 'TWIN');
        });

        it('refuses the same bed twice in one group and points at quantity', async () => {
            const room = await createRoom();

            const response = await asAdmin('put', `${roomsPath()}/${room.body.id}/beds`).send({
                beds: [
                    { bedTypeCode: 'TWIN', quantity: 1 },
                    { bedTypeCode: 'TWIN', quantity: 1 }
                ]
            });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /quantity/);
        });

        it('refuses a bed type that does not exist', async () => {
            const room = await createRoom();

            const response = await asAdmin('put', `${roomsPath()}/${room.body.id}/beds`).send({
                beds: [{ bedTypeCode: 'HAMMOCK' }]
            });

            assert.equal(response.status, 400, 'the enum rejects it before the service is reached');
        });
    });

    describe('room amenities', () => {
        it('accepts a room-scoped amenity', async () => {
            const room = await createRoom();
            const amenity = await makeAmenity(tracker, { scope: 'ROOM' });

            const response = await asAdmin('put', `${roomsPath()}/${room.body.id}/amenities`).send({
                amenities: [{ amenityId: amenity.id, note: 'Nespresso' }]
            });

            assert.equal(response.status, 200);
            assert.equal(response.body.amenities.length, 1);
            assert.equal(response.body.amenities[0].note, 'Nespresso');
        });

        // "Airport Shuttle" is never a property of a room, and claiming it on a
        // room card would present a hotel facility as one.
        it('refuses a hotel-only amenity on a room', async () => {
            const room = await createRoom();
            const shuttle = await makeAmenity(tracker, { scope: 'HOTEL' });

            const response = await asAdmin('put', `${roomsPath()}/${room.body.id}/amenities`).send({
                amenities: [{ amenityId: shuttle.id }]
            });

            assert.equal(response.status, 409);
            assert.deepEqual(response.body.error.details.wrongScope, [shuttle.id]);
        });

        it('accepts an amenity scoped to both', async () => {
            const room = await createRoom();
            const airCon = await makeAmenity(tracker, { scope: 'BOTH' });

            const response = await asAdmin('put', `${roomsPath()}/${room.body.id}/amenities`).send({
                amenities: [{ amenityId: airCon.id }]
            });

            assert.equal(response.status, 200);
        });
    });

    describe('room images', () => {
        it('attaches an image and makes the first one the cover', async () => {
            const room = await createRoom();
            const file = await makeFileAsset(tracker);

            const response = await asAdmin('post', `${roomsPath()}/${room.body.id}/images`).send({
                fileAssetId: file.id,
                caption: 'The view'
            });

            assert.equal(response.status, 201);
            assert.equal(response.body.images.length, 1);
            assert.equal(response.body.images[0].isCover, true);
            assert.ok(response.body.coverImage);
        });

        it('refuses a private file in a room gallery', async () => {
            const room = await createRoom();
            const contract = await makeFileAsset(tracker, {
                visibility: 'PRIVATE',
                category: 'CONTRACT',
                mimeType: 'application/pdf'
            });

            const response = await asAdmin('post', `${roomsPath()}/${room.body.id}/images`).send({
                fileAssetId: contract.id
            });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /public images/);
        });
    });

    describe('the occupancy annotation', () => {
        it('says which rooms fit a party, and why the others do not', async () => {
            const family = await makeHotel(tracker, { destination: await makeDestination(tracker) });

            const fits = await createRoom(
                { name: 'Family Room', maxOccupancy: 4, maxAdults: 2, maxChildren: 2, extraBedCapacity: 2 },
                family.id
            );
            const doesNot = await createRoom(
                { name: 'Single', maxOccupancy: 1, maxAdults: 1, maxChildren: 0, standardOccupancy: 1 },
                family.id
            );

            const response = await asAdmin('get', `${roomsPath(family.id)}?adults=2&childAges=7`);

            assert.equal(response.status, 200);
            const byId = Object.fromEntries(response.body.data.map((room) => [room.id, room]));

            assert.equal(byId[fits.body.id].availability.fits, true);
            assert.equal(byId[doesNot.body.id].availability.fits, false);
            assert.ok(
                byId[doesNot.body.id].availability.reasons.some((reason) => reason.code === 'MAX_CHILDREN')
            );
        });

        it('omits the annotation entirely when the request says nothing about guests', async () => {
            const response = await asAdmin('get', roomsPath());

            assert.equal(response.status, 200);
            assert.equal(response.body.data[0].availability, undefined);
        });
    });

    describe('the child policy', () => {
        const policyPath = (hotelId = hotel.id) => `/api/admin/hotels/${hotelId}/child-policy`;

        it('is null until a hotel chooses one', async () => {
            const fresh = await makeHotel(tracker, { destination: await makeDestination(tracker) });

            const response = await asAdmin('get', policyPath(fresh.id));

            assert.equal(response.status, 200);
            assert.equal(response.body, null, 'so a client can tell a default from a choice');
        });

        it('stores a policy with its bands', async () => {
            const fresh = await makeHotel(tracker, { destination: await makeDestination(tracker) });

            const response = await asAdmin('put', policyPath(fresh.id)).send({
                infantMaxAge: 3,
                childMaxAge: 15,
                childrenCountTowardOccupancy: true,
                bands: [
                    { minAge: 0, maxAge: 3, label: 'Infant', chargeMode: 'FREE' },
                    { minAge: 4, maxAge: 15, label: 'Child', chargeMode: 'PERCENT_OF_ADULT', chargeValue: 4000 }
                ]
            });

            assert.equal(response.status, 200);
            assert.equal(response.body.childMaxAge, 15);
            assert.equal(response.body.bands.length, 2);
            assert.equal(response.body.bands[1].chargeValue, 4000);
        });

        // Both failures are silent in production and both produce wrong money.
        it('refuses bands with a gap between them', async () => {
            const response = await asAdmin('put', policyPath()).send({
                bands: [
                    { minAge: 0, maxAge: 2, label: 'Infant' },
                    { minAge: 6, maxAge: 11, label: 'Child' }
                ]
            });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /fall into no band/);
            assert.equal(response.body.error.details.gapFrom, 3);
        });

        it('refuses bands that overlap', async () => {
            const response = await asAdmin('put', policyPath()).send({
                bands: [
                    { minAge: 0, maxAge: 5, label: 'Infant' },
                    { minAge: 4, maxAge: 11, label: 'Child' }
                ]
            });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /overlap/);
        });

        it('refuses bands that do not start at zero', async () => {
            const response = await asAdmin('put', policyPath()).send({
                bands: [{ minAge: 3, maxAge: 11, label: 'Child' }]
            });

            assert.equal(response.status, 400);
            assert.match(response.body.error.message, /must start at 0/);
        });

        it('refuses a child band that does not extend past the infant band', async () => {
            const response = await asAdmin('put', policyPath()).send({ infantMaxAge: 11, childMaxAge: 5 });

            assert.equal(response.status, 400);
        });

        it('seeds sensible defaults when no bands are given', async () => {
            const fresh = await makeHotel(tracker, { destination: await makeDestination(tracker) });

            const response = await asAdmin('put', policyPath(fresh.id)).send({ childrenCountTowardOccupancy: true });

            assert.equal(response.status, 200);
            assert.equal(response.body.bands.length, 2);
            assert.equal(response.body.bands[0].label, 'Infant');
        });

        it('changes what a room can hold', async () => {
            const strict = await makeHotel(tracker, { destination: await makeDestination(tracker) });
            await createRoom(
                { name: 'Double', maxOccupancy: 2, maxAdults: 2, maxChildren: 1, extraBedCapacity: 0 },
                strict.id
            );

            // With the default policy an infant does not take a place, so a
            // couple with a baby fits.
            const lenient = await asAdmin('get', `${roomsPath(strict.id)}?adults=2&childAges=1`);
            assert.equal(lenient.body.data[0].availability.fits, true);

            await asAdmin('put', policyPath(strict.id)).send({ childrenCountTowardOccupancy: true });

            const counted = await asAdmin('get', `${roomsPath(strict.id)}?adults=2&childAges=1`);
            assert.equal(counted.body.data[0].availability.fits, false, 'now the cot takes a place');
        });
    });

    describe('publishing', () => {
        it('will not publish a hotel with nowhere to sleep', async () => {
            const bare = await makeHotel(tracker, { destination: await makeDestination(tracker), status: 'DRAFT' });

            const response = await asAdmin('post', `/api/admin/hotels/${bare.id}/publish`);

            assert.equal(response.status, 422);
            const codes = response.body.error.details.missing.map((item) => item.code);
            assert.ok(codes.includes('roomTypes'));
        });

        it('does not count an archived room type as somewhere to sleep', async () => {
            const bare = await makeHotel(tracker, { destination: await makeDestination(tracker), status: 'DRAFT' });
            const room = await createRoom({}, bare.id);
            await asAdmin('post', `${roomsPath(bare.id)}/${room.body.id}/archive`);

            const response = await asAdmin('get', `/api/admin/hotels/${bare.id}`);
            const codes = response.body.publishChecklist.map((item) => item.code);

            assert.ok(codes.includes('roomTypes'));
        });
    });
});
