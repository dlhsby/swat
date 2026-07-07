-- Remove the TpaInboundLog (legacy `sampahmasuktpa`) weighbridge reconciliation log.
-- Its operational data (weights + cctv_reference) now lives on the Trip; the
-- monitoring reconciliation column, the Excel weighing-import, archiving of this
-- table, and the legacy loader are all retired with it.
--
-- The table is a native RANGE-partitioned parent: DROP TABLE ... CASCADE removes
-- the parent and every monthly child partition in one statement.
DROP TABLE IF EXISTS "tpa_inbound_log" CASCADE;
