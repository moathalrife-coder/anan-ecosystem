#!/usr/bin/env node
// ينشئ أول حساب «مدير المشاريع» مباشرة (مرة واحدة عند التشغيل الأول).
// بعده تُنشأ كل الحسابات بالدعوات من داخل المنظومة.
//
// الاستخدام:
//   node --env-file=.env.local scripts/bootstrap-admin.mjs "الاسم" email@example.com 05xxxxxxxx
// كلمة المرور تُطلب ولا تُكتب في سطر الأوامر.
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";

const [name, email, phone] = process.argv.slice(2);
if (!name || !email) {
  console.error('الاستخدام: node --env-file=.env.local scripts/bootstrap-admin.mjs "الاسم" email [05xxxxxxxx]');
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("أضف NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في .env.local");
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question("كلمة المرور (8 أحرف على الأقل، حروف وأرقام): ");
rl.close();
if (password.length < 8 || !/[0-9]/.test(password) || !/[A-Za-z]/.test(password)) {
  console.error("كلمة المرور ضعيفة.");
  process.exit(1);
}

const admin = createClient(url, key, { auth: { persistSession: false } });
const { count } = await admin.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "project_manager");
if ((count ?? 0) > 0) {
  console.error("يوجد مدير مشاريع مسبقاً. أضف الحسابات بالدعوات من الإعدادات.");
  process.exit(1);
}

const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: name } });
if (error) {
  console.error("تعذّر إنشاء الحساب:", error.message);
  process.exit(1);
}
const id = data.user.id;
const p = await admin.from("profiles").insert({ id, full_name: name, email: email.toLowerCase(), phone: phone || null, status: "active" });
if (p.error) {
  await admin.auth.admin.deleteUser(id);
  console.error("تعذّر إنشاء الملف:", p.error.message);
  process.exit(1);
}
const r = await admin.from("user_roles").insert({ user_id: id, role: "project_manager" });
if (r.error) {
  console.error("تعذّر إسناد الدور:", r.error.message);
  process.exit(1);
}
console.log(`تم: ${name} مدير مشاريع. ادخل الآن من صفحة الدخول.`);
