"use client";

import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { PaperclipIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TYPE_TOGGLE_CLASS } from "./type-toggle-styles";
import { centsToInput } from "@/lib/money";
import { useI18n } from "@/i18n/client";
import { tErrors, type ValidationKey } from "@/i18n/validation";
import { todayISO } from "@/lib/dates";
import { saveTransaction } from "../actions/transactions.actions";
import {
  NO_CATEGORY,
  PAYMENT_METHODS,
  RECEIPT_ACCEPT,
  transactionFormSchema,
  validateReceipt,
  type CategoryOption,
  type TransactionFormValues,
  type TransactionRow,
} from "../schemas";

function defaultsFor(tx: TransactionRow | undefined, intl: string): TransactionFormValues {
  return tx
    ? {
        type: tx.type,
        date: tx.date,
        amount: centsToInput(tx.amountCents, intl),
        description: tx.description,
        categoryId: tx.categoryId ?? NO_CATEGORY,
        paymentMethod: tx.paymentMethod,
        reference: tx.reference ?? "",
      }
    : {
        type: "EXPENSE",
        date: todayISO(),
        amount: "",
        description: "",
        categoryId: NO_CATEGORY,
        paymentMethod: "E_TRANSFER",
        reference: "",
      };
}

export function TransactionFormDialog({
  open,
  onOpenChange,
  categories,
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: CategoryOption[];
  /** When set, the dialog edits this transaction instead of creating one. */
  transaction?: TransactionRow;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-lg">
        {/* DialogContent unmounts when closed, so the form starts fresh on every open. */}
        <TransactionForm
          categories={categories}
          transaction={transaction}
          onDone={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  categories,
  transaction,
  onDone,
}: {
  categories: CategoryOption[];
  transaction?: TransactionRow;
  onDone: () => void;
}) {
  const { t, intl } = useI18n();
  const isEdit = !!transaction;
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultsFor(transaction, intl),
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<ValidationKey | null>(null);
  const [removeReceipt, setRemoveReceipt] = useState(false);

  const type = useWatch({ control: form.control, name: "type" });
  const categoriesForType = categories.filter((c) => c.type === type);

  const onSubmit = async (values: TransactionFormValues) => {
    if (receiptError) return;
    const fd = new FormData();
    Object.entries(values).forEach(([k, v]) => fd.append(k, v));
    if (transaction) fd.append("id", transaction.id);
    if (receipt) fd.append("receipt", receipt);
    if (removeReceipt) fd.append("removeReceipt", "true");

    const result = await saveTransaction(fd);
    if (result.success) {
      toast.success(isEdit ? t.transactions.updated : t.transactions.added);
      onDone();
    } else {
      toast.error(result.message);
    }
  };

  const hasExistingReceipt = !!transaction?.hasReceipt && !removeReceipt;

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? t.transactions.editTransaction : t.transactions.newTransaction}
        </DialogTitle>
        <DialogDescription>
          {t.transactions.formDescription}
        </DialogDescription>
      </DialogHeader>

      <form id="transaction-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Field>
                <FieldLabel>{t.transactions.type}</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  className="w-full *:flex-1"
                  value={field.value}
                  onValueChange={(v) => {
                    if (!v) return;
                    field.onChange(v);
                    // A category only applies to one type.
                    const current = form.getValues("categoryId");
                    if (
                      !categories.some((c) => c.id === current && c.type === v)
                    ) {
                      form.setValue("categoryId", NO_CATEGORY);
                    }
                  }}
                >
                  <ToggleGroupItem value="INCOME" className={TYPE_TOGGLE_CLASS.INCOME}>
                    {t.transactions.moneyIn}
                  </ToggleGroupItem>
                  <ToggleGroupItem value="EXPENSE" className={TYPE_TOGGLE_CLASS.EXPENSE}>
                    {t.transactions.moneyOut}
                  </ToggleGroupItem>
                </ToggleGroup>
              </Field>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="amount"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="tx-amount">{t.transactions.amount}</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      {...field}
                      id="tx-amount"
                      inputMode="decimal"
                      placeholder={intl.startsWith("fr") ? "0,00" : "0.00"}
                      className="pl-6 tabular-nums"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                    />
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={tErrors(t, fieldState.error)} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="date"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="tx-date">{t.transactions.date}</FieldLabel>
                  <Input
                    {...field}
                    id="tx-date"
                    type="date"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={tErrors(t, fieldState.error)} />
                  )}
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="description"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tx-description">{t.transactions.description}</FieldLabel>
                <Input
                  {...field}
                  id="tx-description"
                  placeholder={
                    type === "INCOME"
                      ? t.transactions.descriptionIncomePlaceholder
                      : t.transactions.descriptionExpensePlaceholder
                  }
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={tErrors(t, fieldState.error)} />
                )}
              </Field>
            )}
          />

          <div className="grid gap-5 sm:grid-cols-2">
            <Controller
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="tx-category">{t.transactions.category}</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tx-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>{t.common.uncategorized}</SelectItem>
                      {categoriesForType.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="tx-method">{t.transactions.paymentMethod}</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tx-method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {t.paymentMethods[m]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />
          </div>

          <Controller
            control={form.control}
            name="reference"
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="tx-reference">
                  {t.transactions.reference}{" "}
                  <span className="text-muted-foreground">{t.common.optional}</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="tx-reference"
                  placeholder={t.transactions.referencePlaceholder}
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={tErrors(t, fieldState.error)} />
                )}
              </Field>
            )}
          />

          <Field data-invalid={!!receiptError}>
            <FieldLabel htmlFor="tx-receipt">
              {t.transactions.receipt}{" "}
              <span className="text-muted-foreground">{t.common.optional}</span>
            </FieldLabel>
            {hasExistingReceipt && !receipt && (
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                <PaperclipIcon className="size-4 text-muted-foreground" />
                <a
                  href={`/main/transactions/${transaction!.id}/receipt`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline-offset-4 hover:underline"
                >
                  {t.transactions.currentReceipt}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={() => setRemoveReceipt(true)}
                >
                  <XIcon /> {t.transactions.remove}
                </Button>
              </div>
            )}
            <Input
              id="tx-receipt"
              type="file"
              accept={RECEIPT_ACCEPT}
              aria-invalid={!!receiptError}
              onChange={(e) => {
                const file = e.target.files?.[0] ?? null;
                setReceipt(file);
                setReceiptError(file ? validateReceipt(file) : null);
              }}
            />
            {receiptError ? (
              <FieldError>{t.validation[receiptError]}</FieldError>
            ) : (
              <FieldDescription>
                {t.transactions.receiptHint}
                {hasExistingReceipt && t.transactions.receiptReplaceHint}
                {removeReceipt && t.transactions.receiptRemoveHint}
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">{t.common.cancel}</Button>
        </DialogClose>
        <Button
          type="submit"
          form="transaction-form"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? t.common.saving
            : isEdit
              ? t.common.saveChanges
              : t.transactions.addTransaction}
        </Button>
      </DialogFooter>
    </>
  );
}
