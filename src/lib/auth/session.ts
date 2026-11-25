import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { defaultRole, type GrantKey, type Role, type RoleAssignment } from "@/lib/roles";

export const ACTIVE_ROLE_COOKIE = "anan_role";

export type CurrentUser = {
  id: string;
  realUserId: string;
  fullName: string;
  email: string;
  phone: string | null;
  assignments: RoleAssignment[];
  roles: Role[];
  grants: GrantKey[];
  /** الدور المعروض حالياً (يبدّله المستخدم من الهيدر). لا يغيّر صلاحيات القاعدة. */
  activeRole: Role | null;
  impersonating: boolean;
  impersonationReason: string | null;
  realName: string | null;
};

type Ctx = {
  user_id: string;
  real_user_id: string;
  impersonating: boolean;
  impersonation_reason: string | null;
  real_name: string | null;
  profile: { full_name: string; email: string; phone: string | null; status: string } | null;
  roles: RoleAssignment[];
  grants: GrantKey[];
};

/** المستخدم الحالي كما تراه قاعدة البيانات. يحوّل لصفحة الدخول إن لم توجد جلسة صالحة. */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");

  const { data, error } = await supabase.rpc("my_context");
  const ctx = data as Ctx | null;
  if (error || !ctx?.profile || ctx.profile.status !== "active") {
    await supabase.auth.signOut();
    redirect("/login?e=inactive");
  }

  const roles = Array.from(new Set(ctx.roles.map((r) => r.role)));
  const store = await cookies();
  const wanted = store.get(ACTIVE_ROLE_COOKIE)?.value as Role | undefined;
  const activeRole = wanted && roles.includes(wanted) ? wanted : defaultRole(roles);

  return {
    id: ctx.user_id,
    realUserId: ctx.real_user_id,
    fullName: ctx.profile.full_name,
    email: ctx.profile.email,
    phone: ctx.profile.phone,
    assignments: ctx.roles,
    roles,
    grants: ctx.grants,
    activeRole,
    impersonating: ctx.impersonating,
    impersonationReason: ctx.impersonation_reason,
    realName: ctx.real_name,
  };
});
