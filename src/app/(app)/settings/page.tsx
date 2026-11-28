import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { SETTINGS_SECTIONS, settingsAccess } from "@/lib/settings";

export default async function SettingsIndex() {
  const access = settingsAccess(await getCurrentUser());
  const first = SETTINGS_SECTIONS.find((s) => access.sections.includes(s.key));
  redirect(first?.href ?? "/");
}
