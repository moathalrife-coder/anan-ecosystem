import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { settingsSection } from "@/lib/settings-guard";
import { Forbidden } from "@/components/pages/Forbidden";
import { UsersManager, type AdminUser, type PendingInvite } from "@/components/settings/UsersManager";

export const metadata: Metadata = { title: "المستخدمون" };

export default async function UsersPage() {
  const ctx = await settingsSection("users");
  if (!ctx) return <Forbidden title="المستخدمون" />;
  const supabase = await createClient();
  const [{ data: users }, { data: invites }] = await Promise.all([
    supabase.rpc("admin_users"),
    supabase.rpc("pending_invitations"),
  ]);
  return (
    <UsersManager
      users={(users ?? []) as AdminUser[]}
      invites={(invites ?? []) as PendingInvite[]}
      canManage={ctx.access.canManageUsers}
      currentUserId={ctx.user.realUserId}
    />
  );
}
