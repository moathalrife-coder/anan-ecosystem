import type { CurrentUser } from "@/lib/auth/session";
import type { IconName } from "@/lib/roles";

export type SettingsSection = "users" | "types" | "templates" | "calendar" | "org" | "audit";

export const SETTINGS_SECTIONS: { key: SettingsSection; label: string; icon: IconName; href: string }[] = [
  { key: "users", label: "المستخدمون", icon: "users", href: "/settings/users" },
  { key: "types", label: "أنواع المشاريع", icon: "projects", href: "/settings/types" },
  { key: "templates", label: "القوالب", icon: "checklist", href: "/settings/templates" },
  { key: "calendar", label: "التقويم الدراسي", icon: "calendar", href: "/settings/calendar" },
  { key: "org", label: "بيانات المؤسسة", icon: "id-card", href: "/settings/org" },
  { key: "audit", label: "سجل التدقيق", icon: "clock", href: "/settings/audit" },
];

/**
 * ما يظهر لكل شخص في الإعدادات (مرآة للواجهة؛ القاعدة تفرض نفس القواعد):
 * - مدير المشاريع: كل شيء.
 * - الإدارة العليا: كل الأقسام للعرض فقط.
 * - من مُنح «تعديل القوالب»: أنواع المشاريع والقوالب فقط.
 * - أثناء الدخول بحساب شخص آخر: لا إدارة للمستخدمين.
 */
export function settingsAccess(user: CurrentUser) {
  const role = user.activeRole;
  const isPM = role === "project_manager";
  const isTop = role === "top_management";
  const tplGrant = user.grants.includes("edit_templates") && role !== "design_vendor";
  const sections: SettingsSection[] =
    isPM || isTop ? ["users", "types", "templates", "calendar", "org", "audit"] : tplGrant ? ["types", "templates"] : [];
  return {
    sections,
    canManageUsers: isPM && !user.impersonating,
    canEditTemplates: isPM || tplGrant,
    canEditOrg: isPM,
    canEditCalendar: isPM,
    readOnly: isTop && !tplGrant,
  };
}
