"use client";

import { Icon } from "./Icon";

/** زر اختيار بشكل حبة: يُظهر علامة صح عند التفعيل */
export function Pill({
  on,
  onClick,
  children,
  disabled,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={`inline-flex items-center gap-1.5 min-h-10 px-3 rounded-full text-[13px] font-semibold border cursor-pointer disabled:opacity-50 disabled:cursor-default ${
        on ? "bg-blue-tint border-blue text-navy" : "bg-surface border-[#c5cfe0] text-navy"
      }`}
    >
      <Icon name={on ? "check" : "plus"} size={16} className={on ? "text-blue" : "text-muted"} />
      {children}
    </button>
  );
}
