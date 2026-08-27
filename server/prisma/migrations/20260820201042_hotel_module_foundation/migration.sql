/*
  Warnings:

  - You are about to drop the column `region` on the `destinations` table. All the data in the column will be lost.
  - You are about to drop the column `amenities` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `gallery` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `highlights` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the column `location` on the `hotels` table. All the data in the column will be lost.
  - You are about to drop the `rooms` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `country_code` to the `destinations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `path` to the `destinations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `country_code` to the `hotels` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "amenity_category" AS ENUM ('General', 'FoodDrink', 'Wellness', 'Parking', 'Business', 'Family', 'Ski', 'Accessibility', 'Transportation');

-- CreateEnum
CREATE TYPE "amenity_scope" AS ENUM ('HOTEL', 'ROOM', 'BOTH');

-- CreateEnum
CREATE TYPE "destination_type" AS ENUM ('COUNTRY', 'REGION', 'CITY', 'RESORT');

-- CreateEnum
CREATE TYPE "hotel_status" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "inventory_source" AS ENUM ('MANUAL', 'CHANNEL_MANAGER', 'SUPPLIER_API');

-- CreateEnum
CREATE TYPE "file_visibility" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "file_category" AS ENUM ('HOTEL_IMAGE', 'ROOM_IMAGE', 'AMENITY_ICON', 'CONTRACT', 'RATE_SHEET', 'INVOICE', 'VOUCHER', 'IMPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "image_category" AS ENUM ('Exterior', 'Lobby', 'Restaurant', 'Pool', 'Spa', 'Room', 'Bathroom', 'View', 'Facilities');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'HOTEL_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_PUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_UNPUBLISHED';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'DESTINATION_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'AMENITY_CREATED';
ALTER TYPE "audit_action" ADD VALUE 'AMENITY_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'MEDIA_UPLOADED';
ALTER TYPE "audit_action" ADD VALUE 'MEDIA_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'PRIVATE_FILE_ACCESSED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "property_type" ADD VALUE 'Apartment';
ALTER TYPE "property_type" ADD VALUE 'Chalet';
ALTER TYPE "property_type" ADD VALUE 'Hostel';
ALTER TYPE "property_type" ADD VALUE 'Villa';

-- DropForeignKey
ALTER TABLE "hotels" DROP CONSTRAINT "hotels_destination_id_fkey";

-- DropForeignKey
ALTER TABLE "rooms" DROP CONSTRAINT "rooms_hotel_id_fkey";

-- DropIndex
DROP INDEX "hotels_destination_id_idx";

-- DropIndex
DROP INDEX "hotels_featured_idx";

-- AlterTable
ALTER TABLE "destinations" DROP COLUMN "region",
ADD COLUMN     "country_code" CHAR(2) NOT NULL,
ADD COLUMN     "geo" geography(Point, 4326),
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "parent_id" TEXT,
ADD COLUMN     "path" TEXT NOT NULL,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Tbilisi',
ADD COLUMN     "type" "destination_type" NOT NULL DEFAULT 'CITY',
ALTER COLUMN "tagline" DROP NOT NULL,
ALTER COLUMN "summary" DROP NOT NULL,
ALTER COLUMN "hero_image" DROP NOT NULL,
ALTER COLUMN "cover_image" DROP NOT NULL,
ALTER COLUMN "travel_info" DROP NOT NULL;

-- AlterTable
ALTER TABLE "hotels" DROP COLUMN "amenities",
DROP COLUMN "gallery",
DROP COLUMN "highlights",
DROP COLUMN "image",
DROP COLUMN "location",
ADD COLUMN     "check_in_from" TEXT,
ADD COLUMN     "check_in_until" TEXT,
ADD COLUMN     "check_out_from" TEXT,
ADD COLUMN     "check_out_until" TEXT,
ADD COLUMN     "country_code" CHAR(2) NOT NULL,
ADD COLUMN     "currency" CHAR(3) NOT NULL DEFAULT 'GEL',
ADD COLUMN     "email" TEXT,
ADD COLUMN     "external_ref" JSONB,
ADD COLUMN     "featured_image_id" TEXT,
ADD COLUMN     "geo" geography(Point, 4326),
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "price_from_currency" CHAR(3),
ADD COLUMN     "short_description" TEXT,
ADD COLUMN     "source_type" "inventory_source" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "status" "hotel_status" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "supplier_id" TEXT,
ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Tbilisi',
ADD COLUMN     "website" TEXT,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "guest_score" SET DEFAULT 0,
ALTER COLUMN "summary" DROP NOT NULL,
ALTER COLUMN "policies" SET DEFAULT '{}',
ALTER COLUMN "price_from_cents" DROP NOT NULL;

-- DropTable
DROP TABLE "rooms";

-- DropEnum
DROP TYPE "amenity_id";

-- CreateTable
CREATE TABLE "amenities" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "amenity_category" NOT NULL,
    "scope" "amenity_scope" NOT NULL DEFAULT 'HOTEL',
    "icon" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amenities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_amenities" (
    "hotel_id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hotel_amenities_pkey" PRIMARY KEY ("hotel_id","amenity_id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "original_filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "checksum_sha256" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "category" "file_category" NOT NULL,
    "visibility" "file_visibility" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "alt_text" TEXT,
    "uploaded_by_user_id" TEXT,
    "partner_id" TEXT,
    "deleted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "image_variants" (
    "id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "object_key" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "image_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_images" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "category" "image_category" NOT NULL DEFAULT 'Exterior',
    "caption" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_documents" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "file_asset_id" TEXT NOT NULL,
    "doc_type" TEXT NOT NULL,
    "label" TEXT,
    "valid_until" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_translations" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT,
    "short_description" TEXT,
    "summary" TEXT,
    "description" TEXT[],
    "policies" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destination_translations" (
    "id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT,
    "tagline" TEXT,
    "summary" TEXT,
    "description" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destination_translations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "amenity_translations" (
    "id" TEXT NOT NULL,
    "amenity_id" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "amenity_translations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "amenities_code_key" ON "amenities"("code");

-- CreateIndex
CREATE INDEX "amenities_category_is_active_idx" ON "amenities"("category", "is_active");

-- CreateIndex
CREATE INDEX "hotel_amenities_amenity_id_idx" ON "hotel_amenities"("amenity_id");

-- CreateIndex
CREATE UNIQUE INDEX "file_assets_object_key_key" ON "file_assets"("object_key");

-- CreateIndex
CREATE INDEX "file_assets_category_visibility_idx" ON "file_assets"("category", "visibility");

-- CreateIndex
CREATE INDEX "file_assets_partner_id_idx" ON "file_assets"("partner_id");

-- CreateIndex
CREATE INDEX "file_assets_checksum_sha256_idx" ON "file_assets"("checksum_sha256");

-- CreateIndex
CREATE INDEX "file_assets_status_idx" ON "file_assets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "image_variants_object_key_key" ON "image_variants"("object_key");

-- CreateIndex
CREATE UNIQUE INDEX "image_variants_file_asset_id_variant_format_key" ON "image_variants"("file_asset_id", "variant", "format");

-- CreateIndex
CREATE INDEX "hotel_images_hotel_id_sort_order_idx" ON "hotel_images"("hotel_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_images_hotel_id_file_asset_id_key" ON "hotel_images"("hotel_id", "file_asset_id");

-- CreateIndex
CREATE INDEX "hotel_documents_hotel_id_doc_type_idx" ON "hotel_documents"("hotel_id", "doc_type");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_documents_hotel_id_file_asset_id_key" ON "hotel_documents"("hotel_id", "file_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_translations_hotel_id_locale_key" ON "hotel_translations"("hotel_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "destination_translations_destination_id_locale_key" ON "destination_translations"("destination_id", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "amenity_translations_amenity_id_locale_key" ON "amenity_translations"("amenity_id", "locale");

-- CreateIndex
CREATE INDEX "destinations_parent_id_idx" ON "destinations"("parent_id");

-- CreateIndex
CREATE INDEX "destinations_type_country_code_idx" ON "destinations"("type", "country_code");

-- CreateIndex
CREATE INDEX "destinations_path_idx" ON "destinations"("path");

-- CreateIndex
CREATE INDEX "hotels_destination_id_status_idx" ON "hotels"("destination_id", "status");

-- CreateIndex
CREATE INDEX "hotels_supplier_id_idx" ON "hotels"("supplier_id");

-- CreateIndex
CREATE INDEX "hotels_status_featured_idx" ON "hotels"("status", "featured");

-- CreateIndex
CREATE INDEX "hotels_country_code_idx" ON "hotels"("country_code");

-- AddForeignKey
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_featured_image_id_fkey" FOREIGN KEY ("featured_image_id") REFERENCES "file_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_amenities" ADD CONSTRAINT "hotel_amenities_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_amenities" ADD CONSTRAINT "hotel_amenities_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_assets" ADD CONSTRAINT "file_assets_partner_id_fkey" FOREIGN KEY ("partner_id") REFERENCES "partners"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "image_variants" ADD CONSTRAINT "image_variants_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_images" ADD CONSTRAINT "hotel_images_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_documents" ADD CONSTRAINT "hotel_documents_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_documents" ADD CONSTRAINT "hotel_documents_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "file_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_translations" ADD CONSTRAINT "hotel_translations_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destination_translations" ADD CONSTRAINT "destination_translations_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "amenity_translations" ADD CONSTRAINT "amenity_translations_amenity_id_fkey" FOREIGN KEY ("amenity_id") REFERENCES "amenities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written additions. Everything below is something Prisma cannot express
-- in schema.prisma, kept here rather than applied out of band so that a fresh
-- database and a migrated one end up identical.
-- ---------------------------------------------------------------------------

-- `geo` is derived from latitude/longitude and maintained by a trigger.
--
-- A trigger rather than a GENERATED column on purpose: Prisma models a column
-- but not its generated-ness, so a stored generated column reads as drift on
-- the next `migrate dev`, while a trigger is invisible to introspection. The
-- practical effect is the same and it keeps the point from ever disagreeing
-- with the coordinates it comes from, because nothing else may write it.
CREATE OR REPLACE FUNCTION set_geo_from_lat_lng() RETURNS trigger AS $$
BEGIN
    IF NEW.latitude IS NULL OR NEW.longitude IS NULL THEN
        NEW.geo := NULL;
    ELSE
        NEW.geo := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER destinations_set_geo
    BEFORE INSERT OR UPDATE OF latitude, longitude ON "destinations"
    FOR EACH ROW EXECUTE FUNCTION set_geo_from_lat_lng();

CREATE TRIGGER hotels_set_geo
    BEFORE INSERT OR UPDATE OF latitude, longitude ON "hotels"
    FOR EACH ROW EXECUTE FUNCTION set_geo_from_lat_lng();

-- Radius queries ("transfers near this hotel", "hotels within 5km of the
-- gondola") are index scans rather than a sequential distance calculation.
CREATE INDEX "destinations_geo_idx" ON "destinations" USING GIST ("geo");
CREATE INDEX "hotels_geo_idx" ON "hotels" USING GIST ("geo");

-- Coordinates are both-or-neither, and inside the real world. A hotel at
-- longitude 4326 is a transposed argument, and it should fail on write rather
-- than silently place the property in the Indian Ocean.
ALTER TABLE "destinations" ADD CONSTRAINT "destinations_coordinates_valid" CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

ALTER TABLE "hotels" ADD CONSTRAINT "hotels_coordinates_valid" CHECK (
    (latitude IS NULL AND longitude IS NULL)
    OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)
);

-- One cover image per hotel. Prisma cannot express a partial index, and
-- enforcing this in the service alone would let two concurrent "make this the
-- cover" requests both succeed.
CREATE UNIQUE INDEX "hotel_images_one_cover_per_hotel"
    ON "hotel_images" ("hotel_id") WHERE "is_cover";

-- A star rating outside 1-5 is always a bug, and this is cheaper than trusting
-- every write path to have run the zod schema.
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_star_rating_range"
    CHECK (star_rating BETWEEN 1 AND 5);

-- The public booking reference sequence, drawn by lib/reference.js exactly as
-- partner_reference_seq is. Created here rather than with the booking tables so
-- that the two references are defined the same way in the same place.
CREATE SEQUENCE IF NOT EXISTS hotel_booking_reference_seq START 1;
