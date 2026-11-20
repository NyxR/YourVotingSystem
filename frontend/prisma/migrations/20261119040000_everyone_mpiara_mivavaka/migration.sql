-- Every member is Mpiara-mivavaka. Add it to anyone saved without it,
-- keeping their other responsibilities. (No schema change.)
UPDATE "User"
SET "responsibilities" = array_append(COALESCE("responsibilities", ARRAY[]::"Responsibility"[]), 'MPIARA_MIVAVAKA'::"Responsibility")
WHERE "responsibilities" IS NULL OR NOT ('MPIARA_MIVAVAKA'::"Responsibility" = ANY("responsibilities"));
