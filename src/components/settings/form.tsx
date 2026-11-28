"use client";

import type { ComponentProps, ReactNode } from "react";

export const inputCls =
  "w-full box-border min-h-11 px-3 rounded-[8px] border border-line-strong bg-surface font-[inherit] text-[15px] text-navy";

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-navy min-w-0">
      {label}
      {children}
      {hint && <span className="text-[13px] font-normal text-muted">{hint}</span>}
    </label>
  );
}

export function Group({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div role="group" aria-label={label} className="flex flex-col gap-1.5 min-w-0">
      <span className="text-[14px] font-semibold text-navy">{label}</span>
      {children}
      {hint && <span className="text-[13px] text-muted">{hint}</span>}
    </div>
  );
}

export function Input(props: ComponentProps<"input">) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: ComponentProps<"select">) {
  return <select {...props} className={`${inputCls} px-2 ${props.className ?? ""}`} />;
}

export function Textarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={`${inputCls} min-h-[76px] py-2.5 leading-6 resize-y ${props.className ?? ""}`} />;
}

export function FormError({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <div role="alert" className="rounded-[12px] bg-danger-bg text-danger px-3.5 py-3 text-[14px] leading-[22px]">
      {error}
    </div>
  );
}
