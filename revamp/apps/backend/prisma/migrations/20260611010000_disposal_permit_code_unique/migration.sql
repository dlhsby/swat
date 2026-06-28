-- Kitir `code` becomes the unique printable barcode (auto-generated KT-YYYYMM-NNNN
-- on issue). Replace the plain index with a unique one (Postgres allows multiple
-- NULLs under a unique index, so unmigrated/blank rows are fine).
DROP INDEX IF EXISTS "disposal_permit_code_idx";
CREATE UNIQUE INDEX "disposal_permit_code_key" ON "disposal_permit"("code");
