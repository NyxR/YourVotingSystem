"use client";

import { useState } from "react";
import Link from "next/link";
import {
  EllipsisVerticalIcon,
  KeyRoundIcon,
  LogOutIcon,
  UserRoundPenIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { signOut } from "@/features/auth/actions/auth.actions";
import { ProfileDialog } from "@/features/users/components/profile-dialog";
import { useI18n } from "@/i18n/client";
import { MEMBER_TYPE_LABELS } from "@/lib/member-types";
import { ResponsibilityBadges } from "@/components/responsibility-badges";
import type { SidebarUser } from "./app-sidebar";

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

function UserSummary({
  user,
  showEmail = false,
}: {
  user: SidebarUser;
  showEmail?: boolean;
}) {
  const { t } = useI18n();
  return (
    <>
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold tracking-wide text-primary-foreground"
      >
        {initials(user.name)}
      </span>
      <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="truncate text-xs text-muted-foreground">
          {t.roles[user.role]} · {MEMBER_TYPE_LABELS[user.memberType]}
        </span>
        {showEmail && (
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        )}
        {showEmail && user.responsibilities.length > 0 && (
          <ResponsibilityBadges values={user.responsibilities} className="mt-1.5" />
        )}
      </div>
    </>
  );
}

export function NavUser({ user }: { user: SidebarUser }) {
  const { isMobile } = useSidebar();
  const { t } = useI18n();
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <UserSummary user={user} />
                <EllipsisVerticalIcon className="ml-auto size-4" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
              side={isMobile ? "bottom" : "right"}
              align="end"
              sideOffset={4}
            >
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserSummary user={user} showEmail />
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setProfileOpen(true)}>
                <UserRoundPenIcon />
                {t.nav.myProfile}
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/set-password">
                  <KeyRoundIcon />
                  {t.nav.changePassword}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => signOut()}>
                <LogOutIcon />
                {t.nav.logOut}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>
      <ProfileDialog
        open={profileOpen}
        onOpenChange={setProfileOpen}
        me={{
          name: user.name,
          email: user.email,
          phone: user.phone,
          responsibilities: user.responsibilities,
        }}
      />
    </>
  );
}
