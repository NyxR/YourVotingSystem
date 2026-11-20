-- Only Birao may be Admin or Treasurer: give Birao to everyone who
-- already holds one of those roles, so nobody loses access.
UPDATE "User"
SET "responsibilities" = array_append("responsibilities", 'BIRAO'::"Responsibility"),
    "updatedAt" = now()
WHERE "role" IN ('admin', 'treasurer')
  AND NOT ('BIRAO'::"Responsibility" = ANY ("responsibilities"));
