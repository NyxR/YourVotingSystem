"use client";

import { useEffect } from "react";
import {
  Controller,
  useForm,
  type Control,
  type FieldValues,
  type Path,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
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
import { ROLES, type Role } from "@/lib/roles";
import { MEMBER_TYPE_LABELS, MEMBER_TYPES } from "@/lib/member-types";
import { formatPhone, isValidPhone } from "@/lib/phone";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  ALWAYS_RESPONSIBILITY,
  RESPONSIBILITIES,
  RESPONSIBILITY_LABELS,
  type Responsibility,
} from "@/lib/responsibilities";
import { fmt } from "@/i18n/config";
import { useI18n } from "@/i18n/client";
import { tErrors } from "@/i18n/validation";
import { inviteUser, updateUser } from "../actions/user.actions";
import {
  inviteUserSchema,
  updateUserSchema,
  type TInviteUser,
  type TUpdateUser,
  type UserRow,
} from "../schemas/user.schema";

function RoleField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: Path<T>;
}) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="user-role">{t.users.role}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {t.roles[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {t.roleDescriptions[field.value as Role]}
          </FieldDescription>
        </Field>
      )}
    />
  );
}

/** Any combination of responsibilities (checkboxes). Informational only. */
export function ResponsibilitiesField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: Path<T>;
}) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const value = (field.value ?? []) as Responsibility[];
        const toggle = (r: Responsibility, on: boolean) =>
          field.onChange(on ? [...value, r] : value.filter((v) => v !== r));
        return (
          <Field>
            <FieldLabel>{t.users.responsibilities}</FieldLabel>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {RESPONSIBILITIES.map((r) => {
                const locked = r === ALWAYS_RESPONSIBILITY;
                return (
                  <div
                    key={r}
                    className="flex items-center gap-2"
                    title={locked ? t.users.alwaysResponsibility : undefined}
                  >
                    <Checkbox
                      id={`resp-${r}`}
                      checked={locked || value.includes(r)}
                      disabled={locked}
                      onCheckedChange={(on) => toggle(r, on === true)}
                    />
                    <Label htmlFor={`resp-${r}`} className="font-normal">
                      {RESPONSIBILITY_LABELS[r]}
                    </Label>
                  </div>
                );
              })}
            </div>
            <FieldDescription>
              {t.users.alwaysResponsibility} {t.users.responsibilitiesHint}
            </FieldDescription>
          </Field>
        );
      }}
    />
  );
}

/** Optional contact number; tidied to "(506) 555-1234" when the field loses focus. */
export function PhoneField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: Path<T>;
}) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="user-phone">
            {t.users.phone}{" "}
            <span className="text-muted-foreground">{t.common.optional}</span>
          </FieldLabel>
          <Input
            {...field}
            id="user-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t.users.phonePlaceholder}
            aria-invalid={fieldState.invalid}
            onBlur={(e) => {
              if (isValidPhone(e.target.value))
                field.onChange(formatPhone(e.target.value));
              field.onBlur();
            }}
          />
          {fieldState.invalid && (
            <FieldError errors={tErrors(t, fieldState.error)} />
          )}
        </Field>
      )}
    />
  );
}

function MemberTypeField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: Path<T>;
}) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Field>
          <FieldLabel htmlFor="user-member-type">
            {t.users.memberType}
          </FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="user-member-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEMBER_TYPES.map((m) => (
                <SelectItem key={m} value={m}>
                  {MEMBER_TYPE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )}
    />
  );
}

function NameField<T extends FieldValues>({
  control,
  name,
}: {
  control: Control<T>;
  name: Path<T>;
}) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="user-name">{t.users.fullName}</FieldLabel>
          <Input
            {...field}
            id="user-name"
            autoComplete="off"
            aria-invalid={fieldState.invalid}
          />
          {fieldState.invalid && (
            <FieldError errors={tErrors(t, fieldState.error)} />
          )}
        </Field>
      )}
    />
  );
}

export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const form = useForm<TInviteUser>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      username: "",
      email: "",
      role: "viewer",
      memberType: "MPANDRAY",
      phone: "",
      responsibilities: ["MPIARA_MIVAVAKA"],
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        username: "",
        email: "",
        role: "viewer",
        memberType: "MPANDRAY",
        phone: "",
        responsibilities: ["MPIARA_MIVAVAKA"],
      });
    }
  }, [open, form]);

  const onSubmit = async (values: TInviteUser) => {
    const result = await inviteUser(values);
    if (result.success) {
      toast.success(fmt(t.users.inviteSent, { email: values.email }));
      onOpenChange(false);
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.users.inviteTitle}</DialogTitle>
          <DialogDescription>{t.users.inviteDescription}</DialogDescription>
        </DialogHeader>
        <form id="invite-user-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <NameField control={form.control} name="username" />
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="user-email">{t.users.email}</FieldLabel>
                  <Input
                    {...field}
                    id="user-email"
                    type="email"
                    placeholder={t.users.emailPlaceholder}
                    autoComplete="off"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && (
                    <FieldError errors={tErrors(t, fieldState.error)} />
                  )}
                </Field>
              )}
            />
            <MemberTypeField control={form.control} name="memberType" />
            <ResponsibilitiesField
              control={form.control}
              name="responsibilities"
            />
            <PhoneField control={form.control} name="phone" />
            <RoleField control={form.control} name="role" />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t.common.cancel}</Button>
          </DialogClose>
          <Button
            type="submit"
            form="invite-user-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? t.auth.sending
              : t.users.sendInvitation}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function EditUserDialog({
  user,
  onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const form = useForm<TUpdateUser>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      username: "",
      role: "viewer",
      memberType: "MPANDRAY",
      phone: "",
      responsibilities: [],
    },
  });

  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username,
        role: user.role,
        memberType: user.memberType,
        phone: user.phone ? formatPhone(user.phone) : "",
        responsibilities: user.responsibilities,
      });
    }
  }, [user, form]);

  const onSubmit = async (values: TUpdateUser) => {
    if (!user) return;
    const result = await updateUser(user.id, values);
    if (result.success) {
      toast.success(t.users.updated);
      onClose();
    } else {
      toast.error(result.message);
    }
  };

  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.users.editTitle}</DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>
        <form id="edit-user-form" onSubmit={form.handleSubmit(onSubmit)}>
          <FieldGroup>
            <NameField control={form.control} name="username" />
            <MemberTypeField control={form.control} name="memberType" />
            <ResponsibilitiesField
              control={form.control}
              name="responsibilities"
            />
            <PhoneField control={form.control} name="phone" />
            <RoleField control={form.control} name="role" />
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">{t.common.cancel}</Button>
          </DialogClose>
          <Button
            type="submit"
            form="edit-user-form"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting
              ? t.common.saving
              : t.common.saveChanges}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
