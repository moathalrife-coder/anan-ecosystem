import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame, AuthHeading } from "@/components/auth/AuthFrame";
import { createClient } from "@/lib/supabase/server";
import { ResetForm } from "./ResetForm";

export const metadata: Metadata = { title: "كلمة مرور جديدة" };

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect("/login?e=link");
  return (
    <AuthFrame>
      <AuthHeading title="كلمة مرور جديدة" sub="اختر كلمة مرور جديدة لحسابك." />
      <ResetForm />
    </AuthFrame>
  );
}
