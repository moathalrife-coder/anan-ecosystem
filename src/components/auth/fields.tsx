"use client";

import { useState, type ComponentProps } from "react";
import { Icon } from "@/components/ui/Icon";
import { passwordScore, STRENGTH_COLOR, STRENGTH_TEXT } from "@/lib/auth/password";

export const inputClass =
  "w-full box-border min-h-11 px-3 rounded-[8px] border border-line-strong bg-surface font-[inherit] text-[15px] text-navy";

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-navy min-w-0">{label}{children}</label>;
}

export function PasswordInput({ onValue, ...props }: ComponentProps<"input"> & { onValue?: (v: string) => void }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative flex">
      <input
        {...props}
        type={show ? "text" : "password"}
        dir="ltr"
        className={`${inputClass} pe-[52px] text-right`}
        onChange={(e) => onValue?.(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        className="absolute end-1 top-1/2 -translate-y-1/2 w-11 h-10 rounded-[10px] text-muted inline-flex items-center justify-center cursor-pointer"
      >
        <Icon name={show ? "hide" : "view"} size={20} />
      </button>
    </span>
  );
}

export function NewPasswordField({ onScore }: { onScore: (s: number) => void }) {
  const [score, setScore] = useState(0);
  return (
    <>
      <Field label="كلمة المرور">
        <PasswordInput
          name="password"
          autoComplete="new-password"
          required
          minLength={8}
          onValue={(v) => {
            const s = passwordScore(v);
            setScore(s);
            onScore(s);
          }}
        />
      </Field>
      <div className="flex flex-col gap-1.5">
        <span className="flex gap-1.5" aria-hidden>
          {[1, 2, 3, 4].map((k) => (
            <span key={k} className="flex-1 h-1.5 rounded-[3px]" style={{ background: score >= k ? STRENGTH_COLOR[score] : "#e6edf8" }} />
          ))}
        </span>
        <span className="text-[13px] text-muted" aria-live="polite">{STRENGTH_TEXT[score]}</span>
      </div>
    </>
  );
}
