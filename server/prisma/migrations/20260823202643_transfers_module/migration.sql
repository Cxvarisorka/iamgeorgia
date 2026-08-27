-- CreateEnum
CREATE TYPE "transfer_point_kind" AS ENUM ('AIRPORT', 'CITY', 'RESORT', 'HOTEL', 'LANDMARK', 'STATION');

-- CreateEnum
CREATE TYPE "transfer_vehicle_class" AS ENUM ('ECONOMY', 'COMFORT', 'MINIVAN', 'VAN', 'GROUP', 'JEEP_4X4', 'VIP');

-- CreateEnum
CREATE TYPE "transfer_vehicle_body" AS ENUM ('sedan', 'suv', 'minivan', 'van', 'bus');

-- CreateEnum
CREATE TYPE "transfer_kind" AS ENUM ('PRIVATE', 'SHARED');

-- CreateEnum
CREATE TYPE "transfer_route_tier" AS ENUM ('TIER_1', 'TIER_2', 'TIER_3');

-- CreateEnum
CREATE TYPE "transfer_route_category" AS ENUM ('AIRPORT', 'CITY', 'RESORT', 'TOURIST_ROUTE', 'COMBINED');

-- CreateEnum
CREATE TYPE "transfer_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "transfer_booking_status" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "transfer_trip_type" AS ENUM ('ONE_WAY', 'RETURN');

-- CreateEnum
CREATE TYPE "transfer_leg_direction" AS ENUM ('OUTBOUND', 'RETURN');

-- CreateEnum
CREATE TYPE "transfer_extra_basis" AS ENUM ('FIXED', 'PER_PASSENGER', 'PER_HOUR', 'PERCENT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_POINT_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_POINT_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_POINT_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_PROVIDER_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_PROVIDER_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_VEHICLE_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_VEHICLE_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_VEHICLE_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ROUTE_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ROUTE_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ROUTE_PUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ROUTE_UNPUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ROUTE_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_ROUTE_PRICED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_EXTRA_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BLACKOUT_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BLACKOUT_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BOOKING_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BOOKING_CANCELLED';
ALTER TYPE "audit_action" ADD VALUE 'TRANSFER_BOOKING_AMENDED';

-- CreateTable
CREATE TABLE "transfer_points" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "transfer_point_kind" NOT NULL DEFAULT 'CITY',
    "iata_code" CHAR(3),
    "region_label" TEXT NOT NULL,
    "destination_id" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "geo" geography(Point, 4326),
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Tbilisi',
    "popular" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "status" "transfer_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_providers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "years_active" INTEGER NOT NULL DEFAULT 0,
    "partner_id" TEXT,
    "status" "transfer_status" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_vehicles" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "vehicle_class" "transfer_vehicle_class" NOT NULL,
    "body" "transfer_vehicle_body" NOT NULL,
    "kind" "transfer_kind" NOT NULL DEFAULT 'PRIVATE',
    "provider_id" TEXT NOT NULL,
    "max_passengers" INTEGER NOT NULL,
    "max_luggage" INTEGER NOT NULL,
    "max_cabin_bags" INTEGER NOT NULL DEFAULT 0,
    "features" TEXT[],
    "vehicle_example" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "included" TEXT[],
    "excluded" TEXT[],
    "pickup_procedure" TEXT NOT NULL,
    "cancellation_policy_id" TEXT,
    "per_km_cents" INTEGER NOT NULL,
    "minimum_fare_cents" INTEGER NOT NULL,
    "airport_fee_cents" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL DEFAULT 'GEL',
    "pace_factor" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "recommended_rank" INTEGER NOT NULL DEFAULT 0,
    "b2c_enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "transfer_status" NOT NULL DEFAULT 'DRAFT',
    "partner_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_routes" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "from_point_id" TEXT NOT NULL,
    "to_point_id" TEXT NOT NULL,
    "tier" "transfer_route_tier" NOT NULL DEFAULT 'TIER_3',
    "category" "transfer_route_category" NOT NULL DEFAULT 'CITY',
    "distance_km" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "description" TEXT[],
    "hero_image" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "status" "transfer_status" NOT NULL DEFAULT 'DRAFT',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_route_stops" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "dwell_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_route_prices" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "one_way_cents" INTEGER NOT NULL,
    "return_cents" INTEGER,
    "net_cents" INTEGER,
    "currency" CHAR(3) NOT NULL DEFAULT 'GEL',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_route_prices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_extras" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "basis" "transfer_extra_basis" NOT NULL DEFAULT 'FIXED',
    "price_cents" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'GEL',
    "applies_to_classes" "transfer_vehicle_class"[],
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_blackouts" (
    "id" TEXT NOT NULL,
    "route_id" TEXT,
    "vehicle_id" TEXT,
    "from" DATE NOT NULL,
    "to" DATE NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_blackouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_bookings" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "status" "transfer_booking_status" NOT NULL DEFAULT 'PENDING',
    "idempotency_key" TEXT,
    "partner_id" TEXT,
    "booked_by_user_id" TEXT,
    "route_id" TEXT,
    "vehicle_id" TEXT NOT NULL,
    "trip_type" "transfer_trip_type" NOT NULL DEFAULT 'ONE_WAY',
    "pickup_at" TIMESTAMP(3) NOT NULL,
    "return_pickup_at" TIMESTAMP(3),
    "adults" INTEGER NOT NULL,
    "children" INTEGER NOT NULL DEFAULT 0,
    "child_ages" INTEGER[],
    "luggage" INTEGER NOT NULL DEFAULT 0,
    "cabin_bags" INTEGER NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "net_total_cents" INTEGER NOT NULL,
    "sell_total_cents" INTEGER NOT NULL,
    "markup_bps" INTEGER NOT NULL,
    "lead_passenger_name" TEXT NOT NULL,
    "lead_passenger_email" TEXT NOT NULL,
    "lead_passenger_phone" TEXT,
    "flight_number" TEXT,
    "pickup_address" TEXT,
    "dropoff_address" TEXT,
    "special_requests" TEXT,
    "route_snapshot" JSONB NOT NULL,
    "vehicle_snapshot" JSONB NOT NULL,
    "cancellation_schedule" JSONB NOT NULL,
    "confirmed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancellation_charge_cents" INTEGER,
    "cancellation_reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_booking_legs" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "leg_index" INTEGER NOT NULL,
    "direction" "transfer_leg_direction" NOT NULL DEFAULT 'OUTBOUND',
    "from_point_id" TEXT,
    "to_point_id" TEXT,
    "from_point_name" TEXT NOT NULL,
    "to_point_name" TEXT NOT NULL,
    "pickup_at" TIMESTAMP(3) NOT NULL,
    "distance_km" INTEGER NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "net_cents" INTEGER NOT NULL,
    "sell_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_booking_legs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_booking_extras" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_cents" INTEGER NOT NULL,
    "total_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transfer_booking_extras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_point_translations" (
    "id" TEXT NOT NULL,
    "point_id" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "name" TEXT,
    "region_label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_point_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_vehicle_translations" (
    "id" TEXT NOT NULL,
    "vehicle_id" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "name" TEXT,
    "vehicle_example" TEXT,
    "summary" TEXT,
    "description" TEXT[],
    "included" TEXT[],
    "excluded" TEXT[],
    "pickup_procedure" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_vehicle_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transfer_route_translations" (
    "id" TEXT NOT NULL,
    "route_id" TEXT NOT NULL,
    "locale" VARCHAR(5) NOT NULL,
    "title" TEXT,
    "summary" TEXT,
    "description" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transfer_route_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transfer_points_slug_key" ON "transfer_points"("slug");

-- CreateIndex
CREATE INDEX "transfer_points_kind_status_idx" ON "transfer_points"("kind", "status");

-- CreateIndex
CREATE INDEX "transfer_points_destination_id_idx" ON "transfer_points"("destination_id");

-- CreateIndex
CREATE INDEX "transfer_points_popular_idx" ON "transfer_points"("popular");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_providers_slug_key" ON "transfer_providers"("slug");

-- CreateIndex
CREATE INDEX "transfer_providers_partner_id_idx" ON "transfer_providers"("partner_id");

-- CreateIndex
CREATE INDEX "transfer_providers_status_idx" ON "transfer_providers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_vehicles_slug_key" ON "transfer_vehicles"("slug");

-- CreateIndex
CREATE INDEX "transfer_vehicles_status_b2c_enabled_idx" ON "transfer_vehicles"("status", "b2c_enabled");

-- CreateIndex
CREATE INDEX "transfer_vehicles_vehicle_class_idx" ON "transfer_vehicles"("vehicle_class");

-- CreateIndex
CREATE INDEX "transfer_vehicles_provider_id_idx" ON "transfer_vehicles"("provider_id");

-- CreateIndex
CREATE INDEX "transfer_vehicles_partner_id_idx" ON "transfer_vehicles"("partner_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_routes_slug_key" ON "transfer_routes"("slug");

-- CreateIndex
CREATE INDEX "transfer_routes_tier_status_idx" ON "transfer_routes"("tier", "status");

-- CreateIndex
CREATE INDEX "transfer_routes_category_status_idx" ON "transfer_routes"("category", "status");

-- CreateIndex
CREATE INDEX "transfer_routes_featured_idx" ON "transfer_routes"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_routes_from_point_id_to_point_id_key" ON "transfer_routes"("from_point_id", "to_point_id");

-- CreateIndex
CREATE INDEX "transfer_route_stops_point_id_idx" ON "transfer_route_stops"("point_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_route_stops_route_id_position_key" ON "transfer_route_stops"("route_id", "position");

-- CreateIndex
CREATE INDEX "transfer_route_prices_vehicle_id_idx" ON "transfer_route_prices"("vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_route_prices_route_id_vehicle_id_key" ON "transfer_route_prices"("route_id", "vehicle_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_extras_code_key" ON "transfer_extras"("code");

-- CreateIndex
CREATE INDEX "transfer_extras_is_active_position_idx" ON "transfer_extras"("is_active", "position");

-- CreateIndex
CREATE INDEX "transfer_blackouts_route_id_from_to_idx" ON "transfer_blackouts"("route_id", "from", "to");

-- CreateIndex
CREATE INDEX "transfer_blackouts_vehicle_id_from_to_idx" ON "transfer_blackouts"("vehicle_id", "from", "to");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_bookings_reference_key" ON "transfer_bookings"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_bookings_idempotency_key_key" ON "transfer_bookings"("idempotency_key");

-- CreateIndex
CREATE INDEX "transfer_bookings_vehicle_id_pickup_at_idx" ON "transfer_bookings"("vehicle_id", "pickup_at");

-- CreateIndex
CREATE INDEX "transfer_bookings_route_id_pickup_at_idx" ON "transfer_bookings"("route_id", "pickup_at");

-- CreateIndex
CREATE INDEX "transfer_bookings_partner_id_created_at_idx" ON "transfer_bookings"("partner_id", "created_at");

-- CreateIndex
CREATE INDEX "transfer_bookings_status_pickup_at_idx" ON "transfer_bookings"("status", "pickup_at");

-- CreateIndex
CREATE INDEX "transfer_booking_legs_from_point_id_idx" ON "transfer_booking_legs"("from_point_id");

-- CreateIndex
CREATE INDEX "transfer_booking_legs_to_point_id_idx" ON "transfer_booking_legs"("to_point_id");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_booking_legs_booking_id_leg_index_key" ON "transfer_booking_legs"("booking_id", "leg_index");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_booking_extras_booking_id_code_key" ON "transfer_booking_extras"("booking_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_point_translations_point_id_locale_key" ON "transfer_point_translations"("point_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_vehicle_translations_vehicle_id_locale_key" ON "transfer_vehicle_translations"("vehicle_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "transfer_route_translations_route_id_locale_key" ON "transfer_route_translations"("route_id", "locale");

-- AddForeignKey
ALTER TABLE "transfer_points" ADD CONSTRAINT "transfer_points_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_providers" ADD CONSTRAINT "transfer_providers_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_vehicles" ADD CONSTRAINT "transfer_vehicles_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "transfer_providers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_vehicles" ADD CONSTRAINT "transfer_vehicles_cancellation_policy_id_fkey" FOREIGN KEY ("cancellation_policy_id") REFERENCES "cancellation_policies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_vehicles" ADD CONSTRAINT "transfer_vehicles_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_routes" ADD CONSTRAINT "transfer_routes_from_point_id_fkey" FOREIGN KEY ("from_point_id") REFERENCES "transfer_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_routes" ADD CONSTRAINT "transfer_routes_to_point_id_fkey" FOREIGN KEY ("to_point_id") REFERENCES "transfer_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_route_stops" ADD CONSTRAINT "transfer_route_stops_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transfer_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_route_stops" ADD CONSTRAINT "transfer_route_stops_point_id_fkey" FOREIGN KEY ("point_id") REFERENCES "transfer_points"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_route_prices" ADD CONSTRAINT "transfer_route_prices_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transfer_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_route_prices" ADD CONSTRAINT "transfer_route_prices_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "transfer_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_blackouts" ADD CONSTRAINT "transfer_blackouts_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transfer_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_blackouts" ADD CONSTRAINT "transfer_blackouts_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "transfer_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_bookings" ADD CONSTRAINT "transfer_bookings_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_bookings" ADD CONSTRAINT "transfer_bookings_booked_by_user_id_fkey" FOREIGN KEY ("booked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_bookings" ADD CONSTRAINT "transfer_bookings_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transfer_routes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_bookings" ADD CONSTRAINT "transfer_bookings_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "transfer_vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_booking_legs" ADD CONSTRAINT "transfer_booking_legs_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transfer_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_booking_legs" ADD CONSTRAINT "transfer_booking_legs_from_point_id_fkey" FOREIGN KEY ("from_point_id") REFERENCES "transfer_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_booking_legs" ADD CONSTRAINT "transfer_booking_legs_to_point_id_fkey" FOREIGN KEY ("to_point_id") REFERENCES "transfer_points"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_booking_extras" ADD CONSTRAINT "transfer_booking_extras_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "transfer_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_point_translations" ADD CONSTRAINT "transfer_point_translations_point_id_fkey" FOREIGN KEY ("point_id") REFERENCES "transfer_points"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_vehicle_translations" ADD CONSTRAINT "transfer_vehicle_translations_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "transfer_vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transfer_route_translations" ADD CONSTRAINT "transfer_route_translations_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "transfer_routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written additions. Everything below is something Prisma cannot express
-- in schema.prisma, kept here rather than applied out of band so that a fresh
-- database and a migrated one end up identical.
-- ---------------------------------------------------------------------------

-- `geo` is maintained by the same trigger function destinations and hotels
-- already use, so a pick-up point cannot end up with a location that disagrees
-- with its coordinates.
CREATE TRIGGER transfer_points_set_geo
    BEFORE INSERT OR UPDATE OF latitude, longitude ON "transfer_points"
    FOR EACH ROW EXECUTE FUNCTION set_geo_from_lat_lng();

-- "Which pick-up points are within 30km of this hotel" is an index scan rather
-- than a distance calculation over every row.
CREATE INDEX "transfer_points_geo_idx" ON "transfer_points" USING GIST ("geo");

-- A point at longitude 4326 is a transposed argument. Unlike a hotel, a
-- transfer point has no meaning without a location, so the columns are NOT
-- NULL and the check is only about the range.
ALTER TABLE "transfer_points" ADD CONSTRAINT "transfer_points_coordinates_valid" CHECK (
    latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180
);

-- A blackout that names neither a route nor a vehicle closes nothing and would
-- read as a bug in the quote engine rather than as bad data.
ALTER TABLE "transfer_blackouts" ADD CONSTRAINT "transfer_blackouts_target_present" CHECK (
    route_id IS NOT NULL OR vehicle_id IS NOT NULL
);

-- Both ends are inclusive, so an inverted window would silently close nothing.
ALTER TABLE "transfer_blackouts" ADD CONSTRAINT "transfer_blackouts_range_ordered" CHECK (
    "to" >= "from"
);

-- Fares are never negative, and a minimum fare of zero would let the distance
-- engine quote a free ride on a rounding error.
ALTER TABLE "transfer_vehicles" ADD CONSTRAINT "transfer_vehicles_fare_positive" CHECK (
    per_km_cents >= 0 AND minimum_fare_cents > 0 AND airport_fee_cents >= 0
);

ALTER TABLE "transfer_vehicles" ADD CONSTRAINT "transfer_vehicles_capacity_positive" CHECK (
    max_passengers > 0 AND max_luggage >= 0 AND max_cabin_bags >= 0
);

ALTER TABLE "transfer_route_prices" ADD CONSTRAINT "transfer_route_prices_positive" CHECK (
    one_way_cents > 0 AND (return_cents IS NULL OR return_cents > 0)
);

-- A route from a point to itself is not a journey.
ALTER TABLE "transfer_routes" ADD CONSTRAINT "transfer_routes_endpoints_differ" CHECK (
    from_point_id <> to_point_id
);

-- The public booking reference sequence, drawn by lib/reference.js exactly as
-- partner_reference_seq and hotel_booking_reference_seq are.
CREATE SEQUENCE IF NOT EXISTS transfer_booking_reference_seq START 1;
