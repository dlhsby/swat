-- Backfill disposal_destination for historical (pre-PTSI-integration) trips.
--
-- Before the PT Surveyor Indonesia API existed, operators recorded a diversion to
-- gasification by typing it into the trip's keterangan (notes), e.g. "GASIFIKASI".
-- Those loads never appear in the PTSI feed, so the auto-matcher can't flag them.
-- Flag every trip whose notes mention gasification as GASIFICATION so the old data
-- traces back correctly; all other trips keep the column default (LANDFILL).
--
-- Idempotent: skips rows already GASIFICATION (e.g. flagged by the API matcher).
-- `trip` is partitioned — the UPDATE cascades to every monthly partition.
UPDATE "trip"
SET "disposal_destination" = 'GASIFICATION'
WHERE "notes" ILIKE '%gasifikasi%'
  AND "disposal_destination" <> 'GASIFICATION';
