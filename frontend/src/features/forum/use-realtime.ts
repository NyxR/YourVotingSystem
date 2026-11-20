'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/client';
import { ACTIVITY_CHANNEL, EVENTS, topicChannel } from './channels';

/** Window event re-dispatched for every forum activity signal. */
export const FORUM_ACTIVITY_EVENT = 'forum-activity';

/** Keeps the latest callback in a ref so subscriptions don't restart. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Calls `fn` once things settle (several signals in a burst → one call). */
function useDebounced(fn: () => void, ms: number) {
  const latest = useLatest(fn);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(), ms);
  }, [latest, ms]);
}

/**
 * Joins a private Realtime channel as the signed-in user. `setup` registers
 * listeners before subscribing; `onSubscribed` runs once joined.
 */
function useChannel(
  name: string | null,
  options: Parameters<ReturnType<typeof getBrowserClient>['channel']>[1],
  setup: (channel: RealtimeChannel) => void,
  onSubscribed?: (channel: RealtimeChannel) => void,
) {
  const setupRef = useLatest(setup);
  const subscribedRef = useLatest(onSubscribed);
  const optionsKey = JSON.stringify(options);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!name) return;
    const supabase = getBrowserClient();
    let active: RealtimeChannel | null = null;
    let cancelled = false;
    void (async () => {
      // Private channels need the user's token (checked by the DB rules).
      await supabase.realtime.setAuth();
      if (cancelled) return;
      const joined: RealtimeChannel = supabase.channel(name, JSON.parse(optionsKey));
      active = joined;
      setupRef.current(joined);
      joined.subscribe((status) => {
        if (status === 'SUBSCRIBED') subscribedRef.current?.(joined);
      });
      setChannel(joined);
    })();
    return () => {
      cancelled = true;
      if (active) void supabase.removeChannel(active);
      setChannel(null);
    };
  }, [name, optionsKey, setupRef, subscribedRef]);

  return channel;
}

/**
 * App-wide: listens for "something in the forum changed". Calls `onActivity`
 * (debounced) and re-dispatches a window event other components can use.
 */
export function useForumActivity(onActivity: () => void) {
  const onActivityRef = useLatest(onActivity);
  const debounced = useDebounced(() => {
    onActivityRef.current();
    window.dispatchEvent(new Event(FORUM_ACTIVITY_EVENT));
  }, 400);
  useChannel(ACTIVITY_CHANNEL, { config: { private: true } }, (channel) => {
    channel.on('broadcast', { event: EVENTS.changed }, () => debounced());
  });
}

/** Runs `fn` (debounced) whenever the app-wide forum activity signal fires. */
export function useOnForumActivity(fn: () => void) {
  const debounced = useDebounced(fn, 100);
  useEffect(() => {
    window.addEventListener(FORUM_ACTIVITY_EVENT, debounced);
    return () => window.removeEventListener(FORUM_ACTIVITY_EVENT, debounced);
  }, [debounced]);
}

export type Viewer = { id: string; name: string };

const TYPING_TTL_MS = 4000;
const TYPING_THROTTLE_MS = 2000;

/**
 * One topic: reloads on changes, tracks who's viewing (presence) and who is
 * typing a reply. Returns `notifyTyping` to call while the user types.
 */
export function useTopicRealtime({
  topicId,
  me,
  onChanged,
  onDeleted,
}: {
  topicId: string;
  me: Viewer;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [typing, setTyping] = useState<Record<string, { name: string; at: number }>>({});
  const changed = useDebounced(onChanged, 250);
  const deletedRef = useLatest(onDeleted);
  const lastTypingSent = useRef(0);

  const channel = useChannel(
    topicChannel(topicId),
    { config: { private: true, presence: { key: me.id }, broadcast: { self: false } } },
    (ch) => {
      ch.on('broadcast', { event: EVENTS.changed }, () => changed())
        .on('broadcast', { event: EVENTS.deleted }, () => deletedRef.current())
        .on('broadcast', { event: EVENTS.typing }, ({ payload }) => {
          const p = payload as Partial<Viewer>;
          if (!p.id || !p.name || p.id === me.id) return;
          setTyping((prev) => ({ ...prev, [p.id!]: { name: p.name!, at: Date.now() } }));
        })
        .on('presence', { event: 'sync' }, () => {
          const unique = new Map<string, Viewer>();
          for (const entries of Object.values(ch.presenceState<Viewer>())) {
            for (const v of entries)
              if (v.id && v.id !== me.id) unique.set(v.id, { id: v.id, name: v.name });
          }
          setViewers([...unique.values()].sort((a, b) => a.name.localeCompare(b.name)));
        });
    },
    (ch) => void ch.track({ id: me.id, name: me.name }),
  );

  // Typing entries expire a few seconds after the last signal.
  const hasTyping = Object.keys(typing).length > 0;
  useEffect(() => {
    if (!hasTyping) return;
    const timer = setInterval(() => {
      const cutoff = Date.now() - TYPING_TTL_MS;
      setTyping((prev) => {
        const next = Object.fromEntries(Object.entries(prev).filter(([, v]) => v.at > cutoff));
        return Object.keys(next).length === Object.keys(prev).length ? prev : next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [hasTyping]);

  const notifyTyping = useCallback(() => {
    const now = Date.now();
    if (!channel || now - lastTypingSent.current < TYPING_THROTTLE_MS) return;
    lastTypingSent.current = now;
    void channel.send({ type: 'broadcast', event: EVENTS.typing, payload: me });
  }, [channel, me]);

  /** Someone who posted is no longer "typing". */
  const clearTyping = useCallback((userId: string) => {
    setTyping((prev) => {
      if (!(userId in prev)) return prev;
      const next = { ...prev };
      delete next[userId];
      return next;
    });
  }, []);

  return {
    viewers,
    typing: Object.values(typing).map((v) => v.name),
    notifyTyping,
    clearTyping,
  };
}
