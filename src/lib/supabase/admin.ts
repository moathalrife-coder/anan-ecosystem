import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseEnv } from "@/lib/env";

/**
 * عميل بمفتاح الخدمة — يتجاوز RLS. للخادم فقط، وفي حالات محددة:
 * قبول الدعوات، وقفل محاولات الدخول، وتحويل الجوال إلى بريد.
 * لا يُستخدم لقراءة بيانات المنظومة نيابة عن المستخدم.
 */
export function createAdminClient() {
  const { url } = supabaseEnv();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY غير مضبوط");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
