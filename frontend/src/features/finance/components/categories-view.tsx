'use client';

import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
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
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { TYPE_TOGGLE_CLASS } from './type-toggle-styles';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { fmt } from '@/i18n/config';
import { useI18n } from '@/i18n/client';
import { tErrors } from '@/i18n/validation';
import {
  createCategory,
  deleteCategory,
  renameCategory,
} from '../actions/categories.actions';
import {
  categoryFormSchema,
  type CategoryFormValues,
  type CategoryRow,
  type TransactionType,
} from '../schemas';

export function CategoriesView({
  categories,
  canEdit,
}: {
  categories: CategoryRow[];
  canEdit: boolean;
}) {
  const [formState, setFormState] = useState<
    { mode: 'create'; type: TransactionType } | { mode: 'rename'; category: CategoryRow } | null
  >(null);
  const { t } = useI18n();
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  const sections: { type: TransactionType; title: string; description: string }[] = [
    {
      type: 'INCOME',
      title: t.categories.incomeTitle,
      description: t.categories.incomeDescription,
    },
    {
      type: 'EXPENSE',
      title: t.categories.expenseTitle,
      description: t.categories.expenseDescription,
    },
  ];

  return (
    <div className='grid gap-4 px-4 lg:px-6 @3xl/main:grid-cols-2'>
      {sections.map((s) => {
        const list = categories.filter((c) => c.type === s.type);
        return (
          <Card key={s.type}>
            <CardHeader>
              <CardTitle>{s.title}</CardTitle>
              <CardDescription>{s.description}</CardDescription>
              {canEdit && (
                <CardAction>
                  <Button
                    size='sm'
                    variant='outline'
                    onClick={() => setFormState({ mode: 'create', type: s.type })}
                  >
                    <PlusIcon /> {t.common.add}
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {list.length === 0 ? (
                <p className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
                  {t.categories.empty}
                </p>
              ) : (
                <ul className='divide-y rounded-md border'>
                  {list.map((c) => (
                    <li key={c.id} className='flex items-center gap-2 px-3 py-2'>
                      <span className='flex-1 truncate font-medium'>{c.name}</span>
                      <span className='text-sm text-muted-foreground tabular-nums'>
                        {fmt(t.categories.transactionCount, { count: c.transactionCount })}
                      </span>
                      {canEdit && (
                        <>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8'
                            onClick={() => setFormState({ mode: 'rename', category: c })}
                          >
                            <PencilIcon />
                            <span className='sr-only'>{fmt(t.categories.rename, { name: c.name })}</span>
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8 text-muted-foreground hover:text-destructive'
                            onClick={() => setDeleting(c)}
                          >
                            <Trash2Icon />
                            <span className='sr-only'>{fmt(t.categories.deleteName, { name: c.name })}</span>
                          </Button>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        );
      })}

      {canEdit && (
        <>
          <CategoryFormDialog state={formState} onClose={() => setFormState(null)} />
          <ConfirmDialog
            open={!!deleting}
            onOpenChange={(o) => !o && setDeleting(null)}
            title={fmt(t.categories.deleteTitle, { name: deleting?.name ?? '' })}
            description={
              deleting?.transactionCount
                ? fmt(t.categories.deleteUsed, { count: deleting.transactionCount })
                : t.categories.deleteUnused
            }
            onConfirm={async () => {
              if (!deleting) return;
              const result = await deleteCategory(deleting.id);
              if (result.success) toast.success(t.categories.deleted);
              else {
                toast.error(result.message);
                return false;
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function CategoryFormDialog({
  state,
  onClose,
}: {
  state: { mode: 'create'; type: TransactionType } | { mode: 'rename'; category: CategoryRow } | null;
  onClose: () => void;
}) {
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: { name: '', type: 'EXPENSE' },
  });

  useEffect(() => {
    if (!state) return;
    form.reset(
      state.mode === 'create'
        ? { name: '', type: state.type }
        : { name: state.category.name, type: state.category.type },
    );
  }, [state, form]);

  const { t } = useI18n();
  const isRename = state?.mode === 'rename';

  const onSubmit = async (values: CategoryFormValues) => {
    const result =
      state?.mode === 'rename'
        ? await renameCategory(state.category.id, values.name)
        : await createCategory(values);
    if (result.success) {
      toast.success(isRename ? t.categories.renamed : t.categories.added);
      onClose();
    } else {
      form.setError('name', { message: result.message });
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>{isRename ? t.categories.renameTitle : t.categories.newTitle}</DialogTitle>
          <DialogDescription>
            {isRename
              ? t.categories.renameDescription
              : t.categories.newDescription}
          </DialogDescription>
        </DialogHeader>
        <form id='category-form' onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            {!isRename && (
              <Controller
                control={form.control}
                name='type'
                render={({ field }) => (
                  <Field>
                    <FieldLabel>{t.categories.type}</FieldLabel>
                    <ToggleGroup
                      type='single'
                      variant='outline'
                      className='w-full *:flex-1'
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                    >
                      <ToggleGroupItem value='INCOME' className={TYPE_TOGGLE_CLASS.INCOME}>
                        {t.types.INCOME}
                      </ToggleGroupItem>
                      <ToggleGroupItem value='EXPENSE' className={TYPE_TOGGLE_CLASS.EXPENSE}>
                        {t.types.EXPENSE}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </Field>
                )}
              />
            )}
            <Controller
              control={form.control}
              name='name'
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor='category-name'>{t.categories.name}</FieldLabel>
                  <Input
                    {...field}
                    id='category-name'
                    autoComplete='off'
                    autoFocus
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={tErrors(t, fieldState.error)} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>{t.common.cancel}</Button>
          </DialogClose>
          <Button type='submit' form='category-form' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? t.common.saving
              : isRename
                ? t.common.save
                : t.categories.addCategory}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
