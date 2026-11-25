"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import type { NavItem } from "@/lib/roles";

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
}

/** شريط الأيقونات الضيق — القائمة الرئيسية. يختفي تحت 560px. */
export function Rail({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="القائمة الرئيسية"
      className="no-print hidden sm:flex flex-none w-16 bg-navy-soft rounded-[20px] p-2.5 flex-col items-center gap-1 sticky top-3"
    >
      {items.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.key}
            href={n.href}
            aria-label={n.label}
            title={n.label}
            aria-current={active ? "page" : undefined}
            className={`flex items-center justify-center w-11 h-11 rounded-[12px] transition-colors ${
              active ? "bg-white/15 text-white" : "text-on-navy hover:bg-white/10 hover:text-white"
            }`}
          >
            <Icon name={n.icon} size={24} />
          </Link>
        );
      })}
    </nav>
  );
}

/** نفس القائمة داخل قائمة الهيدر على الجوال */
export function NavList({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <>
      {items.map((n) => {
        const active = isActive(pathname, n.href);
        return (
          <Link
            key={n.key}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 px-3 min-h-11 rounded-[8px] text-[15px] no-underline ${
              active ? "bg-blue-tint text-blue font-semibold" : "text-navy hover:bg-blue/5"
            }`}
          >
            <Icon name={n.icon} size={20} className={active ? "text-blue" : "text-muted"} />
            {n.label}
          </Link>
        );
      })}
    </>
  );
}
