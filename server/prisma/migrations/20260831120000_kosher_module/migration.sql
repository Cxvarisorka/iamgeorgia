-- CreateEnum
CREATE TYPE "kosher_service_level" AS ENUM ('NONE', 'ON_REQUEST', 'KOSHER_FRIENDLY', 'PARTIAL', 'FULL');

-- CreateEnum
CREATE TYPE "kosher_certification_scope" AS ENUM ('PROPERTY', 'KITCHEN', 'RESTAURANT', 'PASSOVER');

-- CreateEnum
CREATE TYPE "kosher_verification" AS ENUM ('UNVERIFIED', 'PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "kosher_data_source" AS ENUM ('ADMIN', 'HOTEL', 'SUPPLIER', 'IMPORT');

-- CreateEnum
CREATE TYPE "booking_request_status" AS ENUM ('REQUESTED', 'CONFIRMED', 'DECLINED', 'WITHDRAWN');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "amenity_category" ADD VALUE 'KosherFood';
ALTER TYPE "amenity_category" ADD VALUE 'Shabbat';
ALTER TYPE "amenity_category" ADD VALUE 'Religious';

-- AlterEnum
ALTER TYPE "file_category" ADD VALUE 'KOSHER_CERTIFICATE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "audit_action" ADD VALUE 'HOTEL_KOSHER_ENABLED';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_KOSHER_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_KOSHER_DISABLED';
ALTER TYPE "audit_action" ADD VALUE 'KOSHER_CERTIFICATION_ADDED';
ALTER TYPE "audit_action" ADD VALUE 'KOSHER_CERTIFICATION_UPDATED';
ALTER TYPE "audit_action" ADD VALUE 'KOSHER_CERTIFICATION_VERIFIED';
ALTER TYPE "audit_action" ADD VALUE 'KOSHER_CERTIFICATION_ARCHIVED';
ALTER TYPE "audit_action" ADD VALUE 'KOSHER_CERTIFICATION_EXPIRING';
ALTER TYPE "audit_action" ADD VALUE 'KOSHER_SUPPLIER_UPDATE_HELD';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_DOCUMENT_UPLOADED';
ALTER TYPE "audit_action" ADD VALUE 'HOTEL_DOCUMENT_DELETED';
ALTER TYPE "audit_action" ADD VALUE 'BOOKING_REQUEST_ANSWERED';

-- AlterTable
ALTER TABLE "hotel_documents" ADD COLUMN     "uploaded_by_user_id" TEXT;

-- CreateTable
CREATE TABLE "hotel_kosher_profiles" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "service_level" "kosher_service_level" NOT NULL DEFAULT 'KOSHER_FRIENDLY',
    "notes" TEXT,
    "contact_name" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "source" "kosher_data_source" NOT NULL DEFAULT 'ADMIN',
    "source_ref" TEXT,
    "source_updated_at" TIMESTAMP(3),
    "locked_at" TIMESTAMP(3),
    "locked_by_user_id" TEXT,
    "pending_supplier_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_kosher_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_kosher_certifications" (
    "id" TEXT NOT NULL,
    "profile_id" TEXT NOT NULL,
    "authority_name" TEXT NOT NULL,
    "authority_website" TEXT,
    "name" TEXT,
    "reference" TEXT,
    "scope" "kosher_certification_scope" NOT NULL DEFAULT 'PROPERTY',
    "issued_on" DATE,
    "expires_on" DATE,
    "verification" "kosher_verification" NOT NULL DEFAULT 'UNVERIFIED',
    "verified_at" TIMESTAMP(3),
    "verified_by_user_id" TEXT,
    "verification_notes" TEXT,
    "document_id" TEXT,
    "source" "kosher_data_source" NOT NULL DEFAULT 'ADMIN',
    "archived_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_kosher_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotel_booking_requests" (
    "id" TEXT NOT NULL,
    "booking_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "note" TEXT,
    "status" "booking_request_status" NOT NULL DEFAULT 'REQUESTED',
    "responded_at" TIMESTAMP(3),
    "responded_by_user_id" TEXT,
    "response_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotel_booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hotel_kosher_profiles_hotel_id_key" ON "hotel_kosher_profiles"("hotel_id");

-- CreateIndex
CREATE INDEX "hotel_kosher_profiles_service_level_idx" ON "hotel_kosher_profiles"("service_level");

-- CreateIndex
CREATE INDEX "hotel_kosher_certifications_profile_id_verification_idx" ON "hotel_kosher_certifications"("profile_id", "verification");

-- CreateIndex
CREATE INDEX "hotel_kosher_certifications_expires_on_idx" ON "hotel_kosher_certifications"("expires_on");

-- CreateIndex
CREATE INDEX "hotel_booking_requests_booking_id_status_idx" ON "hotel_booking_requests"("booking_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "hotel_booking_requests_booking_id_code_key" ON "hotel_booking_requests"("booking_id", "code");

-- CreateIndex
CREATE INDEX "hotel_documents_uploaded_by_user_id_idx" ON "hotel_documents"("uploaded_by_user_id");

-- AddForeignKey
ALTER TABLE "hotel_documents" ADD CONSTRAINT "hotel_documents_uploaded_by_user_id_fkey" FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_kosher_profiles" ADD CONSTRAINT "hotel_kosher_profiles_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_kosher_profiles" ADD CONSTRAINT "hotel_kosher_profiles_locked_by_user_id_fkey" FOREIGN KEY ("locked_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_kosher_certifications" ADD CONSTRAINT "hotel_kosher_certifications_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "hotel_kosher_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_kosher_certifications" ADD CONSTRAINT "hotel_kosher_certifications_verified_by_user_id_fkey" FOREIGN KEY ("verified_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_kosher_certifications" ADD CONSTRAINT "hotel_kosher_certifications_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "hotel_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking_requests" ADD CONSTRAINT "hotel_booking_requests_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "hotel_bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hotel_booking_requests" ADD CONSTRAINT "hotel_booking_requests_responded_by_user_id_fkey" FOREIGN KEY ("responded_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written, beyond what Prisma generates.
-- ---------------------------------------------------------------------------

-- A certificate that is verified but expired is not a live certificate, and a
-- certificate that is archived is history. The partial index therefore holds
-- only the rows the "kosher certified" filter can ever match — a few hundred at
-- platform scale rather than one row per certificate ever issued. Prisma cannot
-- express an index with a WHERE clause, which is why this is here.
CREATE INDEX "hotel_kosher_certifications_live_idx"
    ON "hotel_kosher_certifications" ("profile_id", "expires_on")
    WHERE "verification" = 'VERIFIED' AND "archived_at" IS NULL;

-- The expiry sweep and the "expiring soon" admin queue read this. Only rows
-- that can actually lapse are in it: a certificate with no expiry never does.
CREATE INDEX "hotel_kosher_certifications_expiry_idx"
    ON "hotel_kosher_certifications" ("expires_on")
    WHERE "verification" = 'VERIFIED' AND "archived_at" IS NULL AND "expires_on" IS NOT NULL;

-- Profiles that can match a kosher filter at all. NONE means "we asked, and the
-- answer was no", which is worth recording and never worth returning.
CREATE INDEX "hotel_kosher_profiles_offered_idx"
    ON "hotel_kosher_profiles" ("service_level")
    WHERE "service_level" <> 'NONE';

-- A certificate whose issue date is after its expiry date describes nothing.
-- Cheap to state here, and impossible to violate from any code path afterwards.
ALTER TABLE "hotel_kosher_certifications"
    ADD CONSTRAINT "hotel_kosher_certifications_dates_ordered" CHECK (
        "issued_on" IS NULL OR "expires_on" IS NULL OR "expires_on" >= "issued_on"
    );

-- Verification metadata travels together or not at all. Without this a row
-- could claim VERIFIED with no verifier and no timestamp, which is exactly the
-- shape a bug or a careless import would produce.
ALTER TABLE "hotel_kosher_certifications"
    ADD CONSTRAINT "hotel_kosher_certifications_verified_coherent" CHECK (
        ("verification" <> 'VERIFIED') OR ("verified_at" IS NOT NULL)
    );

-- A response without a timestamp is not a response.
ALTER TABLE "hotel_booking_requests"
    ADD CONSTRAINT "hotel_booking_requests_response_coherent" CHECK (
        ("status" IN ('REQUESTED', 'WITHDRAWN')) OR ("responded_at" IS NOT NULL)
    );
