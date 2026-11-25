import type { Metadata } from "next";
import { AuthFrame } from "@/components/auth/AuthFrame";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "الدخول" };

const NOTICES: Record<string, string> = {
  inactive: "حسابك غير نشط. تواصل مع مدير المشاريع.",
  link: "الرابط غير صالح أو انتهت صلاحيته. اطلب رابطاً جديداً.",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { e } = await searchParams;
  return (
    <AuthFrame>
      <LoginForm notice={typeof e === "string" ? NOTICES[e] : undefined} />
    </AuthFrame>
  );
}
