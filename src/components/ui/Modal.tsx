"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "@/lib/roles";

/** نافذة حوار مبنية على <dialog>: تحبس التركيز، وتُغلق بـ Esc أو بالضغط خارجها. */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: IconName;
  children: ReactNode;
  footer?: ReactNode;
  size?: "md" | "lg";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={`m-auto p-0 rounded-[16px] shadow-[var(--shadow-pop)] bg-surface text-navy w-[calc(100vw-24px)] ${
        size === "lg" ? "max-w-[640px]" : "max-w-[480px]"
      } max-h-[calc(100dvh-24px)] backdrop:bg-navy/40`}
    >
      {open && (
        <div dir="rtl" className="flex flex-col max-h-[calc(100dvh-24px)]">
          <div className="flex items-start gap-3 p-4 border-b border-line">
            {icon && (
              <span className="w-10 h-10 rounded-[10px] bg-blue-tint text-blue inline-flex items-center justify-center flex-none">
                <Icon name={icon} size={22} />
              </span>
            )}
            <div className="flex-1 min-w-0 flex flex-col gap-0.5">
              <h2 className="m-0 font-display text-[18px] leading-7 font-semibold">{title}</h2>
              {subtitle && <span className="text-[13px] text-muted">{subtitle}</span>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="w-10 h-10 rounded-[10px] inline-flex items-center justify-center text-muted hover:bg-soft cursor-pointer flex-none"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
          <div className="p-4 overflow-y-auto flex flex-col gap-3.5">{children}</div>
          {footer && <div className="p-4 border-t border-line flex flex-wrap gap-2 justify-end">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}
