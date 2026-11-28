import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { settingsSection } from "@/lib/settings-guard";
import { Forbidden } from "@/components/pages/Forbidden";
import { TypesManager, type ProjectType } from "@/components/settings/TypesManager";

export const metadata: Metadata = { title: "أنواع المشاريع" };

export default async function TypesPage() {
  const ctx = await settingsSection("types");
  if (!ctx) return <Forbidden title="أنواع المشاريع" />;
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_types")
    .select("id, name, icon, auto_budget_lines, options, default_duration, active")
    .order("sort")
    .order("name");
  return <TypesManager types={(data ?? []) as ProjectType[]} canEdit={ctx.access.canEditTemplates} />;
}
