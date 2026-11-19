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
import { centsToDecimal } from "@/lib/money";
import { todayISO } from "@/lib/dates";
import { saveTransaction } from "../actions/transactions.actions";
import {
  NO_CATEGORY,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  RECEIPT_ACCEPT,
  transactionFormSchema,
  validateReceipt,
  type CategoryOption,
  type TransactionFormValues,
  type TransactionRow,
} from "../schemas";

function defaultsFor(t?: TransactionRow): TransactionFormValues {
  return t
    ? {
        type: t.type,
        date: t.date,
        amount: centsToDecimal(t.amountCents),
        description: t.description,
        categoryId: t.categoryId ?? NO_CATEGORY,
        paymentMethod: t.paymentMethod,
        reference: t.reference ?? "",
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
  const isEdit = !!transaction;
  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: defaultsFor(transaction),
  });
  const [receipt, setReceipt] = useState<File | null>(null);
  const [receiptError, setReceiptError] = useState<string | null>(null);
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
      toast.success(isEdit ? "Transaction updated" : "Transaction added");
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
          {isEdit ? "Edit transaction" : "New transaction"}
        </DialogTitle>
        <DialogDescription>
          Record money coming in or going out of the organization. Amounts are
          in Canadian dollars.
        </DialogDescription>
      </DialogHeader>

      <form id="transaction-form" onSubmit={form.handleSubmit(onSubmit)}>
        <FieldGroup className="gap-5">
          <Controller
            control={form.control}
            name="type"
            render={({ field }) => (
              <Field>
                <FieldLabel>Type</FieldLabel>
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
                    Money in
                  </ToggleGroupItem>
                  <ToggleGroupItem value="EXPENSE" className={TYPE_TOGGLE_CLASS.EXPENSE}>
                    Money out
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
                  <FieldLabel htmlFor="tx-amount">Amount (CAD)</FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">
                      $
                    </span>
                    <Input
                      {...field}
                      id="tx-amount"
                      inputMode="decimal"
                      placeholder="0.00"
                      className="pl-6 tabular-nums"
                      aria-invalid={fieldState.invalid}
                      autoComplete="off"
                    />
                  </div>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />
            <Controller
              control={form.control}
              name="date"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="tx-date">Date</FieldLabel>
                  <Input
                    {...field}
                    id="tx-date"
                    type="date"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
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
                <FieldLabel htmlFor="tx-description">Description</FieldLabel>
                <Input
                  {...field}
                  id="tx-description"
                  placeholder={
                    type === "INCOME"
                      ? "e.g. Sunday collection"
                      : "e.g. Hall rental for November"
                  }
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
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
                  <FieldLabel htmlFor="tx-category">Category</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tx-category" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CATEGORY}>Uncategorized</SelectItem>
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
                  <FieldLabel htmlFor="tx-method">Payment method</FieldLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tx-method" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m} value={m}>
                          {PAYMENT_METHOD_LABELS[m]}
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
                  Reference{" "}
                  <span className="text-muted-foreground">(optional)</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="tx-reference"
                  placeholder="Cheque #, e-Transfer ID, invoice #…"
                  aria-invalid={fieldState.invalid}
                  autoComplete="off"
                />
                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />

          <Field data-invalid={!!receiptError}>
            <FieldLabel htmlFor="tx-receipt">
              Receipt <span className="text-muted-foreground">(optional)</span>
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
                  Current receipt
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-7"
                  onClick={() => setRemoveReceipt(true)}
                >
                  <XIcon /> Remove
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
              <FieldError>{receiptError}</FieldError>
            ) : (
              <FieldDescription>
                JPG, PNG, WebP or PDF, up to 5 MB.
                {hasExistingReceipt &&
                  " Choosing a file replaces the current receipt."}
                {removeReceipt &&
                  " The current receipt will be removed when you save."}
              </FieldDescription>
            )}
          </Field>
        </FieldGroup>
      </form>

      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button
          type="submit"
          form="transaction-form"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting
            ? "Saving…"
            : isEdit
              ? "Save changes"
              : "Add transaction"}
        </Button>
      </DialogFooter>
    </>
  );
}
