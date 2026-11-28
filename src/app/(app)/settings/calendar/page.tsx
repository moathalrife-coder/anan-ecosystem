import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { settingsSection } from "@/lib/settings-guard";
import { Forbidden } from "@/components/pages/Forbidden";
import { CalendarManager, type Availability, type CalendarEvent, type Term } from "@/components/settings/CalendarManager";

export const metadata: Metadata = { title: "التقويم الدراسي" };

export default async function CalendarSettingsPage() {
  const ctx = await settingsSection("calendar");
  if (!ctx) return <Forbidden title="التقويم الدراسي" />;
  const supabase = await createClient();
  const [terms, avail, events] = await Promise.all([
    supabase
      .from("academic_terms")
      .select("id, year_label, name, start_date, end_date, thu_override, fri_override, sat_override, note")
      .order("start_date"),
    supabase.rpc("term_availability"),
    supabase
      .from("calendar_events")
      .select("id, title, kind, start_date, end_date, blocks_availability, note")
      .order("start_date"),
  ]);
  return (
    <CalendarManager
      terms={(terms.data ?? []) as Term[]}
      availability={(avail.data ?? []) as Availability[]}
      events={(events.data ?? []) as CalendarEvent[]}
      canEdit={ctx.access.canEditCalendar}
    />
  );
}
