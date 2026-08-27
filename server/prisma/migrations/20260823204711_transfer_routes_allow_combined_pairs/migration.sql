-- A direct transfer and a multi-stop itinerary can share both endpoints and
-- still be different products: Tbilisi to Telavi is a two-hour drive, and
-- Tbilisi to Telavi by way of Bodbe, Sighnaghi and Kvareli is a day out. The
-- unique constraint on the pair made the second silently overwrite the first.
--
-- What still has to be unique is one *direct* route per ordered pair, so the
-- constraint becomes a partial index. Prisma cannot express a WHERE clause on
-- an index, which is why this is hand-written here rather than in the schema —
-- the same reason `hotel_images_one_cover_per_hotel` lives in SQL.

-- DropIndex
DROP INDEX "transfer_routes_from_point_id_to_point_id_key";

-- CreateIndex
CREATE INDEX "transfer_routes_from_point_id_to_point_id_idx" ON "transfer_routes"("from_point_id", "to_point_id");

CREATE UNIQUE INDEX "transfer_routes_one_direct_per_pair"
    ON "transfer_routes" ("from_point_id", "to_point_id")
    WHERE "category" <> 'COMBINED';

-- Note for the next `migrate dev`: Prisma proposes dropping
-- `transfer_points_geo_idx` on every diff, because it indexes a PostGIS column
-- the Prisma schema models as `Unsupported` and therefore cannot see. The index
-- is deliberate and is what makes a radius query an index scan. Keep it, and
-- delete that DROP INDEX line from any generated migration, exactly as the
-- destinations and hotels geo indexes are kept.
