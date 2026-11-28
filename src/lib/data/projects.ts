import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Section, StageLevel } from "@/lib/roles";

export type ProjectRow = {
  id: string;
  name: string;
  section: Section;
  stage_level: StageLevel;
  season: string | null;
  status: string;
  current_phase: number;
  starts_on: string | null;
  ends_on: string | null;
  leader: { full_name: string } | null;
};

const COLS =
  "id, name, section, stage_level, season, status, current_phase, starts_on, ends_on, leader:profiles!projects_leader_id_fkey(full_name)";

/** المشاريع التي يسمح بها RLS للمستخدم الحالي */
export async function listProjects() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("projects").select(COLS).order("created_at", { ascending: false });
  if (error) throw new Error("تعذّر تحميل المشاريع");
  return (data ?? []) as unknown as ProjectRow[];
}

export const getProject = cache(async (id: string) => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select(COLS).eq("id", id).maybeSingle();
  return (data as unknown as ProjectRow) ?? null;
});
