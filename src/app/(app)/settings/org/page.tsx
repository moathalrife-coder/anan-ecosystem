import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { settingsSection } from "@/lib/settings-guard";
import { Forbidden } from "@/components/pages/Forbidden";
import { OrgForm, type Org } from "@/components/settings/OrgForm";

export const metadata: Metadata = { title: "بيانات المؤسسة" };

export default async function OrgPage() {
  const ctx = await settingsSection("org");
  if (!ctx) return <Forbidden title="بيانات المؤسسة" />;
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization")
    .select("name, store_url, contact_phone, whatsapp, socials, footer_line")
    .maybeSingle();
  const org: Org = {
    name: data?.name ?? "",
    store_url: data?.store_url ?? "",
    contact_phone: data?.contact_phone ?? "",
    whatsapp: data?.whatsapp ?? "",
    footer_line: data?.footer_line ?? "",
    socials: (data?.socials ?? {}) as Record<string, string>,
  };
  return <OrgForm org={org} canEdit={ctx.access.canEditOrg} />;
}
