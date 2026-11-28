"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { SETTINGS_SECTIONS, type SettingsSection } from "@/lib/settings";

export function SectionTabs({ allowed }: { allowed: SettingsSection[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="أقسام الإعدادات" className="no-print flex flex-wrap gap-1 bg-[#e8eef8] rounded-[12px] p-1">
      {SETTINGS_SECTIONS.filter((s) => allowed.includes(s.key)).map((s) => {
        const on = pathname === s.href || pathname.startsWith(s.href + "/");
        return (
          <Link
            key={s.key}
            href={s.href}
            aria-current={on ? "page" : undefined}
            className={`flex-1 basis-[40%] sm:basis-auto sm:flex-none inline-flex items-center justify-center gap-2 min-h-10 px-3.5 rounded-[9px] text-[14px] font-semibold no-underline ${
              on ? "bg-surface text-navy shadow-[var(--shadow-card)]" : "text-muted hover:text-navy"
            }`}
          >
            <Icon name={s.icon} size={18} className={on ? "text-blue" : ""} />
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
