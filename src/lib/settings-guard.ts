import "server-only";
import { getCurrentUser } from "@/lib/auth/session";
import { settingsAccess, type SettingsSection } from "@/lib/settings";

/** يرجع صلاحيات الإعدادات، أو null إن لم يكن القسم ضمنها */
export async function settingsSection(section: SettingsSection) {
  const user = await getCurrentUser();
  const access = settingsAccess(user);
  if (!access.sections.includes(section)) return null;
  return { user, access };
}
