-- Vehicle plate disambiguation support (legacy migration).
-- Widen plate_number from VARCHAR(10)→(20) and add needs_plate_review so the
-- legacy loader can suffix blank/placeholder/duplicate plates with #<legacyId>
-- (e.g. 'B9552EQ#1048') and flag them, instead of dropping those vehicles on the
-- unique constraint and orphaning their hauls/permits.
ALTER TABLE "vehicle" ALTER COLUMN "plate_number" TYPE VARCHAR(20);
ALTER TABLE "vehicle" ADD COLUMN "needs_plate_review" BOOLEAN NOT NULL DEFAULT false;
