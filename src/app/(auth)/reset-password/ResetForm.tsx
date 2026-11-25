"use client";

import { useActionState, useState } from "react";
import { setNewPassword } from "../actions";
import { NewPasswordField } from "@/components/auth/fields";
import { Alert } from "@/components/ui/Alert";
import { buttonClass } from "@/components/ui/Button";

export function ResetForm() {
  const [state, action, pending] = useActionState(setNewPassword, null);
  const [score, setScore] = useState(0);
  return (
    <form action={action} className="flex flex-col gap-[18px]">
      {state?.error && <Alert tone="error">{state.error}</Alert>}
      <NewPasswordField onScore={setScore} />
      <button type="submit" disabled={pending || score < 3} className={buttonClass("primary", "lg")}>
        {pending ? "جارٍ الحفظ…" : "حفظ كلمة المرور والدخول"}
      </button>
    </form>
  );
}
