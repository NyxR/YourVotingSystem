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
  const [deleting, setDeleting] = useState<CategoryRow | null>(null);

  const sections: { type: TransactionType; title: string; description: string }[] = [
    {
      type: 'INCOME',
      title: 'Income categories',
      description: 'Where money comes from: donations, dues, grants…',
    },
    {
      type: 'EXPENSE',
      title: 'Expense categories',
      description: 'Where money goes: rent, supplies, salaries…',
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
                    <PlusIcon /> Add
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent>
              {list.length === 0 ? (
                <p className='rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground'>
                  No categories yet.
                </p>
              ) : (
                <ul className='divide-y rounded-md border'>
                  {list.map((c) => (
                    <li key={c.id} className='flex items-center gap-2 px-3 py-2'>
                      <span className='flex-1 truncate font-medium'>{c.name}</span>
                      <span className='text-sm text-muted-foreground tabular-nums'>
                        {c.transactionCount} transaction{c.transactionCount === 1 ? '' : 's'}
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
                            <span className='sr-only'>Rename {c.name}</span>
                          </Button>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='size-8 text-muted-foreground hover:text-destructive'
                            onClick={() => setDeleting(c)}
                          >
                            <Trash2Icon />
                            <span className='sr-only'>Delete {c.name}</span>
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
            title={`Delete “${deleting?.name}”?`}
            description={
              deleting?.transactionCount
                ? `${deleting.transactionCount} transaction(s) use this category. They will be kept but become uncategorized.`
                : 'No transactions use this category.'
            }
            onConfirm={async () => {
              if (!deleting) return;
              const result = await deleteCategory(deleting.id);
              if (result.success) toast.success('Category deleted');
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

  const isRename = state?.mode === 'rename';

  const onSubmit = async (values: CategoryFormValues) => {
    const result =
      state?.mode === 'rename'
        ? await renameCategory(state.category.id, values.name)
        : await createCategory(values);
    if (result.success) {
      toast.success(isRename ? 'Category renamed' : 'Category added');
      onClose();
    } else {
      form.setError('name', { message: result.message });
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className='sm:max-w-sm'>
        <DialogHeader>
          <DialogTitle>{isRename ? 'Rename category' : 'New category'}</DialogTitle>
          <DialogDescription>
            {isRename
              ? 'Existing transactions keep this category under its new name.'
              : 'Categories help you see where money comes from and goes.'}
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
                    <FieldLabel>Type</FieldLabel>
                    <ToggleGroup
                      type='single'
                      variant='outline'
                      className='w-full *:flex-1'
                      value={field.value}
                      onValueChange={(v) => v && field.onChange(v)}
                    >
                      <ToggleGroupItem value='INCOME' className={TYPE_TOGGLE_CLASS.INCOME}>
                        Income
                      </ToggleGroupItem>
                      <ToggleGroupItem value='EXPENSE' className={TYPE_TOGGLE_CLASS.EXPENSE}>
                        Expense
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
                  <FieldLabel htmlFor='category-name'>Name</FieldLabel>
                  <Input
                    {...field}
                    id='category-name'
                    autoComplete='off'
                    autoFocus
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant='outline'>Cancel</Button>
          </DialogClose>
          <Button type='submit' form='category-form' disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving…' : isRename ? 'Save' : 'Add category'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
