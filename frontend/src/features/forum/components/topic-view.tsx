'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  CornerDownRightIcon,
  EllipsisIcon,
  HeartIcon,
  LockIcon,
  LockOpenIcon,
  PencilIcon,
  PinIcon,
  PinOffIcon,
  ReplyIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { translateValidation } from '@/i18n/validation';
import { cn } from '@/lib/utils';
import {
  createComment,
  deleteComment,
  deleteTopic,
  markTopicRead,
  setTopicFlag,
  toggleLike,
  updateComment,
  updateTopic,
} from '../actions/forum.actions';
import {
  commentFormSchema,
  type CommentItem,
  type ForumCategoryItem,
  type Post,
  type TopicDetail,
} from '../schemas';
import { CategoryBadge, PersonAvatar, RelativeTime } from './forum-bits';
import { MarkdownEditor } from './markdown-editor';
import { MarkdownView } from './markdown-view';
import { TopicForm } from './topic-form';
import { useTopicRealtime, type Viewer } from '../use-realtime';

type Deleting = { kind: 'topic' } | { kind: 'comment'; id: string } | null;

export function TopicView({
  topic,
  categories,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  canModerate,
}: {
  topic: TopicDetail;
  /** Categories the user can move the topic to when editing. */
  categories: ForumCategoryItem[];
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
  canModerate: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [editingTopic, setEditingTopic] = useState(false);
  const [replyTo, setReplyTo] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState<Deleting>(null);
  const scrollTo = useRef<string | null>(null);
  // Kept from the first render: marking the topic read refreshes the props.
  const [firstUnreadId] = useState(topic.firstUnreadId);

  // ── Live updates ──
  const me = useMemo(
    () => ({ id: currentUserId, name: currentUserName, avatarUrl: currentUserAvatar }),
    [currentUserId, currentUserName, currentUserAvatar],
  );
  const deletingSelf = useRef(false);
  const { viewers, typing, notifyTyping, clearTyping } = useTopicRealtime({
    topicId: topic.id,
    me,
    onChanged: () => router.refresh(),
    onDeleted: () => {
      if (deletingSelf.current) return;
      toast.info(t.forum.topicDeletedByOther);
      router.push('/main/forum');
    },
  });

  // Replies from others that arrived while the end of the list was off-screen.
  const [unseen, setUnseen] = useState<string[]>([]);
  const [atBottom, setAtBottom] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = endRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      setAtBottom(entry.isIntersecting);
      if (entry.isIntersecting) setUnseen([]);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const commentIds = topic.comments.map((c) => c.id).join(',');
  const [prevCommentIds, setPrevCommentIds] = useState(commentIds);
  if (commentIds !== prevCommentIds) {
    const before = new Set(prevCommentIds.split(','));
    const fresh = topic.comments.filter((c) => !before.has(c.id) && c.author?.id !== currentUserId);
    setPrevCommentIds(commentIds);
    for (const c of fresh) if (c.author) clearTyping(c.author.id);
    if (fresh.length > 0 && !atBottom) setUnseen((u) => [...u, ...fresh.map((c) => c.id)]);
  }
  const pendingUnseen = unseen.filter((id) => topic.comments.some((c) => c.id === id));

  // Opening the topic (and every live update) marks it read, keeping the
  // sidebar/forum badges right; then jump to the first reply that is new
  // since the last visit.
  useEffect(() => {
    void markTopicRead(topic.id);
  }, [topic.id, topic.comments.length]);
  useEffect(() => {
    if (firstUnreadId) {
      document.getElementById(`comment-${firstUnreadId}`)?.scrollIntoView({ block: 'center' });
    }
  }, [firstUnreadId]);
  // After posting, scroll to the new reply once the refreshed list shows it.
  useEffect(() => {
    if (!scrollTo.current) return;
    const el = document.getElementById(`comment-${scrollTo.current}`);
    if (el) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      scrollTo.current = null;
    }
  }, [topic.comments]);

  const flag = async (name: 'pinned' | 'locked', value: boolean) => {
    const result = await setTopicFlag(topic.id, name, value);
    if (!result.success) return toast.error(result.message);
    toast.success(
      name === 'pinned'
        ? value
          ? t.forum.pinnedToast
          : t.forum.unpinnedToast
        : value
          ? t.forum.lockedToast
          : t.forum.unlockedToast,
    );
  };

  const showMenu = topic.canEdit || canModerate;

  return (
    <div className='mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 lg:px-6'>
      <Button asChild variant='ghost' size='sm' className='self-start'>
        <Link href={`/main/forum?category=${topic.category.id}`}>
          <ArrowLeftIcon /> {t.forum.backToForum}
        </Link>
      </Button>

      {editingTopic ? (
        <Card className='px-4'>
          <h2 className='text-lg font-semibold'>{t.forum.editTopic}</h2>
          <TopicForm
            categories={categories}
            defaultValues={{
              categoryId: topic.category.id,
              title: topic.title,
              body: topic.body,
            }}
            submitLabel={t.common.saveChanges}
            onCancel={() => setEditingTopic(false)}
            onSubmit={async (values) => {
              const result = await updateTopic(topic.id, values);
              if (!result.success) return result.message;
              toast.success(t.forum.saved);
              setEditingTopic(false);
            }}
          />
        </Card>
      ) : (
        <>
          <header className='flex items-start gap-2'>
            <div className='flex min-w-0 flex-1 flex-col gap-2'>
              <h2 className='flex flex-wrap items-center gap-2 text-xl font-semibold break-words'>
                {topic.pinned && (
                  <PinIcon className='size-4 text-primary' aria-label={t.forum.pinned} />
                )}
                {topic.locked && (
                  <LockIcon className='size-4 text-muted-foreground' aria-label={t.forum.locked} />
                )}
                <span className='min-w-0'>{topic.title}</span>
              </h2>
              <CategoryBadge category={topic.category} className='self-start' />
            </div>
            {showMenu && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='outline' size='icon' className='size-8 shrink-0'>
                    <EllipsisIcon />
                    <span className='sr-only'>{t.forum.topicActions}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  {topic.canEdit && (
                    <DropdownMenuItem onSelect={() => setEditingTopic(true)}>
                      <PencilIcon /> {t.common.edit}
                    </DropdownMenuItem>
                  )}
                  {canModerate && (
                    <>
                      <DropdownMenuItem onSelect={() => void flag('pinned', !topic.pinned)}>
                        {topic.pinned ? <PinOffIcon /> : <PinIcon />}
                        {topic.pinned ? t.forum.unpin : t.forum.pin}
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => void flag('locked', !topic.locked)}>
                        {topic.locked ? <LockOpenIcon /> : <LockIcon />}
                        {topic.locked ? t.forum.unlock : t.forum.lock}
                      </DropdownMenuItem>
                    </>
                  )}
                  {topic.canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant='destructive'
                        onSelect={() => setDeleting({ kind: 'topic' })}
                      >
                        <Trash2Icon /> {t.common.delete}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </header>

          <Card className='gap-3 px-4'>
            <PostHeader post={topic} />
            <MarkdownView body={topic.body} />
            <div className='flex items-center gap-1'>
              <LikeButton
                post={topic}
                own={topic.author?.id === currentUserId}
                target={{ topicId: topic.id }}
              />
            </div>
          </Card>
        </>
      )}

      <div className='mt-2 flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-sm font-medium text-muted-foreground'>
          {fmt(t.forum.repliesHeading, { count: topic.comments.length })}
        </h3>
        <ViewersBar viewers={viewers} />
      </div>

      {topic.comments.length === 0 ? (
        <p className='rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground'>
          {t.forum.noReplies}
        </p>
      ) : (
        <ol className='flex flex-col gap-3'>
          {topic.comments.map((comment) => (
            <li key={comment.id} className='flex flex-col gap-3'>
              {comment.id === firstUnreadId && (
                <div
                  className='flex items-center gap-2 text-xs font-medium text-primary'
                  role='separator'
                >
                  <span className='h-px flex-1 bg-primary/40' />
                  {t.forum.newSince}
                  <span className='h-px flex-1 bg-primary/40' />
                </div>
              )}
              <CommentCard
                comment={comment}
                own={comment.author?.id === currentUserId}
                canReply={!topic.locked}
                onReply={() => {
                  setReplyTo({
                    id: comment.id,
                    name: comment.author?.name ?? t.common.removedUser,
                  });
                  document
                    .getElementById('reply-box')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
                onDelete={() => setDeleting({ kind: 'comment', id: comment.id })}
              />
            </li>
          ))}
        </ol>
      )}
      <div ref={endRef} aria-hidden className='h-px' />

      {pendingUnseen.length > 0 && (
        <Button
          size='sm'
          className='fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-full shadow-lg'
          onClick={() => {
            document
              .getElementById('comment-' + pendingUnseen[0])
              ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setUnseen([]);
          }}
        >
          <ArrowDownIcon /> {fmt(t.forum.newRepliesNotice, { count: pendingUnseen.length })}
        </Button>
      )}

      <TypingLine names={typing} />

      {topic.locked ? (
        <p className='flex items-center gap-2 rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground'>
          <LockIcon className='size-4' /> {t.forum.lockedNotice}
        </p>
      ) : (
        <ReplyBox
          topicId={topic.id}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          onTyping={notifyTyping}
          onPosted={(id) => {
            setReplyTo(null);
            scrollTo.current = id;
          }}
        />
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={deleting?.kind === 'topic' ? t.forum.deleteTopicTitle : t.forum.deleteCommentTitle}
        description={
          deleting?.kind === 'topic'
            ? fmt(t.forum.deleteTopicDescription, { title: topic.title })
            : t.forum.deleteCommentDescription
        }
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          if (!deleting) return;
          if (deleting.kind === 'topic') deletingSelf.current = true;
          const result =
            deleting.kind === 'topic'
              ? await deleteTopic(topic.id)
              : await deleteComment(deleting.id);
          if (!result.success) deletingSelf.current = false;
          if (!result.success) {
            toast.error(result.message);
            return false;
          }
          if (deleting.kind === 'topic') {
            toast.success(t.forum.deleted);
            router.push(`/main/forum?category=${topic.category.id}`);
          } else {
            toast.success(t.forum.commentDeleted);
          }
        }}
      />
    </div>
  );
}

function PostHeader({ post }: { post: Post }) {
  const { t } = useI18n();
  const name = post.author?.name ?? null;
  return (
    <div className='flex items-center gap-2'>
      <PersonAvatar name={name} src={post.author?.avatarUrl} />
      <div className='flex min-w-0 flex-col text-sm leading-tight'>
        <span className='truncate font-medium'>{name ?? t.common.removedUser}</span>
        <span className='text-xs text-muted-foreground'>
          <RelativeTime iso={post.createdAt} />
          {post.editedAt && (
            <>
              {' · '}
              <span title={new Date(post.editedAt).toLocaleString()} suppressHydrationWarning>
                {t.forum.edited}
              </span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}

function CommentCard({
  comment,
  own,
  canReply,
  onReply,
  onDelete,
}: {
  comment: CommentItem;
  own: boolean;
  canReply: boolean;
  onReply: () => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);

  return (
    <Card
      id={`comment-${comment.id}`}
      className='scroll-mt-20 gap-3 px-4 py-4 target:ring-2 target:ring-primary/40'
    >
      {comment.replyTo && (
        <a
          href={`#comment-${comment.replyTo.id}`}
          className='inline-flex items-center gap-1 self-start text-xs text-muted-foreground hover:text-foreground'
        >
          <CornerDownRightIcon className='size-3' />
          {fmt(t.forum.inReplyTo, {
            name: comment.replyTo.authorName ?? t.common.removedUser,
          })}
        </a>
      )}
      <PostHeader post={comment} />
      {editing ? (
        <CommentEditor
          initial={comment.body}
          onCancel={() => setEditing(false)}
          onSave={async (body) => {
            const result = await updateComment(comment.id, body);
            if (!result.success) return result.message;
            toast.success(t.forum.commentSaved);
            setEditing(false);
          }}
        />
      ) : (
        <MarkdownView body={comment.body} />
      )}
      {!editing && (
        <div className='-mb-1 flex flex-wrap items-center gap-1'>
          <LikeButton post={comment} own={own} target={{ commentId: comment.id }} />
          {canReply && (
            <Button variant='ghost' size='sm' className='text-muted-foreground' onClick={onReply}>
              <ReplyIcon /> {t.forum.reply}
            </Button>
          )}
          {comment.canEdit && (
            <>
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground'
                onClick={() => setEditing(true)}
              >
                <PencilIcon /> <span className='sr-only sm:not-sr-only'>{t.common.edit}</span>
              </Button>
              <Button
                variant='ghost'
                size='sm'
                className='text-muted-foreground hover:text-destructive'
                onClick={onDelete}
              >
                <Trash2Icon /> <span className='sr-only sm:not-sr-only'>{t.common.delete}</span>
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}

function LikeButton({
  post,
  own,
  target,
}: {
  post: Post;
  own: boolean;
  target: { topicId: string } | { commentId: string };
}) {
  const { t } = useI18n();
  const [pending, startTransition] = useTransition();
  // Optimistic state until the refreshed props arrive.
  const [optimistic, setOptimistic] = useState<{
    liked: boolean;
    count: number;
  } | null>(null);
  const liked = optimistic?.liked ?? post.likedByMe;
  const count = optimistic?.count ?? post.likeCount;

  if (own) {
    return count > 0 ? (
      <span className='inline-flex h-8 items-center gap-1.5 px-2 text-sm text-muted-foreground tabular-nums'>
        <HeartIcon className='size-4' aria-hidden />
        <span className='sr-only'>{t.forum.likesLabel}:</span>
        {count}
      </span>
    ) : null;
  }

  return (
    <Button
      variant='ghost'
      size='sm'
      aria-pressed={liked}
      disabled={pending}
      className={cn(
        'tabular-nums',
        liked ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground',
      )}
      title={liked ? t.forum.unlike : t.forum.like}
      onClick={() => {
        setOptimistic({ liked: !liked, count: count + (liked ? -1 : 1) });
        startTransition(async () => {
          const result = await toggleLike(target);
          if (!result.success) toast.error(result.message);
          setOptimistic(null);
        });
      }}
    >
      <HeartIcon className={cn(liked && 'fill-current')} />
      <span className='sr-only'>{liked ? t.forum.unlike : t.forum.like}</span>
      {count > 0 && count}
    </Button>
  );
}

function CommentEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (body: string) => Promise<string | void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const [body, setBody] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const parsed = commentFormSchema.safeParse({ body });
    if (!parsed.success) return setError(translateValidation(t, parsed.error.issues[0]?.message));
    setSaving(true);
    const problem = await onSave(parsed.data.body);
    setSaving(false);
    setError(problem || null);
  };

  return (
    <div className='flex flex-col gap-2'>
      <MarkdownEditor value={body} onChange={setBody} invalid={!!error} autoFocus />
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      <div className='flex justify-end gap-2'>
        <Button variant='outline' size='sm' onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button size='sm' onClick={() => void save()} disabled={saving}>
          {saving ? t.common.saving : t.common.save}
        </Button>
      </div>
    </div>
  );
}

function ReplyBox({
  topicId,
  replyTo,
  onCancelReply,
  onTyping,
  onPosted,
}: {
  topicId: string;
  replyTo: { id: string; name: string } | null;
  onCancelReply: () => void;
  /** Called on every keystroke (throttled by the caller). */
  onTyping: () => void;
  onPosted: (id: string) => void;
}) {
  const { t } = useI18n();
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const post = async () => {
    const parsed = commentFormSchema.safeParse({ body });
    if (!parsed.success) return setError(translateValidation(t, parsed.error.issues[0]?.message));
    setPosting(true);
    const result = await createComment(topicId, parsed.data.body, replyTo?.id ?? null);
    setPosting(false);
    if (!result.success) return setError(result.message);
    setBody('');
    setError(null);
    onPosted(result.id);
  };

  return (
    <Card id='reply-box' className='scroll-mt-20 gap-3 px-4'>
      {replyTo && (
        <div className='flex items-center gap-2 self-start rounded-md bg-muted px-2 py-1 text-xs'>
          <CornerDownRightIcon className='size-3' />
          {fmt(t.forum.replyingTo, { name: replyTo.name })}
          <button
            type='button'
            onClick={onCancelReply}
            className='rounded text-muted-foreground hover:text-foreground'
            aria-label={t.forum.cancelReply}
          >
            <XIcon className='size-3.5' />
          </button>
        </div>
      )}
      <MarkdownEditor
        value={body}
        onChange={(v) => {
          setBody(v);
          if (v.trim()) onTyping();
          if (error) setError(null);
        }}
        placeholder={t.forum.writeReply}
        invalid={!!error}
      />
      {error && (
        <p role='alert' className='text-sm text-destructive'>
          {error}
        </p>
      )}
      <div className='flex justify-end'>
        <Button onClick={() => void post()} disabled={posting}>
          <ReplyIcon /> {posting ? t.forum.posting : t.forum.postReply}
        </Button>
      </div>
    </Card>
  );
}

/** Small avatars of the other people looking at this topic right now. */
function ViewersBar({ viewers }: { viewers: Viewer[] }) {
  const { t } = useI18n();
  if (viewers.length === 0) return null;
  const shown = viewers.slice(0, 5);
  const names = viewers.map((v) => v.name).join(', ');
  return (
    <div className='flex items-center gap-2 text-xs text-muted-foreground' title={names}>
      <span className='relative flex size-2' aria-hidden>
        <span className='absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:hidden' />
        <span className='relative inline-flex size-2 rounded-full bg-emerald-500' />
      </span>
      <span>{t.forum.alsoHere}</span>
      <span className='flex -space-x-1.5' aria-hidden>
        {shown.map((v) => (
          <PersonAvatar
            key={v.id}
            name={v.name}
            src={v.avatarUrl}
            className='size-6 text-[10px] ring-2 ring-background'
          />
        ))}
        {viewers.length > shown.length && (
          <span className='flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-medium ring-2 ring-background'>
            +{viewers.length - shown.length}
          </span>
        )}
      </span>
      <span className='sr-only'>{names}</span>
    </div>
  );
}

/** "Rakoto is typing…" under the replies. */
function TypingLine({ names }: { names: string[] }) {
  const { t } = useI18n();
  const text =
    names.length === 0
      ? ''
      : names.length === 1
        ? fmt(t.forum.typingOne, { name: names[0] })
        : names.length === 2
          ? fmt(t.forum.typingTwo, { a: names[0], b: names[1] })
          : fmt(t.forum.typingMany, { count: names.length });
  return (
    <p aria-live='polite' className='flex h-5 items-center gap-2 text-xs text-muted-foreground'>
      {text && (
        <>
          <span className='flex gap-0.5' aria-hidden>
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className='size-1 animate-bounce rounded-full bg-muted-foreground motion-reduce:animate-none'
                style={{ animationDelay: delay + 'ms' }}
              />
            ))}
          </span>
          {text}
        </>
      )}
    </p>
  );
}
