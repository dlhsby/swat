-- ===========================================================================
-- WasteSource ownership flag for the monitoring tonnage "Total / Dinas / Swasta"
-- toggle (parity G9, specs/13-design/03-hifi-spec.md). The Dinas/Swasta split is
-- NOT derivable from the existing `code` values, so it is stored explicitly.
--
-- Hand-authored (never `prisma migrate dev`): the transactional tables are native
-- monthly partitions and `migrate dev` would reset them. Apply with
-- `prisma migrate deploy`. Mirrors the schema enum `WasteSourceOwnership`.
-- ===========================================================================

-- CreateEnum
CREATE TYPE "WasteSourceOwnership" AS ENUM ('DINAS', 'SWASTA');

-- AlterTable: default SWASTA; the seed promotes the canonical Dinas source (code 'D').
ALTER TABLE "WasteSource"
  ADD COLUMN "ownership" "WasteSourceOwnership" NOT NULL DEFAULT 'SWASTA';
