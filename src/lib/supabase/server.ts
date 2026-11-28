import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/env";

/** عند عدم اختيار «تذكرني»: كوكيز الجلسة تنتهي بإغلاق المتصفح */
export const EPHEMERAL_COOKIE = "anan_ephemeral";

/** عميل Supabase بصلاحيات المستخدم المسجل (RLS مفعّل). يُنشأ لكل طلب. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseEnv();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          const ephemeral = cookieStore.has(EPHEMERAL_COOKIE);
          cookiesToSet.forEach(({ name, value, options }) => {
            const o = { ...options };
            if (ephemeral && value) {
              delete o.maxAge;
              delete o.expires;
            }
            cookieStore.set(name, value, o);
          });
        } catch {
          // استدعاء من مكوّن خادم: الـ proxy يتولى تحديث الجلسة.
        }
      },
    },
  });
}
