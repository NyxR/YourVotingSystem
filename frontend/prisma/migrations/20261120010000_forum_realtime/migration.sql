-- Live forum updates use Supabase Realtime *private* channels. These rules
-- decide who may join them, mirroring the app's forum visibility:
--   forum:activity       any signed-in member (carries no content, just "something changed")
--   forum:topic:<id>     only people who can see that topic (presence and
--                        typing indicators carry names, so this matters)
-- The server broadcasts with the service role, which bypasses these rules.
--
-- The check lives in its own schema: signed-in users get USAGE on it only
-- (the public schema, holding the app tables, stays closed to them).

CREATE SCHEMA IF NOT EXISTS forum_realtime;
REVOKE ALL ON SCHEMA forum_realtime FROM PUBLIC;
GRANT USAGE ON SCHEMA forum_realtime TO authenticated;

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
              u."role" = 'admin'
              OR c."visibility" = 'EVERYONE'
              OR (c."visibility" = 'DIAKONA' AND 'DIAKONA' = ANY (u."responsibilities"))
              OR (c."visibility" = 'BIRAO' AND 'BIRAO' = ANY (u."responsibilities"))
            )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION forum_realtime.can_join_channel(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION forum_realtime.can_join_channel(text) TO authenticated;

-- Receive broadcasts and presence.
DROP POLICY IF EXISTS "forum channels: receive" ON realtime.messages;
CREATE POLICY "forum channels: receive"
  ON realtime.messages FOR SELECT TO authenticated
  USING (forum_realtime.can_join_channel(realtime.topic()));

-- Send typing signals / track presence (topic channels only).
DROP POLICY IF EXISTS "forum channels: send" ON realtime.messages;
CREATE POLICY "forum channels: send"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() LIKE 'forum:topic:%'
    AND forum_realtime.can_join_channel(realtime.topic())
  );
