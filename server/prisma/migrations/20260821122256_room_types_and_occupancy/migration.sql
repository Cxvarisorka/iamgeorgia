-- CreateEnum
CREATE TYPE "room_type_status" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "bed_type_code" AS ENUM ('SINGLE', 'TWIN', 'DOUBLE', 'QUEEN', 'KING', 'SOFA', 'BUNK', 'FUTON');

-- CreateEnum
CREATE TYPE "bathroom_type" AS ENUM ('PRIVATE', 'ENSUITE', 'SHARED');

-- CreateEnum
CREATE TYPE "child_charge_mode" AS ENUM ('FREE', 'PERCENT_OF_ADULT', 'FIXED_PER_NIGHT', 'FULL_ADULT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'ROOM_TYPE_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'ROOM_TYPE_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'ROOM_TYPE_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'CHILD_POLICY_UPDATED';

-- DropIndex
DROP INDEX "destinations_geo_idx";

-- DropIndex
DROP INDEX "hotels_geo_idx";

-- CreateTable
CREATE TABLE "room_types" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "room_type_status" NOT NULL DEFAULT 'ACTIVE',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "room_size_sqm" INTEGER,
    "max_occupancy" INTEGER NOT NULL,
    "max_adults" INTEGER NOT NULL,
    "max_children" INTEGER NOT NULL DEFAULT 0,
    "min_adults" INTEGER NOT NULL DEFAULT 1,
    "standard_occupancy" INTEGER NOT NULL DEFAULT 2,
    "extra_bed_capacity" INTEGER NOT NULL DEFAULT 0,
    "bathroom_type" "bathroom_type" NOT NULL DEFAULT 'PRIVATE',
    "smoking_allowed" BOOLEAN NOT NULL DEFAULT false,
    "accessible" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bed_types" (
    "id" TEXT NOT NULL,
    "code" "bed_type_code" NOT NULL,
    "name" TEXT NOT NULL,
    "sleeps" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bed_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_beds" (
    "id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "bed_type_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "group_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_amenities" (
    "room_type_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_type_amenities_pkey" PRIMARY KEY ("room_type_id","amenity_id")
);

-- CreateTable
CREATE TABLE "room_type_images" (
    "id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_type_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_type_translations" (
    "id" TEXT NOT NULL,
    "room_type_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_type_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_policies" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "infant_max_age" INTEGER NOT NULL DEFAULT 2,
    "child_max_age" INTEGER NOT NULL DEFAULT 11,
    "children_count_toward_occupancy" BOOLEAN NOT NULL DEFAULT false,
    "max_children_free_per_room" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "child_policy_bands" (
    "id" TEXT NOT NULL,
    "child_policy_id" TEXT NOT NULL,
    "min_age" INTEGER NOT NULL,
    "max_age" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "charge_mode" "child_charge_mode" NOT NULL DEFAULT 'FREE',
    "charge_value" INTEGER NOT NULL DEFAULT 0,
    "requires_extra_bed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "child_policy_bands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_types_hotel_id_status_idx" ON "room_types"("hotel_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "room_types_hotel_id_code_key" ON "room_types"("hotel_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "bed_types_code_key" ON "bed_types"("code");

-- CreateIndex
CREATE INDEX "room_beds_bed_type_id_idx" ON "room_beds"("bed_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_beds_room_type_id_group_index_bed_type_id_key" ON "room_beds"("room_type_id", "group_index", "bed_type_id");

-- CreateIndex
CREATE INDEX "room_type_amenities_amenity_id_idx" ON "room_type_amenities"("amenity_id");

-- CreateIndex
CREATE INDEX "room_type_images_room_type_id_sort_order_idx" ON "room_type_images"("room_type_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "room_type_images_room_type_id_file_asset_id_key" ON "room_type_images"("room_type_id", "file_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "room_type_translations_room_type_id_locale_key" ON "room_type_translations"("room_type_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "child_policies_hotel_id_key" ON "child_policies"("hotel_id");

-- CreateIndex
CREATE UNIQUE INDEX "child_policy_bands_child_policy_id_min_age_key" ON "child_policy_bands"("child_policy_id", "min_age");

-- AddForeignKey
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_beds" ADD CONSTRAINT "room_beds_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_beds" ADD CONSTRAINT "room_beds_bed_type_id_fkey" FOREIGN KEY ("bed_type_id") REFERENCES "bed_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_amenities" ADD CONSTRAINT "room_type_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_images" ADD CONSTRAINT "room_type_images_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_images" ADD CONSTRAINT "room_type_images_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_type_translations" ADD CONSTRAINT "room_type_translations_room_type_id_fkey" FOREIGN KEY ("room_type_id") REFERENCES "room_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_policies" ADD CONSTRAINT "child_policies_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "child_policy_bands" ADD CONSTRAINT "child_policy_bands_child_policy_id_fkey" FOREIGN KEY ("child_policy_id") REFERENCES "child_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written additions.
-- ---------------------------------------------------------------------------

-- One cover per room type, for the same reason as hotel_images: a check that
-- only reads the current rows would let two concurrent "make this the cover"
-- requests both succeed.
CREATE UNIQUE INDEX "room_type_images_one_cover_per_room_type"
    ON "room_type_images" ("room_type_id") WHERE "is_cover";

-- Occupancy invariants.
--
-- These are the numbers the whole booking path reasons about, and a room type
-- that claims to sleep two adults but only two people in total — or four
-- children in a room with a maximum of three — produces a search result that
-- cannot be booked. Better to refuse the write.
--
-- Note that max_occupancy is deliberately NOT max_adults + max_children: a room
-- may allow 2 adults and 2 children but only 3 guests. Each is bounded by the
-- total independently, which is what preserves that.
ALTER TABLE "room_types" ADD CONSTRAINT "room_types_occupancy_coherent" CHECK (
    max_occupancy >= 1
    AND max_adults BETWEEN 1 AND max_occupancy
    AND max_children BETWEEN 0 AND max_occupancy
    AND min_adults BETWEEN 0 AND max_adults
    AND standard_occupancy BETWEEN 1 AND max_occupancy
    AND extra_bed_capacity >= 0
);

ALTER TABLE "room_types" ADD CONSTRAINT "room_types_size_positive"
    CHECK (room_size_sqm IS NULL OR room_size_sqm > 0);

ALTER TABLE "room_beds" ADD CONSTRAINT "room_beds_quantity_positive"
    CHECK (quantity >= 1 AND group_index >= 0);

ALTER TABLE "bed_types" ADD CONSTRAINT "bed_types_sleeps_positive"
    CHECK (sleeps >= 1);

-- An infant band that reaches past the child band, or a band that ends before
-- it begins, would make age resolution ambiguous at exactly the moment it
-- matters: quoting a family.
ALTER TABLE "child_policies" ADD CONSTRAINT "child_policies_ages_ordered" CHECK (
    infant_max_age >= 0 AND child_max_age > infant_max_age
);

ALTER TABLE "child_policy_bands" ADD CONSTRAINT "child_policy_bands_range_valid" CHECK (
    min_age >= 0 AND max_age >= min_age AND charge_value >= 0
);
