-- Mpandray → Diakona → Birao: Birao must also be Diakona, and Diakona must
-- be Mpandray. Fill in what's missing so nobody loses a responsibility.
UPDATE "User"
SET "responsibilities" = array_append("responsibilities", 'DIAKONA'::"Responsibility"),
    "updatedAt" = now()
WHERE 'BIRAO'::"Responsibility" = ANY ("responsibilities")
  AND NOT ('DIAKONA'::"Responsibility" = ANY ("responsibilities"));

UPDATE "User"
SET "memberType" = 'MPANDRAY',
    "updatedAt" = now()
WHERE 'DIAKONA'::"Responsibility" = ANY ("responsibilities")
  AND "memberType" <> 'MPANDRAY';
