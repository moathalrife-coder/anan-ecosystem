"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, EPHEMERAL_COOKIE } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/env";
import { newPasswordSchema, normalizeIdentifier } from "@/lib/auth/password";
import { hashToken } from "@/lib/auth/token";

export type FormState = { error?: string; ok?: boolean; sentTo?: string } | null;

const lockedMessage = (until: string) => {
  const mins = Math.max(1, Math.ceil((new Date(until).getTime() - Date.now()) / 60000));
  return `أُوقف الدخول مؤقتاً بعد 5 محاولات. حاول بعد ${mins} دقيقة، أو استعد كلمة المرور، أو تواصل مع مدير المشاريع.`;
};

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const identifier = normalizeIdentifier(String(formData.get("identifier") ?? ""));
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";
  if (!identifier || !password) return { error: "اكتب البريد أو الجوال وكلمة المرور." };

  const admin = createAdminClient();
  const { data: status } = await admin.rpc("login_status", { p_identifier: identifier });
  if (status?.locked_until) return { error: lockedMessage(status.locked_until) };
  if (status?.user_status === "suspended") return { error: "هذا الحساب موقوف. تواصل مع مدير المشاريع." };

  const { data: email } = await admin.rpc("login_email_for", { p_identifier: identifier });

  const store = await cookies();
  if (remember) store.delete(EPHEMERAL_COOKIE);
  else store.set(EPHEMERAL_COOKIE, "1", { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });

  const supabase = await createClient();
  const { error } = email
    ? await supabase.auth.signInWithPassword({ email, password })
    : { error: new Error("unknown") };

  if (error) {
    const { data: f } = await admin.rpc("login_failed", { p_identifier: identifier });
    if (f?.locked_until) return { error: lockedMessage(f.locked_until) };
    return { error: `البريد أو كلمة المرور غير صحيحة. بقي ${f?.remaining ?? 0} محاولات.` };
  }
  await admin.rpc("login_succeeded", { p_identifier: identifier });
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim().toLowerCase());
  if (!parsed.success) return { error: "اكتب بريداً صحيحاً." };
  const supabase = await createClient();
  // لا نكشف هل البريد مسجل أم لا: النتيجة الظاهرة واحدة دائماً
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  return { ok: true, sentTo: parsed.data };
}

export async function setNewPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: "انتهت صلاحية الرابط. اطلب رابطاً جديداً." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) return { error: "تعذّر حفظ كلمة المرور. جرّب كلمة مختلفة عن السابقة." };
  redirect("/");
}

export async function acceptInvitation(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = newPasswordSchema.safeParse(String(formData.get("password") ?? ""));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const admin = createAdminClient();
  const tokenHash = hashToken(token);
  const { data: inv } = await admin.rpc("invitation_by_token", { p_token_hash: tokenHash });
  if (!inv) return { error: "رابط الدعوة غير صالح أو منتهي. اطلب دعوة جديدة من مدير المشاريع." };

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: inv.email,
    password: parsed.data,
    email_confirm: true,
    user_metadata: { full_name: inv.full_name },
  });
  if (createErr || !created.user) {
    return { error: "يوجد حساب بهذا البريد مسبقاً. ادخل من صفحة الدخول أو استعد كلمة المرور." };
  }

  const { error: finErr } = await admin.rpc("finalize_invitation", {
    p_token_hash: tokenHash,
    p_user_id: created.user.id,
  });
  if (finErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "رابط الدعوة غير صالح أو منتهي. اطلب دعوة جديدة من مدير المشاريع." };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: inv.email, password: parsed.data });
  redirect("/");
}
