"use client";

import { useActionState, useState } from "react";
import { signIn, requestPasswordReset } from "../actions";
import { AuthHeading } from "@/components/auth/AuthFrame";
import { Field, PasswordInput, inputClass } from "@/components/auth/fields";
import { Alert } from "@/components/ui/Alert";
import { Icon } from "@/components/ui/Icon";
import { Button, buttonClass } from "@/components/ui/Button";

const linkBtn = "self-start bg-transparent border-0 text-blue font-semibold text-[14px] min-h-10 px-0 cursor-pointer inline-flex items-center gap-1.5";

export function LoginForm({ notice }: { notice?: string }) {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [loginState, loginAction, loggingIn] = useActionState(signIn, null);
  const [resetState, resetAction, sending] = useActionState(requestPasswordReset, null);

  if (mode === "forgot") {
    if (resetState?.ok) {
      return (
        <>
          <Alert tone="success">أرسلنا رابط الاستعادة إلى {resetState.sentTo} إن كان مسجلاً لدينا. الرابط صالح لمدة ساعة.</Alert>
          <p className="m-0 text-[14px] leading-[22px] text-muted">لم يصلك؟ تأكد من مجلد الرسائل غير المرغوبة، أو تواصل مع مدير المشاريع.</p>
          <Button variant="ghost" size="lg" onClick={() => setMode("login")}>العودة لتسجيل الدخول</Button>
        </>
      );
    }
    return (
      <form action={resetAction} className="flex flex-col gap-[18px]">
        <button type="button" className={linkBtn} onClick={() => setMode("login")}>
          <Icon name="back" size={18} />
          رجوع
        </button>
        <AuthHeading title="استعادة كلمة المرور" sub="اكتب بريدك المسجّل، ونرسل لك رابطاً لتعيين كلمة مرور جديدة." />
        {resetState?.error && <Alert tone="error">{resetState.error}</Alert>}
        <Field label="البريد الإلكتروني">
          <input name="email" type="email" autoComplete="email" required dir="ltr" placeholder="name@example.com" className={`${inputClass} text-right`} />
        </Field>
        <button type="submit" disabled={sending} className={buttonClass("primary", "lg")}>
          {sending ? "جارٍ الإرسال…" : "إرسال الرابط"}
        </button>
      </form>
    );
  }

  return (
    <form action={loginAction} className="flex flex-col gap-[18px]">
      <AuthHeading title="أهلاً بك" sub="ادخل بحسابك في المنظومة." />
      {notice && <Alert tone="info">{notice}</Alert>}
      {loginState?.error && <Alert tone="error">{loginState.error}</Alert>}
      <Field label="البريد الإلكتروني أو رقم الجوال">
        <input
          name="identifier"
          type="text"
          inputMode="email"
          autoComplete="username"
          required
          dir="ltr"
          placeholder="name@example.com أو 05xxxxxxxx"
          className={`${inputClass} text-right`}
        />
      </Field>
      <Field label="كلمة المرور">
        <PasswordInput name="password" autoComplete="current-password" required />
      </Field>
      <div className="flex flex-wrap justify-between items-center gap-x-3 gap-y-2">
        <label className="inline-flex items-center gap-2 text-[14px] cursor-pointer min-h-10">
          <input type="checkbox" name="remember" defaultChecked className="w-5 h-5 accent-blue" />
          تذكرني على هذا الجهاز
        </label>
        <button type="button" className={linkBtn} onClick={() => setMode("forgot")}>نسيت كلمة المرور؟</button>
      </div>
      <button type="submit" disabled={loggingIn} className={buttonClass("primary", "lg")}>
        {loggingIn ? "جارٍ الدخول…" : "دخول"}
      </button>
      <div className="bg-soft rounded-[12px] p-3.5 flex items-start gap-2">
        <Icon name="info" size={18} className="text-blue mt-0.5" />
        <span className="text-[13.5px] leading-[22px]">
          الحسابات يُنشئها مدير المشاريع. إذا وصلتك دعوة، افتح رابطها لتعيين كلمة المرور.
        </span>
      </div>
    </form>
  );
}
