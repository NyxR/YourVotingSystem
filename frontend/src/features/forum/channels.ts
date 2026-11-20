// Realtime channel names, shared by server and browser. Channels are private:
// joining is checked by the forum_can_join_channel() rule in the database.

/** "Something in the forum changed" (badge + topic list). No content. */
export const ACTIVITY_CHANNEL = 'forum:activity';

/** Live updates, presence and typing for one topic. */
export const topicChannel = (topicId: string) => `forum:topic:${topicId}`;

/** Broadcast events. Payloads never contain post content. */
export const EVENTS = {
  /** Reload the data (new/edited/deleted reply, like, pin, lock, edit). */
  changed: 'changed',
  /** The topic was deleted. */
  deleted: 'deleted',
  /** Someone is typing a reply: { userId, name }. */
  typing: 'typing',
} as const;
