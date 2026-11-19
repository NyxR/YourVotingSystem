-- AlterTable
ALTER TABLE "User" ALTER COLUMN "responsibilities" SET DEFAULT ARRAY['MPIARA_MIVAVAKA']::"Responsibility"[];


-- Backfill: users with no responsibility yet get the new default.
-- Users who already have any responsibility are left unchanged.
UPDATE "User"
SET "responsibilities" = ARRAY['MPIARA_MIVAVAKA']::"Responsibility"[]
WHERE "responsibilities" IS NULL OR cardinality("responsibilities") = 0;
