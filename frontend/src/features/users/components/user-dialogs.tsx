"use client";

import { useEffect } from "react";
import {
  Controller,
  useForm,
  useWatch,
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
import { isManager, ROLES, type Role } from "@/lib/roles";
import {
  MEMBER_TYPE_LABELS,
  MEMBER_TYPES,
  type MemberType,
} from "@/lib/member-types";
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
  birao,
}: {
  control: Control<T>;
  name: Path<T>;
  /** Whether Birao is ticked; Admin and Treasurer need it. */
  birao: boolean;
}) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor="user-role">{t.users.role}</FieldLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="user-role" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem
                  key={r}
                  value={r}
                  disabled={!birao && isManager(r) && r !== field.value}
                >
                  {t.roles[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldDescription>
            {t.roleDescriptions[field.value as Role]}
            {!birao && <> {t.users.managerNeedsBiraoHint}</>}
          </FieldDescription>
          {fieldState.invalid && (
            <FieldError errors={tErrors(t, fieldState.error)} />
          )}
        </Field>
      )}
    />
  );
}

/** My profile: the user's responsibilities, shown but not editable. */
export function ResponsibilitiesReadOnly({ value }: { value: Responsibility[] }) {
  const { t } = useI18n();
  return (
    <Field data-disabled>
      <FieldLabel>{t.users.responsibilities}</FieldLabel>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {RESPONSIBILITIES.map((r) => (
          <div key={r} className="flex items-center gap-2">
            <Checkbox
              id={`my-resp-${r}`}
              checked={r === ALWAYS_RESPONSIBILITY || value.includes(r)}
              disabled
            />
            <Label htmlFor={`my-resp-${r}`} className="font-normal">
              {RESPONSIBILITY_LABELS[r]}
            </Label>
          </div>
        ))}
      </div>
      <FieldDescription>{t.users.responsibilitiesAdminOnly}</FieldDescription>
    </Field>
  );
}

/**
 * Responsibilities (checkboxes), following the ladder Mpandray → Diakona →
 * Birao: a step can only be ticked once the one below holds, and can't be
 * unticked while the one above is ticked (or while the role needs Birao).
 */
export function ResponsibilitiesField<T extends FieldValues>({
  control,
  name,
  memberType,
  lockBirao = false,
}: {
  control: Control<T>;
  name: Path<T>;
  memberType: MemberType;
  /** The role is Admin/Treasurer, so Birao can't be removed. */
  lockBirao?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const value = (field.value ?? []) as Responsibility[];
        const toggle = (r: Responsibility, on: boolean) =>
          field.onChange(on ? [...value, r] : value.filter((v) => v !== r));

        /** Why this box can't be changed right now, if it can't. */
        const reason = (r: Responsibility): string | null => {
          const on = value.includes(r);
          if (r === ALWAYS_RESPONSIBILITY) return t.users.alwaysResponsibility;
          if (r === "DIAKONA") {
            if (!on && memberType !== "MPANDRAY") return t.users.diakonaNeedsMpandrayHint;
            if (on && value.includes("BIRAO")) return t.users.diakonaLockedByBirao;
          }
          if (r === "BIRAO") {
            if (!on && !value.includes("DIAKONA")) return t.users.biraoNeedsDiakonaHint;
            if (on && lockBirao) return t.users.biraoLockedByRole;
          }
          return null;
        };
        const notes = [
          ...new Set(
            RESPONSIBILITIES.filter((r) => r !== ALWAYS_RESPONSIBILITY)
              .map(reason)
              .filter((n): n is string => !!n),
          ),
        ];

        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel>{t.users.responsibilities}</FieldLabel>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {RESPONSIBILITIES.map((r) => {
                const always = r === ALWAYS_RESPONSIBILITY;
                const why = reason(r);
                return (
                  <div
                    key={r}
                    className="flex items-center gap-2"
                    title={why ?? undefined}
                  >
                    <Checkbox
                      id={`resp-${r}`}
                      checked={always || value.includes(r)}
                      disabled={!!why}
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
              {notes.map((n) => (
                <span key={n}> {n}</span>
              ))}
            </FieldDescription>
            {fieldState.invalid && (
              <FieldError errors={tErrors(t, fieldState.error)} />
            )}
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
  diakona,
}: {
  control: Control<T>;
  name: Path<T>;
  /** Diakona is ticked, so the person must stay Mpandray. */
  diakona: boolean;
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
                <SelectItem
                  key={m}
                  value={m}
                  disabled={diakona && m !== "MPANDRAY" && m !== field.value}
                >
                  {MEMBER_TYPE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {diakona && field.value === "MPANDRAY" && (
            <FieldDescription>{t.users.mpandrayLockedByDiakona}</FieldDescription>
          )}
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

  const watchedRole = useWatch({ control: form.control, name: "role" });
  const watchedType = useWatch({ control: form.control, name: "memberType" });
  const watchedResp =
    useWatch({ control: form.control, name: "responsibilities" }) ?? [];

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
            <MemberTypeField
              control={form.control}
              name="memberType"
              diakona={watchedResp.includes("DIAKONA")}
            />
            <ResponsibilitiesField
              control={form.control}
              name="responsibilities"
              memberType={watchedType}
              lockBirao={isManager(watchedRole)}
            />
            <PhoneField control={form.control} name="phone" />
            <RoleField
              control={form.control}
              name="role"
              birao={watchedResp.includes("BIRAO")}
            />
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

  const watchedRole = useWatch({ control: form.control, name: "role" });
  const watchedType = useWatch({ control: form.control, name: "memberType" });
  const watchedResp =
    useWatch({ control: form.control, name: "responsibilities" }) ?? [];

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
            <MemberTypeField
              control={form.control}
              name="memberType"
              diakona={watchedResp.includes("DIAKONA")}
            />
            <ResponsibilitiesField
              control={form.control}
              name="responsibilities"
              memberType={watchedType}
              lockBirao={isManager(watchedRole)}
            />
            <PhoneField control={form.control} name="phone" />
            <RoleField
              control={form.control}
              name="role"
              birao={watchedResp.includes("BIRAO")}
            />
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
