import type { ReactNode } from "react";

type Tone = "neutral" | "info" | "success" | "warning" | "danger";
const tones: Record<Tone, string> = {
  neutral: "bg-page text-navy",
  info: "bg-blue-tint text-blue",
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 min-h-[28px] px-2.5 rounded-full text-[13px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}
