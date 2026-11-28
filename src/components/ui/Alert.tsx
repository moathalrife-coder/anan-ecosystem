import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function Alert({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  const cls =
    tone === "error" ? "bg-danger-bg text-danger" : tone === "success" ? "bg-success-bg text-success" : "bg-soft text-navy";
  const icon = tone === "error" ? "warning" : tone === "success" ? "success" : "info";
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex gap-2 items-start rounded-[12px] px-3.5 py-3 text-[14px] leading-[22px] ${cls}`}>
      <Icon name={icon} size={20} className={tone === "info" ? "text-blue mt-0.5" : "mt-0.5"} />
      <span className="min-w-0">{children}</span>
    </div>
  );
}
