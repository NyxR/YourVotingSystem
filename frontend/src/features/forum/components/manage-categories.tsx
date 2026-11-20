'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { tErrors } from '@/i18n/validation';
import { cn } from '@/lib/utils';
import { FORUM_VISIBILITIES } from '../access';
import { COLOR_DOT, FORUM_COLORS } from '../colors';
import {
  deleteForumCategory,
  moveForumCategory,
  saveForumCategory,
} from '../actions/forum.actions';
import {
  forumCategorySchema,
  type ForumCategoryFormValues,
  type ForumCategoryItem,
} from '../schemas';
import { CategoryBadge } from './forum-bits';

type FormState = { mode: 'create' } | { mode: 'edit'; category: ForumCategoryItem } | null;

export function ManageCategories({ categories }: { categories: ForumCategoryItem[] }) {
  const { t } = useI18n();
  const [formState, setFormState] = useState<FormState>(null);
  const [deleting, setDeleting] = useState<ForumCategoryItem | null>(null);
  const [moving, setMoving] = useState<string | null>(null);

  const move = async (id: string, direction: -1 | 1) => {
    setMoving(id);
    const result = await moveForumCategory(id, direction);
    setMoving(null);
    if (!result.success) toast.error(result.message);
  };

  return (
    <div className='mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 lg:px-6'>
      <Button asChild variant='ghost' size='sm' className='self-start'>
        <Link href='/main/forum'>
          <ArrowLeftIcon /> {t.forum.backToForum}
        </Link>
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>{t.forum.cat.title}</CardTitle>
          <CardDescription>{t.forum.cat.description}</CardDescription>
          <CardAction>
            <Button size='sm' onClick={() => setFormState({ mode: 'create' })}>
              <PlusIcon /> {t.forum.cat.add}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <p className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
              {t.forum.cat.empty}
            </p>
          ) : (
            <ul className='divide-y rounded-md border'>
              {categories.map((c, i) => (
                <li key={c.id} className='flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2'>
                  <div className='flex min-w-0 flex-1 flex-col gap-1'>
                    <CategoryBadge category={c} className='self-start text-sm' />
                    <span className='text-xs text-muted-foreground'>
                      {t.forum.visibility[c.visibility]} ·{' '}
                      {fmt(t.forum.topicCount, { count: c.topicCount })}
                      {c.description && ` · ${c.description}`}
                    </span>
                  </div>
                  <div className='flex items-center'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8'
                      disabled={i === 0 || moving !== null}
                      onClick={() => void move(c.id, -1)}
                      title={t.forum.cat.moveUp}
                    >
                      <ArrowUpIcon />
                      <span className='sr-only'>{t.forum.cat.moveUp}</span>
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8'
                      disabled={i === categories.length - 1 || moving !== null}
                      onClick={() => void move(c.id, 1)}
                      title={t.forum.cat.moveDown}
                    >
                      <ArrowDownIcon />
                      <span className='sr-only'>{t.forum.cat.moveDown}</span>
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8'
                      onClick={() => setFormState({ mode: 'edit', category: c })}
                      title={t.common.edit}
                    >
                      <PencilIcon />
                      <span className='sr-only'>{fmt(t.categories.rename, { name: c.name })}</span>
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='size-8 text-muted-foreground hover:text-destructive'
                      disabled={c.topicCount > 0}
                      title={c.topicCount > 0 ? t.forum.cat.cannotDelete : t.common.delete}
                      onClick={() => setDeleting(c)}
                    >
                      <Trash2Icon />
                      <span className='sr-only'>
                        {fmt(t.categories.deleteName, { name: c.name })}
                      </span>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CategoryDialog state={formState} onClose={() => setFormState(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={fmt(t.categories.deleteTitle, { name: deleting?.name ?? '' })}
        description={t.forum.cat.deleteDescription}
        confirmLabel={t.common.delete}
        onConfirm={async () => {
          if (!deleting) return;
          const result = await deleteForumCategory(deleting.id);
          if (!result.success) {
            toast.error(result.message);
            return false;
          }
          toast.success(t.forum.cat.deleted);
        }}
      />
    </div>
  );
}

function CategoryDialog({ state, onClose }: { state: FormState; onClose: () => void }) {
  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-md'>
        {/* Mounted per opening so the form starts from the right values. */}
        {state && <CategoryForm state={state} onClose={onClose} />}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({ state, onClose }: { state: NonNullable<FormState>; onClose: () => void }) {
  const { t } = useI18n();
  const editing = state.mode === 'edit' ? state.category : null;
  const form = useForm<ForumCategoryFormValues>({
    resolver: zodResolver(forumCategorySchema),
    defaultValues: {
      name: editing?.name ?? '',
      description: editing?.description ?? '',
      color: editing?.color ?? 'blue',
      visibility: editing?.visibility ?? 'EVERYONE',
    },
  });

  const onSubmit = async (values: ForumCategoryFormValues) => {
    const result = await saveForumCategory(editing?.id ?? null, values);
    if (!result.success) return form.setError('name', { message: result.message });
    toast.success(editing ? t.forum.cat.saved : t.forum.cat.added);
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{editing ? t.forum.cat.edit : t.forum.cat.add}</DialogTitle>
        <DialogDescription>{t.forum.cat.description}</DialogDescription>
      </DialogHeader>
      <form id='forum-category-form' onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup>
          <Controller
            control={form.control}
            name='name'
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='forum-category-name'>{t.forum.cat.name}</FieldLabel>
                <Input
                  {...field}
                  id='forum-category-name'
                  autoComplete='off'
                  autoFocus
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={tErrors(t, fieldState.error)} />}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name='description'
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='forum-category-description'>
                  {t.forum.cat.descriptionLabel}{' '}
                  <span className='font-normal text-muted-foreground'>{t.common.optional}</span>
                </FieldLabel>
                <Input
                  {...field}
                  id='forum-category-description'
                  autoComplete='off'
                  placeholder={t.forum.cat.descriptionPlaceholder}
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={tErrors(t, fieldState.error)} />}
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name='visibility'
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor='forum-category-visibility'>
                  {t.forum.cat.visibility}
                </FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='forum-category-visibility' className='w-full'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORUM_VISIBILITIES.map((v) => (
                      <SelectItem key={v} value={v}>
                        {t.forum.visibility[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FieldDescription>{t.forum.visibilityHint[field.value]}</FieldDescription>
              </Field>
            )}
          />
          <Controller
            control={form.control}
            name='color'
            render={({ field }) => (
              <Field>
                <FieldLabel id='forum-category-color'>{t.forum.cat.color}</FieldLabel>
                <div
                  role='radiogroup'
                  aria-labelledby='forum-category-color'
                  className='flex flex-wrap gap-2'
                >
                  {FORUM_COLORS.map((c) => (
                    <button
                      key={c}
                      type='button'
                      role='radio'
                      aria-checked={field.value === c}
                      aria-label={t.forum.colors[c]}
                      title={t.forum.colors[c]}
                      onClick={() => field.onChange(c)}
                      className={cn(
                        'size-7 rounded-full ring-offset-2 ring-offset-background transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        COLOR_DOT[c],
                        field.value === c && 'ring-2 ring-foreground',
                      )}
                    />
                  ))}
                </div>
              </Field>
            )}
          />
        </FieldGroup>
      </form>
      <DialogFooter>
        <DialogClose asChild>
          <Button variant='outline'>{t.common.cancel}</Button>
        </DialogClose>
        <Button type='submit' form='forum-category-form' disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting
            ? t.common.saving
            : editing
              ? t.common.save
              : t.forum.cat.add}
        </Button>
      </DialogFooter>
    </>
  );
}
