"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { PROJECT_TABS } from "@/lib/roles";
import { DropMenu } from "./DropMenu";

function hrefOf(projectId: string, slug: string) {
  return slug ? `/projects/${projectId}/${slug}` : `/projects/${projectId}`;
}

function useActiveSlug(projectId: string) {
  const pathname = usePathname();
  const rest = pathname.replace(`/projects/${projectId}`, "").replace(/^\//, "");
  return rest.split("/")[0] ?? "";
}

function TabLinks({ projectId, active }: { projectId: string; active: string }) {
  return (
    <>
      {PROJECT_TABS.map((t) => {
        const on = t.slug === active;
        return (
          <Link
            key={t.slug}
            href={hrefOf(projectId, t.slug)}
            aria-current={on ? "page" : undefined}
            className={`flex items-center gap-2.5 px-3 min-h-10 rounded-[8px] text-[14px] no-underline ${
              on ? "bg-blue-tint text-blue font-semibold" : "text-navy hover:bg-blue/5"
            }`}
          >
            <Icon name={t.icon} size={18} className={on ? "text-blue" : "text-muted"} />
            <span className="flex-1">{t.label}</span>
          </Link>
        );
      })}
    </>
  );
}

/** قائمة تبويبات مساحة المشروع — منفصلة عن شريط الأيقونات. تختفي تحت 1100px. */
export function ProjectTabsAside({ projectId }: { projectId: string }) {
  const active = useActiveSlug(projectId);
  return (
    <aside
      aria-label="تبويبات المشروع"
      className="no-print hidden tabs:flex flex-none w-[232px] bg-surface rounded-[12px] shadow-[var(--shadow-card)] p-3 flex-col gap-0.5 sticky top-3"
    >
      <p className="m-0 px-3 pt-1 pb-2 text-[14px] text-muted font-semibold">مساحة المشروع</p>
      <TabLinks projectId={projectId} active={active} />
    </aside>
  );
}

/** تحت 1100px: قائمة تبويبات منسدلة أعلى المحتوى */
export function ProjectTabsDropdown({ projectId }: { projectId: string }) {
  const active = useActiveSlug(projectId);
  const current = PROJECT_TABS.find((t) => t.slug === active) ?? PROJECT_TABS[0];
  return (
    <DropMenu
      className="no-print tabs:hidden"
      summaryClassName="flex items-center justify-between gap-2 min-h-12 px-4 rounded-[12px] bg-surface shadow-[var(--shadow-card)] font-semibold text-[15px] text-navy"
      summary={
        <>
          <span className="inline-flex items-center gap-2.5">
            <span className="text-muted font-normal text-[14px]">مساحة المشروع:</span>
            {current.label}
          </span>
          <Icon name="chevron-down" size={20} />
        </>
      }
      panelClassName="inset-x-0 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] max-h-[70dvh] overflow-y-auto"
    >
      <TabLinks projectId={projectId} active={active} />
    </DropMenu>
  );
}
