-- Treasurers have the same forum rights as admins: they may join every
-- topic channel (mirrors visibleTo() in src/features/forum/access.ts).

CREATE OR REPLACE FUNCTION forum_realtime.can_join_channel(channel text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "User" u
    WHERE u."authId" = auth.uid()::text
      AND (
        channel = 'forum:activity'
        OR EXISTS (
          SELECT 1
          FROM "ForumTopic" t
          JOIN "ForumCategory" c ON c."id" = t."categoryId"
          WHERE channel = 'forum:topic:' || t."id"
            AND (
              u."role" IN ('admin', 'treasurer')
              OR c."visibility" = 'EVERYONE'
              OR (c."visibility" = 'DIAKONA' AND (
                    'DIAKONA' = ANY (u."responsibilities") OR 'BIRAO' = ANY (u."responsibilities")
                  ))
              OR (c."visibility" = 'BIRAO' AND 'BIRAO' = ANY (u."responsibilities"))
            )
        )
      )
  );
$$;
