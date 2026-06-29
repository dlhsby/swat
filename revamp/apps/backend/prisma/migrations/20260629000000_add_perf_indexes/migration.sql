-- Performance indexes for the large lists exposed after the 2-year staging reseed.
-- Hand-written (not `migrate dev`) because the transaction tables are partition-managed;
-- `CREATE INDEX IF NOT EXISTS` keeps this idempotent and `migrate deploy`-safe.

-- `haul` is RANGE-partitioned by `operation_date`; the scheduling list groups hauls by
-- `transaction_day_id` (NOT the partition key, previously unindexed) → it scanned every
-- monthly partition. A partitioned index on the parent cascades a local index to each
-- partition, so the group-by becomes an index scan.
CREATE INDEX IF NOT EXISTS "haul_transaction_day_id_idx" ON "haul" ("transaction_day_id");

-- The disposal-permit list filters by `site_id` (the existing composite indexes are
-- prefixed by vehicle_id / status, so a bare site filter could not use them).
CREATE INDEX IF NOT EXISTS "disposal_permit_site_id_idx" ON "disposal_permit" ("site_id");

-- The scheduling list filters transaction days by `status`; date ordering is already
-- covered by the unique(date) index.
CREATE INDEX IF NOT EXISTS "transaction_day_status_idx" ON "transaction_day" ("status");
