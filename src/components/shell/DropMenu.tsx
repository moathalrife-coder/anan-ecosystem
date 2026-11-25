"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** قائمة منسدلة مبنية على <details>: تعمل بلا جافاسكربت، وتُغلق عند التنقل أو الضغط خارجها أو Esc. */
export function DropMenu({
  summary,
  summaryClassName = "",
  summaryLabel,
  children,
  className = "",
  panelClassName = "",
}: {
  summary: ReactNode;
  summaryClassName?: string;
  summaryLabel?: string;
  children: ReactNode;
  className?: string;
  panelClassName?: string;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  useEffect(() => {
    const onDown = (e: PointerEvent) => {
      const el = ref.current;
      if (el?.open && !el.contains(e.target as Node)) el.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      if (e.key === "Escape" && el?.open) {
        el.open = false;
        el.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className={`relative group ${className}`}>
      <summary aria-label={summaryLabel} className={`list-none cursor-pointer [&::-webkit-details-marker]:hidden ${summaryClassName}`}>
        {summary}
      </summary>
      <div
        className={`absolute z-30 top-[calc(100%+8px)] bg-surface rounded-[12px] shadow-[var(--shadow-pop)] p-2 flex flex-col gap-0.5 text-navy ${panelClassName}`}
      >
        {children}
      </div>
    </details>
  );
}
