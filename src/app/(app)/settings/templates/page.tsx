import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { settingsSection } from "@/lib/settings-guard";
import { Forbidden } from "@/components/pages/Forbidden";
import { RequirementsEditor, type Requirement } from "@/components/settings/RequirementsEditor";
import { TemplateItemsEditor, type TemplateItem } from "@/components/settings/TemplateItemsEditor";
import { TEMPLATE_TABS } from "@/lib/templates";

export const metadata: Metadata = { title: "القوالب" };

export default async function TemplatesPage({ searchParams }: PageProps<"/settings/templates">) {
  const ctx = await settingsSection("templates");
  if (!ctx) return <Forbidden title="القوالب" />;
  const sp = await searchParams;
  const tab = TEMPLATE_TABS.find((t) => t.key === sp.t) ?? TEMPLATE_TABS[0];
  const supabase = await createClient();
  const canEdit = ctx.access.canEditTemplates;

  let body;
  if (tab.key === "stages") {
    const { data } = await supabase
      .from("phase_requirement_templates")
      .select("id, phase, title, description, mode, auto_event, owner_label, sort, active")
      .order("phase")
      .order("sort");
    body = <RequirementsEditor items={(data ?? []) as Requirement[]} canEdit={canEdit} />;
  } else {
    const { data } = await supabase
      .from("template_items")
      .select("id, kind, group_label, title, color, sort, active")
      .eq("kind", tab.key)
      .order("group_label", { nullsFirst: true })
      .order("sort");
    body = (
      <TemplateItemsEditor
        key={tab.key}
        kind={tab.key}
        label={tab.label}
        desc={tab.desc}
        groupLabel={tab.groupLabel}
        hasColor={tab.hasColor}
        items={(data ?? []) as TemplateItem[]}
        canEdit={canEdit}
      />
    );
  }

  return (
    <>
      <nav aria-label="أنواع القوالب" className="no-print flex gap-2 overflow-x-auto pb-1 -mb-1">
        {TEMPLATE_TABS.map((t) => {
          const on = t.key === tab.key;
          return (
            <Link
              key={t.key}
              href={t.key === "stages" ? "/settings/templates" : `/settings/templates?t=${t.key}`}
              aria-current={on ? "page" : undefined}
              className={`flex-none inline-flex items-center min-h-10 px-3.5 rounded-full text-[14px] font-semibold no-underline border ${
                on ? "bg-navy text-white border-navy hover:text-white" : "bg-surface text-navy border-line-strong hover:text-navy"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
      {body}
    </>
  );
}
