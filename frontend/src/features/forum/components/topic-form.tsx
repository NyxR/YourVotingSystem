'use client';

import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n/client';
import { tErrors } from '@/i18n/validation';
import { cn } from '@/lib/utils';
import { COLOR_DOT } from '../colors';
import {
  TITLE_MAX,
  topicFormSchema,
  type ForumCategoryItem,
  type TopicFormValues,
} from '../schemas';
import { MarkdownEditor } from './markdown-editor';

/** Category + title + body. Used for new topics and for editing one. */
export function TopicForm({
  categories,
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  categories: ForumCategoryItem[];
  defaultValues: TopicFormValues;
  submitLabel: string;
  /** Returns an error message to show, or nothing on success. */
  onSubmit: (values: TopicFormValues) => Promise<string | void>;
  onCancel: () => void;
}) {
  const { t } = useI18n();
  const form = useForm<TopicFormValues>({
    resolver: zodResolver(topicFormSchema),
    defaultValues,
  });

  const submit = async (values: TopicFormValues) => {
    const error = await onSubmit(values);
    if (error) form.setError('root', { message: error });
  };

  return (
    <form onSubmit={form.handleSubmit(submit)} className='flex flex-col gap-4'>
      <FieldGroup>
        <Controller
          control={form.control}
          name='categoryId'
          render={({ field, fieldState }) => {
            const selected = categories.find((c) => c.id === field.value);
            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='topic-category'>{t.forum.category}</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger
                    id='topic-category'
                    className='w-full sm:w-72'
                    aria-invalid={fieldState.invalid}
                  >
                    <SelectValue placeholder={t.forum.chooseCategory} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span
                          className={cn('size-2 rounded-full', COLOR_DOT[c.color])}
                          aria-hidden
                        />
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selected && (
                  <FieldDescription>{t.forum.visibilityHint[selected.visibility]}</FieldDescription>
                )}
                {fieldState.invalid && <FieldError errors={tErrors(t, fieldState.error)} />}
              </Field>
            );
          }}
        />
        <Controller
          control={form.control}
          name='title'
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='topic-title'>{t.forum.title}</FieldLabel>
              <Input
                {...field}
                id='topic-title'
                maxLength={TITLE_MAX}
                autoComplete='off'
                placeholder={t.forum.titlePlaceholder}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={tErrors(t, fieldState.error)} />}
            </Field>
          )}
        />
        <Controller
          control={form.control}
          name='body'
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor='topic-body'>{t.forum.body}</FieldLabel>
              <MarkdownEditor
                id='topic-body'
                value={field.value}
                onChange={field.onChange}
                placeholder={t.forum.bodyPlaceholder}
                invalid={fieldState.invalid}
                minHeight='min-h-48'
              />
              {fieldState.invalid && <FieldError errors={tErrors(t, fieldState.error)} />}
            </Field>
          )}
        />
      </FieldGroup>
      {form.formState.errors.root && (
        <p role='alert' className='text-sm text-destructive'>
          {form.formState.errors.root.message}
        </p>
      )}
      <div className='flex justify-end gap-2'>
        <Button type='button' variant='outline' onClick={onCancel}>
          {t.common.cancel}
        </Button>
        <Button type='submit' disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? t.common.saving : submitLabel}
        </Button>
      </div>
    </form>
  );
}
