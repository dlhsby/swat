-- Address is now optional on a Lokasi (Site) — many GPS-pinned points (e.g. a
-- pickup corner) have coordinates but no postal address. Plain nullability change
-- on a regular table; applied via `prisma migrate deploy`.
ALTER TABLE "site" ALTER COLUMN "address" DROP NOT NULL;
