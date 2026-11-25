"use client";

import { useActionState, useState } from "react";
import { acceptInvitation } from "../../actions";
import { Field, NewPasswordField, inputClass } from "@/components/auth/fields";
import { Alert } from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";

export function InviteForm({ token, fullName }: { token: string; fullName: string }) {
  const [state, action, pending] = useActionState(acceptInvitation, null);
  const [score, setScore] = useState(0);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      <input type="hidden" name="token" value={token} />
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <Field label="الاسم">
        <input className={`${inputClass} bg-soft`} value={fullName} readOnly />
      </Field>
      <NewPasswordField onScore={setScore} />
      <button type="submit" disabled={pending || score < 3} className={buttonClass("primary", "lg")}>
        {pending ? "جارٍ التفعيل…" : "تعيين كلمة المرور والدخول"}
      </button>
    </form>
  );
}
