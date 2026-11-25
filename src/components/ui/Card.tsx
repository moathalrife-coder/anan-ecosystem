import type { ReactNode } from "react";

export function Card({ children, className = "", as: As = "section", label }: {
  children: ReactNode; className?: string; as?: "section" | "div" | "article"; label?: string;
}) {
  return (
    <As aria-label={label} className={`print-flat bg-surface rounded-[12px] shadow-[var(--shadow-card)] p-4 flex flex-col gap-3 min-w-0 ${className}`}>
      {children}
    </As>
  );
}

export function CardTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={`m-0 font-display text-[18px] leading-7 font-semibold text-navy flex items-center gap-2.5 ${className}`}>
      {children}
    </h2>
  );
}

export function Caption({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`m-0 text-[14px] leading-[22px] text-muted ${className}`}>{children}</p>;
}
