-- Restores the two PostGIS indexes that migration 20260821122256 dropped.
--
-- Prisma models `geo` as `Unsupported("geography(Point, 4326)")` and cannot
-- see a GiST index on it, so every `migrate dev` proposes dropping them. The
-- rule is to delete that DROP INDEX line from the generated migration; the one
-- time it was not, `destinations_geo_idx` and `hotels_geo_idx` went, and no
-- later migration brought them back. (The note in 20260823204711 claims they
-- were kept. They were not. `transfer_points_geo_idx` still is.)
--
-- IF NOT EXISTS because a database that was hand-repaired already has them.
CREATE INDEX IF NOT EXISTS "destinations_geo_idx" ON "destinations" USING GIST ("geo");
CREATE INDEX IF NOT EXISTS "hotels_geo_idx" ON "hotels" USING GIST ("geo");
