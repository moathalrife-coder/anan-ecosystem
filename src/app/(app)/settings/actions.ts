"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { hashToken, newInviteToken } from "@/lib/auth/token";
import { normalizeIdentifier } from "@/lib/auth/password";
import { siteUrl } from "@/lib/env";
import { ROLES } from "@/lib/roles";

export type ActionResult = { ok: true; inviteUrl?: string } | { ok: false; error: string };

const assignment = z.object({
  role: z.enum(ROLES),
  section: z.enum(["boys", "girls"]).nullable(),
  stage_level: z.enum(["primary", "intermediate", "secondary"]).nullable(),
});
const assignments = z
  .array(assignment)
  .min(1, "اختر دوراً واحداً على الأقل")
  .refine((a) => a.every((x) => x.role !== "stage_leader" || x.stage_level), {
    message: "حدد المرحلة لقائد المرحلة",
  });

const phone = z
  .string()
  .transform((v) => normalizeIdentifier(v))
  .refine((v) => v === "" || /^05\d{8}$/.test(v), "رقم الجوال بصيغة 05xxxxxxxx");

/** رسالة عربية مفهومة من خطأ القاعدة */
function dbError(e: { message?: string } | null, fallback: string) {
  const m = e?.message ?? "";
  return /[؀-ۿ]/.test(m) ? m : fallback;
}

function done(): ActionResult {
  revalidatePath("/settings", "layout");
  return { ok: true };
}

// ------------------------------------------------------------------ الدعوات

const inviteSchema = z.object({
  full_name: z.string().trim().min(2, "اكتب الاسم"),
  email: z.email("بريد غير صحيح").transform((v) => v.trim().toLowerCase()),
  phone,
  roles: assignments,
});

export async function inviteUser(input: z.input<typeof inviteSchema>): Promise<ActionResult> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات ناقصة" };
  const me = await getCurrentUser();
  const token = newInviteToken();
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").insert({
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    full_name: parsed.data.full_name,
    roles: parsed.data.roles,
    token_hash: hashToken(token),
    invited_by: me.realUserId,
  });
  if (error) return { ok: false, error: dbError(error, "تعذّر إنشاء الدعوة") };
  revalidatePath("/settings/users");
  return { ok: true, inviteUrl: `${siteUrl()}/invite/${token}` };
}

/** إعادة إرسال: دعوة جديدة بنفس البيانات ورابط جديد (القديمة تُلغى تلقائياً) */
export async function resendInvitation(invitationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: inv } = await supabase
    .from("invitations")
    .select("email, phone, full_name, roles")
    .eq("id", invitationId)
    .maybeSingle();
  if (!inv) return { ok: false, error: "الدعوة غير موجودة" };
  return inviteUser({ full_name: inv.full_name, email: inv.email, phone: inv.phone ?? "", roles: inv.roles });
}

export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("invitations").update({ revoked_at: new Date().toISOString() }).eq("id", invitationId);
  if (error) return { ok: false, error: dbError(error, "تعذّر إلغاء الدعوة") };
  return done();
}

// ------------------------------------------------------------------ المستخدمون

const userSchema = z.object({
  id: z.uuid(),
  full_name: z.string().trim().min(2, "اكتب الاسم"),
  phone,
  roles: assignments,
  grants: z.array(z.enum(["supervisor_sensitive_data", "health_all_projects", "approve_invoices", "edit_templates"])),
});

export async function saveUser(input: z.input<typeof userSchema>): Promise<ActionResult> {
  const parsed = userSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات ناقصة" };
  const { id, full_name, phone: ph, roles, grants } = parsed.data;
  const supabase = await createClient();
  const r1 = await supabase.rpc("update_user_contact", { p_user: id, p_full_name: full_name, p_phone: ph });
  if (r1.error) return { ok: false, error: dbError(r1.error, "تعذّر حفظ البيانات (قد يكون الجوال مستخدماً)") };
  const r2 = await supabase.rpc("set_user_roles", { p_user: id, p_roles: roles });
  if (r2.error) return { ok: false, error: dbError(r2.error, "تعذّر حفظ الأدوار") };
  const r3 = await supabase.rpc("set_user_grants", { p_user: id, p_grants: grants });
  if (r3.error) return { ok: false, error: dbError(r3.error, "تعذّر حفظ الصلاحيات") };
  return done();
}

export async function setUserStatus(id: string, status: "active" | "suspended"): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_status", { p_user: id, p_status: status });
  if (error) return { ok: false, error: dbError(error, "تعذّر تغيير الحالة") };
  // إنهاء جلسات الحساب الموقوف فوراً (والقاعدة تمنعه أصلاً من أي بيانات)
  await createAdminClient().auth.admin.updateUserById(id, { ban_duration: status === "suspended" ? "876000h" : "none" });
  return done();
}

export async function impersonate(id: string, reason: string): Promise<ActionResult> {
  if (reason.trim().length < 5) return { ok: false, error: "اكتب سبب الدخول (5 أحرف على الأقل)" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("start_impersonation", { p_target: id, p_reason: reason.trim() });
  if (error) return { ok: false, error: dbError(error, "تعذّر الدخول بالحساب") };
  revalidatePath("/", "layout");
  redirect("/");
}

// ------------------------------------------------------------------ أنواع المشاريع

const typeSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(2, "اكتب اسم النوع"),
  icon: z.string().default("projects"),
  auto_budget_lines: z.array(z.string().trim().min(1)).max(30),
  options: z.array(z.string().trim().min(1)).max(30),
  default_duration: z.string().trim().nullable(),
  active: z.boolean(),
});

export async function saveProjectType(input: z.input<typeof typeSchema>): Promise<ActionResult> {
  const parsed = typeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات ناقصة" };
  const { id, ...row } = parsed.data;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("project_types").update(row).eq("id", id)
    : await supabase.from("project_types").insert({ ...row, sort: 100 });
  if (error) return { ok: false, error: dbError(error, error.code === "23505" ? "يوجد نوع بنفس الاسم" : "تعذّر الحفظ") };
  return done();
}

// ------------------------------------------------------------------ متطلبات المراحل

const reqSchema = z
  .object({
    id: z.uuid().optional(),
    phase: z.number().int().min(1).max(6),
    title: z.string().trim().min(3, "اكتب المتطلب"),
    description: z.string().trim().nullable(),
    mode: z.enum(["auto", "manual"]),
    auto_event: z.string().nullable(),
    owner_label: z.string().trim().min(2, "حدد صاحب المتطلب"),
    active: z.boolean(),
  })
  .refine((r) => r.mode === "manual" || !!r.auto_event, { message: "اختر الحدث الذي يكمل المتطلب تلقائياً" });

export async function saveRequirement(input: z.input<typeof reqSchema>): Promise<ActionResult> {
  const parsed = reqSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات ناقصة" };
  const { id, ...row } = parsed.data;
  if (row.mode === "manual") row.auto_event = null;
  const supabase = await createClient();
  if (id) {
    const { error } = await supabase.from("phase_requirement_templates").update(row).eq("id", id);
    if (error) return { ok: false, error: dbError(error, "تعذّر الحفظ") };
  } else {
    const { data: last } = await supabase
      .from("phase_requirement_templates")
      .select("sort")
      .eq("phase", row.phase)
      .order("sort", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await supabase.from("phase_requirement_templates").insert({ ...row, sort: (last?.sort ?? 0) + 1 });
    if (error) return { ok: false, error: dbError(error, "تعذّر الإضافة") };
  }
  return done();
}

/** تحريك عنصر للأعلى أو الأسفل داخل مجموعته */
export async function moveTemplateRow(
  table: "phase_requirement_templates" | "template_items",
  id: string,
  dir: -1 | 1,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: row } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
  if (!row) return { ok: false, error: "العنصر غير موجود" };
  let q = supabase.from(table).select("id, sort").order("sort", { ascending: true });
  q = table === "phase_requirement_templates" ? q.eq("phase", row.phase) : q.eq("kind", row.kind);
  if (table === "template_items") q = row.group_label ? q.eq("group_label", row.group_label) : q.is("group_label", null);
  const { data: siblings } = await q;
  const list = siblings ?? [];
  const i = list.findIndex((x) => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return { ok: true };
  const [a, b] = [list[i], list[j]];
  const r1 = await supabase.from(table).update({ sort: b.sort === a.sort ? a.sort + dir : b.sort }).eq("id", a.id);
  const r2 = await supabase.from(table).update({ sort: a.sort }).eq("id", b.id);
  if (r1.error || r2.error) return { ok: false, error: "تعذّر الترتيب" };
  return done();
}

// ------------------------------------------------------------------ القوالب الأخرى

const itemSchema = z.object({
  id: z.uuid().optional(),
  kind: z.enum(["site_check", "media_recommendation", "segment_type", "knowledge_category"]),
  group_label: z.string().trim().nullable(),
  title: z.string().trim().min(2, "اكتب العنصر"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
  active: z.boolean(),
});

export async function saveTemplateItem(input: z.input<typeof itemSchema>): Promise<ActionResult> {
  const parsed = itemSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات ناقصة" };
  const { id, ...row } = parsed.data;
  if (row.group_label === "") row.group_label = null;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("template_items").update(row).eq("id", id)
    : await supabase.from("template_items").insert({ ...row, sort: 100 });
  if (error) return { ok: false, error: dbError(error, "تعذّر الحفظ") };
  return done();
}

// ------------------------------------------------------------------ بيانات المؤسسة

const orgSchema = z.object({
  name: z.string().trim().min(2, "اكتب اسم المؤسسة"),
  store_url: z.union([z.literal(""), z.url("رابط المتجر غير صحيح")]),
  contact_phone: phone,
  whatsapp: phone,
  footer_line: z.string().trim().max(120),
  socials: z.record(z.string(), z.string().trim().max(120)),
});

export async function saveOrganization(input: z.input<typeof orgSchema>): Promise<ActionResult> {
  const parsed = orgSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات ناقصة" };
  const d = parsed.data;
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("organization")
    .update(
      {
        name: d.name,
        store_url: d.store_url || null,
        contact_phone: d.contact_phone || null,
        whatsapp: d.whatsapp || null,
        footer_line: d.footer_line || null,
        socials: d.socials,
      },
      { count: "exact" },
    )
    .eq("id", true);
  if (error || !count) return { ok: false, error: dbError(error, "تعذّر الحفظ") };
  return done();
}

// ------------------------------------------------------------------ التقويم الدراسي

const isoDate = z.iso.date("اختر التاريخ");
const override = z.number().int().min(0).max(60).nullable();

const termSchema = z
  .object({
    id: z.uuid().optional(),
    year_label: z.string().trim().min(2, "اكتب العام الدراسي"),
    name: z.string().trim().min(2, "اكتب اسم الفصل"),
    start_date: isoDate,
    end_date: isoDate,
    thu_override: override,
    fri_override: override,
    sat_override: override,
    note: z.string().trim().max(300).nullable(),
  })
  .refine((t) => t.end_date >= t.start_date, { message: "نهاية الفصل لا تسبق بدايته" });

export async function saveTerm(input: z.input<typeof termSchema>): Promise<ActionResult> {
  const parsed = termSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات ناقصة" };
  const { id, ...row } = parsed.data;
  if (row.note === "") row.note = null;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("academic_terms").update(row).eq("id", id)
    : await supabase.from("academic_terms").insert(row);
  if (error?.code === "23505") return { ok: false, error: "يوجد فصل بنفس الاسم في هذا العام" };
  if (error) return { ok: false, error: dbError(error, "تعذّر حفظ الفصل") };
  return done();
}

const eventSchema = z
  .object({
    id: z.uuid().optional(),
    title: z.string().trim().min(2, "اكتب اسم الإجازة أو المناسبة"),
    kind: z.enum(["holiday", "exams", "occasion", "other"]),
    start_date: isoDate,
    end_date: isoDate,
    blocks_availability: z.boolean(),
    note: z.string().trim().max(300).nullable(),
  })
  .refine((t) => t.end_date >= t.start_date, { message: "تاريخ النهاية لا يسبق البداية" });

export async function saveCalendarEvent(input: z.input<typeof eventSchema>): Promise<ActionResult> {
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات ناقصة" };
  const { id, ...row } = parsed.data;
  if (row.note === "") row.note = null;
  const supabase = await createClient();
  const { error } = id
    ? await supabase.from("calendar_events").update(row).eq("id", id)
    : await supabase.from("calendar_events").insert(row);
  if (error) return { ok: false, error: dbError(error, "تعذّر الحفظ") };
  return done();
}

export async function deleteCalendarRow(table: "academic_terms" | "calendar_events", id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error, count } = await supabase.from(table).delete({ count: "exact" }).eq("id", id);
  if (error || !count) return { ok: false, error: dbError(error, "تعذّر الحذف") };
  return done();
}
