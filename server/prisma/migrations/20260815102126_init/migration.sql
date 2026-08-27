-- CreateEnum
CREATE TYPE "property_type" AS ENUM ('Hotel', 'Boutique', 'Resort', 'Guesthouse', 'Lodge');

-- CreateEnum
CREATE TYPE "amenity_id" AS ENUM ('wifi', 'breakfast', 'pool', 'parking', 'restaurant', 'spa', 'airConditioning', 'gym', 'bar', 'petFriendly', 'familyRooms', 'airportShuttle', 'terrace', 'roomService');

-- CreateEnum
CREATE TYPE "tour_category" AS ENUM ('adventure', 'culture', 'wine', 'nature', 'city');

-- CreateEnum
CREATE TYPE "difficulty" AS ENUM ('Easy', 'Moderate', 'Challenging');

-- CreateEnum
CREATE TYPE "experience_category" AS ENUM ('wine', 'food', 'adventure', 'culture', 'wellness', 'craft');

-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "hero_image" TEXT NOT NULL,
    "cover_image" TEXT NOT NULL,
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "ideal_for" TEXT[],
    "attractions" JSONB NOT NULL DEFAULT '[]',
    "travel_info" JSONB NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hotels" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "property_type" "property_type" NOT NULL,
    "location" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "star_rating" INTEGER NOT NULL,
    "guest_score" DOUBLE PRECISION NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "image" TEXT NOT NULL,
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "amenities" "amenity_id"[],
    "highlights" TEXT[],
    "category_scores" JSONB NOT NULL DEFAULT '[]',
    "policies" JSONB NOT NULL,
    "nearby" JSONB NOT NULL DEFAULT '[]',
    "price_from_cents" INTEGER NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hotels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "bed_configuration" TEXT NOT NULL,
    "max_guests" INTEGER NOT NULL,
    "size_sqm" INTEGER NOT NULL,
    "amenities" TEXT[],
    "cancellation" TEXT NOT NULL,
    "breakfast_included" BOOLEAN NOT NULL DEFAULT false,
    "price_per_night_cents" INTEGER NOT NULL,
    "availability_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "hotel_id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "trip_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tours" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "category" "tour_category" NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "image" TEXT NOT NULL,
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "duration_days" INTEGER NOT NULL,
    "duration_label" TEXT NOT NULL,
    "group_size" TEXT NOT NULL,
    "difficulty" "difficulty" NOT NULL,
    "price_from_cents" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "highlights" TEXT[],
    "included" TEXT[],
    "excluded" TEXT[],
    "meeting_point" TEXT NOT NULL,
    "important_info" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_days" (
    "id" TEXT NOT NULL,
    "tour_id" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "meals" TEXT[],
    "accommodation" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "category" "experience_category" NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT[],
    "image" TEXT NOT NULL,
    "gallery" JSONB NOT NULL DEFAULT '[]',
    "duration" TEXT NOT NULL,
    "group_size" TEXT NOT NULL,
    "price_cents" INTEGER NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "highlights" TEXT[],
    "what_to_expect" JSONB NOT NULL DEFAULT '[]',
    "included" TEXT[],
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations"("slug");

-- CreateIndex
CREATE INDEX "destinations_featured_idx" ON "destinations"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "hotels_slug_key" ON "hotels"("slug");

-- CreateIndex
CREATE INDEX "hotels_destination_id_idx" ON "hotels"("destination_id");

-- CreateIndex
CREATE INDEX "hotels_featured_idx" ON "hotels"("featured");

-- CreateIndex
CREATE INDEX "hotels_price_from_cents_idx" ON "hotels"("price_from_cents");

-- CreateIndex
CREATE INDEX "rooms_hotel_id_idx" ON "rooms"("hotel_id");

-- CreateIndex
CREATE INDEX "reviews_hotel_id_date_idx" ON "reviews"("hotel_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "tours_slug_key" ON "tours"("slug");

-- CreateIndex
CREATE INDEX "tours_destination_id_idx" ON "tours"("destination_id");

-- CreateIndex
CREATE INDEX "tours_category_idx" ON "tours"("category");

-- CreateIndex
CREATE INDEX "tours_featured_idx" ON "tours"("featured");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_days_tour_id_day_key" ON "itinerary_days"("tour_id", "day");

-- CreateIndex
CREATE UNIQUE INDEX "experiences_slug_key" ON "experiences"("slug");

-- CreateIndex
CREATE INDEX "experiences_destination_id_idx" ON "experiences"("destination_id");

-- CreateIndex
CREATE INDEX "experiences_category_idx" ON "experiences"("category");

-- CreateIndex
CREATE INDEX "experiences_featured_idx" ON "experiences"("featured");

-- AddForeignKey
ALTER TABLE "hotels" ADD CONSTRAINT "hotels_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_hotel_id_fkey" FOREIGN KEY ("hotel_id") REFERENCES "hotels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tours" ADD CONSTRAINT "tours_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_tour_id_fkey" FOREIGN KEY ("tour_id") REFERENCES "tours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
