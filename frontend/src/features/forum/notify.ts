// Server-only: tells open pages that forum data changed, via Supabase
// Realtime. Signals only (no text, no names); pages then reload through the
// normal access-checked queries.

import { createAdminClient } from '@/lib/supabase/admin';
import { ACTIVITY_CHANNEL, EVENTS, topicChannel } from './channels';

export async function notifyForum({
  topicId,
  event = EVENTS.changed,
  activity = true,
}: {
  /** Topic whose viewers should reload. */
  topicId?: string;
  event?: typeof EVENTS.changed | typeof EVENTS.deleted;
  /** Also refresh forum lists and unread badges everywhere. */
  activity?: boolean;
}) {
  const supabase = createAdminClient();
  const sends: Promise<{ success: boolean }>[] = [];
  if (topicId) {
    sends.push(
      supabase.channel(topicChannel(topicId), { config: { private: true } }).httpSend(event, {}),
    );
  }
  if (activity) {
    sends.push(
      supabase
        .channel(ACTIVITY_CHANNEL, { config: { private: true } })
        .httpSend(EVENTS.changed, {}),
    );
  }
  // Live updates are best-effort: never fail the user's action over them.
  const results = await Promise.allSettled(sends);
  for (const r of results) {
    if (r.status === 'rejected' || !r.value.success) {
      console.error('Forum realtime notify failed', r.status === 'rejected' ? r.reason : r.value);
    }
  }
  await supabase.removeAllChannels();
}
