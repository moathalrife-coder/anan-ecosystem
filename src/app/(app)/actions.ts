"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_ROLE_COOKIE, getCurrentUser } from "@/lib/auth/session";
import { ROLES, type Role } from "@/lib/roles";

/** تبديل الدور المعروض. لا يغيّر صلاحيات القاعدة (وهي اتحاد كل أدوار الشخص). */
export async function setActiveRole(formData: FormData) {
  const role = String(formData.get("role") ?? "") as Role;
  const user = await getCurrentUser();
  if (!ROLES.includes(role) || !user.roles.includes(role)) return;
  (await cookies()).set(ACTIVE_ROLE_COOKIE, role, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.rpc("end_impersonation");
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_ROLE_COOKIE);
  redirect("/login");
}

export async function endImpersonation() {
  const supabase = await createClient();
  await supabase.rpc("end_impersonation");
  (await cookies()).delete(ACTIVE_ROLE_COOKIE);
  revalidatePath("/", "layout");
  redirect("/");
}
