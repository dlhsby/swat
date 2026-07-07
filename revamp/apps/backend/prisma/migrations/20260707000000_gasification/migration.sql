-- Gasification (PT Surveyor Indonesia / PTSI) integration.
-- Trip is a partitioned table (migration-managed): add columns on the parent so
-- they propagate to every monthly partition. Never run `migrate dev` here.

-- Destination of a disposal trip's load + PTSI record lifecycle.
CREATE TYPE "DisposalDestination" AS ENUM ('LANDFILL', 'GASIFICATION');
CREATE TYPE "GasificationMatchStatus" AS ENUM ('UNMATCHED', 'MATCHED', 'IGNORED');

-- CCTV/photo evidence moves onto the Trip (legacy stored it trip-scoped in
-- dokumentasitrayek; the new TpaInboundLog.cctv_reference scalar is retired here
-- as the read source but left in place to avoid a partitioned-table column drop).
ALTER TABLE "trip" ADD COLUMN IF NOT EXISTS "cctv_reference" VARCHAR(256);
ALTER TABLE "trip" ADD COLUMN IF NOT EXISTS "disposal_destination" "DisposalDestination" NOT NULL DEFAULT 'LANDFILL';

-- Backfill the existing cctv references off the weighbridge log onto their trips.
UPDATE "trip" t
SET "cctv_reference" = l."cctv_reference"
FROM "tpa_inbound_log" l
WHERE l."trip_id" = t."id"
  AND l."cctv_reference" IS NOT NULL
  AND t."cctv_reference" IS NULL;

-- PTSI gasification-gate records. Low-volume; not partitioned. FK-free trip link.
CREATE TABLE "gasification_entry" (
    "id" UUID NOT NULL,
    "plate_number" VARCHAR(20) NOT NULL,
    "vendor_nopol" VARCHAR(30) NOT NULL,
    "entered_at" TIMESTAMPTZ(6) NOT NULL,
    "operation_date" DATE NOT NULL,
    "user_tally" VARCHAR(100),
    "foto_filename" VARCHAR(256) NOT NULL,
    "photo_object_key" VARCHAR(512),
    "raw_payload" JSONB NOT NULL,
    "status" "GasificationMatchStatus" NOT NULL DEFAULT 'UNMATCHED',
    "matched_trip_id" UUID,
    "matched_at" TIMESTAMPTZ(6),
    "matched_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "gasification_entry_pkey" PRIMARY KEY ("id")
);

-- Dedup key: re-polling the same PTSI capture upserts instead of duplicating.
CREATE UNIQUE INDEX "gasification_entry_plate_number_entered_at_foto_filename_key"
    ON "gasification_entry"("plate_number", "entered_at", "foto_filename");
-- One-to-one: a disposal trip can be claimed by at most one gasification record.
CREATE UNIQUE INDEX "gasification_entry_matched_trip_id_key"
    ON "gasification_entry"("matched_trip_id");
CREATE INDEX "gasification_entry_operation_date_idx" ON "gasification_entry"("operation_date");
CREATE INDEX "gasification_entry_status_idx" ON "gasification_entry"("status");
