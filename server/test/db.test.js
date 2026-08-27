import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';

import { prisma, disconnect } from '../db/index.js';

// Integration tests need the Docker database; skip rather than fail when it
// is not running so `npm test` still works offline.
const dbAvailable = await prisma
    .$queryRaw`SELECT 1`.then(() => true)
    .catch(() => false);

const slug = (name) => `test-${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const destinationInput = (s) => ({
    slug: s,
    name: 'Test Destination',
    type: 'RESORT',
    path: `/test/${s}`,
    countryCode: 'GE',
    latitude: 41.7497,
    longitude: 43.5322,
    timezone: 'Asia/Tbilisi',
    tagline: 'A tagline',
    summary: 'A summary',
    description: ['First paragraph', 'Second paragraph'],
    heroImage: '/hero.jpg',
    coverImage: '/cover.jpg',
    gallery: [{ src: '/1.jpg', alt: 'One' }],
    idealFor: ['couples'],
    attractions: [{ name: 'Old Town', description: 'Cobbled streets' }],
    travelInfo: {
        bestTime: 'May to October',
        gettingThere: 'Fly to TBS',
        gettingAround: 'Metro and taxis',
        language: 'Georgian'
    },
    featured: true
});

const hotelInput = (s, destinationId) => ({
    slug: s,
    name: 'Test Hotel',
    propertyType: 'Boutique',
    status: 'ACTIVE',
    destinationId,
    countryCode: 'GE',
    address: '1 Test Street',
    latitude: 41.75,
    longitude: 43.53,
    timezone: 'Asia/Tbilisi',
    currency: 'GEL',
    starRating: 4,
    guestScore: 8.6,
    summary: 'A summary',
    shortDescription: 'Short',
    description: ['Paragraph'],
    categoryScores: [{ label: 'Cleanliness', score: 9.1 }],
    policies: {
        checkIn: '14:00',
        checkOut: '12:00',
        cancellation: 'Free until 24h before',
        children: 'Welcome',
        pets: 'Not allowed',
        payment: 'Card',
        rules: ['No smoking']
    },
    nearby: [{ name: 'Freedom Square', type: 'Landmark', distance: '400 m' }],
    priceFromCents: 18950,
    priceFromCurrency: 'GEL'
});

const fileAssetInput = (name) => ({
    objectKey: `test/${name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    bucket: 'iag-public',
    originalFilename: `${name}.jpg`,
    mimeType: 'image/jpeg',
    sizeBytes: 1024,
    checksumSha256: 'a'.repeat(64),
    category: 'HOTEL_IMAGE',
    visibility: 'PUBLIC',
    status: 'READY'
});

describe('database integration', { skip: dbAvailable ? false : 'Postgres is not reachable' }, () => {
    // Destination -> Hotel is Restrict now, so cleanup has to run child-first
    // rather than leaning on a cascade the way the prototype schema did.
    const created = { hotels: [], destinations: [], files: [] };

    after(async () => {
        if (dbAvailable) {
            await prisma.hotel.deleteMany({ where: { id: { in: created.hotels } } });
            await prisma.destination.deleteMany({ where: { id: { in: created.destinations } } });
            await prisma.fileAsset.deleteMany({ where: { id: { in: created.files } } });
        }
        await disconnect();
    });

    const makeDestination = async (name = 'dest') => {
        const destination = await prisma.destination.create({ data: destinationInput(slug(name)) });
        created.destinations.push(destination.id);
        return destination;
    };

    const makeHotel = async (destinationId, name = 'hotel') => {
        const hotel = await prisma.hotel.create({ data: hotelInput(slug(name), destinationId) });
        created.hotels.push(hotel.id);
        return hotel;
    };

    const makeFile = async (name = 'img') => {
        const file = await prisma.fileAsset.create({ data: fileAssetInput(name) });
        created.files.push(file.id);
        return file;
    };

    it('round-trips scalar lists, enums and json value objects', async () => {
        const destination = await makeDestination('roundtrip');
        const found = await prisma.destination.findUnique({ where: { id: destination.id } });

        assert.deepEqual(found.description, ['First paragraph', 'Second paragraph']);
        assert.deepEqual(found.gallery, [{ src: '/1.jpg', alt: 'One' }]);
        assert.equal(found.travelInfo.bestTime, 'May to October');
        assert.equal(found.type, 'RESORT');
        assert.ok(found.createdAt instanceof Date);
    });

    // The point is derived by a trigger rather than written by the application,
    // so it cannot drift from the columns it comes from. Prisma cannot read a
    // PostGIS type, which is exactly why every geographic query is raw SQL.
    it('derives a geography point from latitude and longitude', async () => {
        const destination = await makeDestination('geo');

        const [row] = await prisma.$queryRaw`
            SELECT ST_AsText(geo::geometry) AS point FROM destinations WHERE id = ${destination.id}
        `;

        // PostGIS orders a point x-then-y, which is longitude before latitude.
        assert.equal(row.point, 'POINT(43.5322 41.7497)');
    });

    it('recomputes the point when the coordinates move, and clears it when they are removed', async () => {
        const destination = await makeDestination('geomove');

        await prisma.destination.update({
            where: { id: destination.id },
            data: { latitude: 41.6938, longitude: 44.8015 }
        });

        const [moved] = await prisma.$queryRaw`
            SELECT ST_AsText(geo::geometry) AS point FROM destinations WHERE id = ${destination.id}
        `;
        assert.equal(moved.point, 'POINT(44.8015 41.6938)');

        await prisma.destination.update({
            where: { id: destination.id },
            data: { latitude: null, longitude: null }
        });

        const [cleared] = await prisma.$queryRaw`
            SELECT geo IS NULL AS empty FROM destinations WHERE id = ${destination.id}
        `;
        assert.equal(cleared.empty, true);
    });

    it('rejects coordinates outside the real world', async () => {
        const destination = destinationInput(slug('badcoords'));
        // Longitude and latitude transposed: 4326 is the SRID, not a place.
        destination.longitude = 4326;

        await assert.rejects(
            () => prisma.destination.create({ data: destination }),
            (err) => /coordinates_valid/.test(err.message)
        );
    });

    // Restrict, not Cascade: a destination is shared by hotels, tours and
    // transfers, and deleting one must not silently take inventory with it.
    it('refuses to delete a destination that still has hotels', async () => {
        const destination = await makeDestination('restrict');
        const hotel = await makeHotel(destination.id);

        await assert.rejects(
            () => prisma.destination.delete({ where: { id: destination.id } }),
            (err) => err.code === 'P2003' || /foreign key/i.test(err.message)
        );

        assert.equal(await prisma.hotel.count({ where: { id: hotel.id } }), 1);
    });

    it('cascades a hotel delete through its reviews, amenities, images and translations', async () => {
        const destination = await makeDestination('cascade');
        const file = await makeFile();

        const amenity = await prisma.amenity.create({
            data: { code: slug('wifi'), name: 'Wi-Fi', category: 'General', scope: 'BOTH' }
        });

        const hotel = await prisma.hotel.create({
            data: {
                ...hotelInput(slug('cascadehotel'), destination.id),
                reviews: {
                    create: [
                        {
                            author: 'Nino',
                            country: 'Georgia',
                            date: new Date('2026-05-01'),
                            score: 9.2,
                            title: 'Lovely',
                            body: 'Great stay',
                            tripType: 'Couple'
                        }
                    ]
                },
                amenities: { create: [{ amenityId: amenity.id, note: 'Free in all rooms' }] },
                images: { create: [{ fileAssetId: file.id, category: 'Lobby', isCover: true }] },
                translations: { create: [{ locale: 'ka', name: 'სატესტო სასტუმრო' }] }
            },
            include: { reviews: true, amenities: true, images: true, translations: true }
        });
        created.hotels.push(hotel.id);

        assert.equal(hotel.reviews.length, 1);
        assert.equal(hotel.amenities.length, 1);
        assert.equal(hotel.images.length, 1);
        assert.equal(hotel.translations.length, 1);

        await prisma.hotel.delete({ where: { id: hotel.id } });

        assert.equal(await prisma.review.count({ where: { hotelId: hotel.id } }), 0);
        assert.equal(await prisma.hotelAmenity.count({ where: { hotelId: hotel.id } }), 0);
        assert.equal(await prisma.hotelImage.count({ where: { hotelId: hotel.id } }), 0);
        assert.equal(await prisma.hotelTranslation.count({ where: { hotelId: hotel.id } }), 0);

        // The join row goes; the asset and the amenity are shared and stay.
        assert.equal(await prisma.fileAsset.count({ where: { id: file.id } }), 1);
        assert.equal(await prisma.amenity.count({ where: { id: amenity.id } }), 1);

        await prisma.amenity.delete({ where: { id: amenity.id } });
    });

    // Enforced by a partial unique index rather than in the service, because
    // two concurrent "make this the cover" requests would both pass a check
    // that only read the current rows.
    it('allows only one cover image per hotel', async () => {
        const destination = await makeDestination('cover');
        const hotel = await makeHotel(destination.id, 'coverhotel');
        const [first, second] = [await makeFile('cover1'), await makeFile('cover2')];

        await prisma.hotelImage.create({ data: { hotelId: hotel.id, fileAssetId: first.id, isCover: true } });

        await assert.rejects(
            () =>
                prisma.hotelImage.create({
                    data: { hotelId: hotel.id, fileAssetId: second.id, isCover: true }
                }),
            (err) => err.code === 'P2002' || /one_cover_per_hotel/.test(err.message)
        );

        // A second non-cover image is fine; only the cover flag is exclusive.
        await prisma.hotelImage.create({ data: { hotelId: hotel.id, fileAssetId: second.id, sortOrder: 1 } });
        assert.equal(await prisma.hotelImage.count({ where: { hotelId: hotel.id } }), 2);
    });

    // A hotel is built over eleven wizard steps, so the column has to accept a
    // half-written policies object. Completeness is a publishing rule, checked
    // by completeHotelPoliciesSchema, not a storage rule.
    it('accepts a partially filled policies object on a draft hotel', async () => {
        const destination = await makeDestination('draft');
        const hotel = await prisma.hotel.create({
            data: {
                slug: slug('drafthotel'),
                name: 'Half Filled',
                propertyType: 'Hotel',
                destinationId: destination.id,
                countryCode: 'GE',
                starRating: 3,
                policies: { checkIn: '15:00' }
            }
        });
        created.hotels.push(hotel.id);

        assert.equal(hotel.status, 'DRAFT');
        assert.deepEqual(hotel.policies, { checkIn: '15:00' });
    });

    it('still rejects a policies object of the wrong shape', async () => {
        const destination = await makeDestination('badpolicy');

        await assert.rejects(
            () =>
                prisma.hotel.create({
                    data: {
                        slug: slug('badpolicyhotel'),
                        name: 'Bad',
                        propertyType: 'Hotel',
                        destinationId: destination.id,
                        countryCode: 'GE',
                        starRating: 3,
                        // rules is a list of strings, not a string.
                        policies: { rules: 'No smoking' }
                    }
                }),
            (err) => {
                assert.equal(err.status, 400);
                assert.match(err.message, /Hotel\.policies/);
                return true;
            }
        );
    });

    it('rejects a malformed json value object on create', async () => {
        const s = slug('badjson');
        const data = destinationInput(s);
        delete data.travelInfo.language;

        await assert.rejects(() => prisma.destination.create({ data }), (err) => {
            assert.equal(err.status, 400);
            assert.match(err.message, /Destination\.travelInfo/);
            return true;
        });

        assert.equal(await prisma.destination.count({ where: { slug: s } }), 0);
    });

    it('rejects a malformed json value object on update', async () => {
        const destination = await makeDestination('badupdate');

        await assert.rejects(
            () =>
                prisma.destination.update({
                    where: { id: destination.id },
                    data: { gallery: [{ src: '/x.jpg' }] }
                }),
            (err) => err.status === 400
        );
    });

    it('reports a duplicate slug with the Prisma code the error handler maps to 409', async () => {
        const destination = await makeDestination('duplicate');

        await assert.rejects(
            () => prisma.destination.create({ data: destinationInput(destination.slug) }),
            (err) => err.code === 'P2002'
        );
    });

    it('uses snake_case tables and columns in Postgres', async () => {
        const columns = await prisma.$queryRaw`
            SELECT table_name, column_name FROM information_schema.columns
            WHERE (table_name = 'hotels' AND column_name IN ('price_from_cents', 'destination_id', 'supplier_id', 'guest_score', 'short_description', 'created_at'))
               OR (table_name = 'file_assets' AND column_name IN ('object_key', 'original_filename', 'checksum_sha256'))
               OR (table_name = 'hotel_amenities' AND column_name IN ('hotel_id', 'amenity_id'))
        `;

        assert.equal(columns.length, 11);
    });
});
