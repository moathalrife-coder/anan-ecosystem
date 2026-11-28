/**
 * الأدوار والقوائم — مرآة للواجهة فقط.
 * الصلاحية الحقيقية تُفرض في قاعدة البيانات (supabase/migrations). إخفاء عنصر هنا
 * لا يمنح ولا يمنع وصولاً؛ هو لتبسيط ما يراه كل دور.
 */

export const ROLES = [
  "top_management",
  "project_manager",
  "stage_leader",
  "project_leader",
  "committee_head",
  "supervisor",
  "accountant",
  "warehouse_manager",
  "design_vendor",
] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  top_management: "الإدارة العليا",
  project_manager: "مدير المشاريع",
  stage_leader: "قائد المرحلة",
  project_leader: "قائد المشروع",
  committee_head: "مسؤول اللجنة",
  supervisor: "مشرف",
  accountant: "المحاسب",
  warehouse_manager: "مسؤول المستودع",
  design_vendor: "ماي اي (التصميم)",
};

export type Section = "boys" | "girls";
export const SECTION_LABEL: Record<Section, string> = { boys: "بنين", girls: "بنات" };

export type StageLevel = "primary" | "intermediate" | "secondary";
export const STAGE_LABEL: Record<StageLevel, string> = {
  primary: "المرحلة الابتدائية",
  intermediate: "المرحلة المتوسطة",
  secondary: "المرحلة الثانوية",
};

export type GrantKey = "supervisor_sensitive_data" | "health_all_projects" | "approve_invoices" | "edit_templates";
export const GRANT_LABEL: Record<GrantKey, string> = {
  supervisor_sensitive_data: "البيانات الحساسة للمشرفين",
  health_all_projects: "الملف الصحي لكل المشاريع",
  approve_invoices: "اعتماد الفواتير",
  edit_templates: "تعديل القوالب",
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  proposal: "مقترح",
  active: "قيد التنفيذ",
  closed: "مغلق",
  archived: "مؤرشف",
  cancelled: "ملغى",
};

export const PHASE_NAMES = [
  "المقترح والاعتماد",
  "التخطيط",
  "التسجيل والاستقطاب",
  "التجهيز والإعداد",
  "التنفيذ والمتابعة",
  "الإغلاق والتقييم",
] as const;

export type RoleAssignment = { role: Role; section: Section | null; stage_level: StageLevel | null };

export function describeAssignment(a: RoleAssignment) {
  const parts = [ROLE_LABEL[a.role]];
  if (a.stage_level) parts.push(STAGE_LABEL[a.stage_level].replace("المرحلة ", ""));
  if (a.section) parts.push(SECTION_LABEL[a.section]);
  return parts.join(" · ");
}

/** ترتيب أولوية الدور الافتراضي عند تعدد الأدوار */
export function defaultRole(roles: Role[]): Role | null {
  for (const r of ROLES) if (roles.includes(r)) return r;
  return null;
}

// ------------------------------------------------------------------ القائمة الرئيسية

export type IconName =
  | "home" | "projects" | "task" | "calendar" | "users" | "wallet" | "package" | "megaphone"
  | "book" | "id-card" | "settings" | "chart" | "flag" | "checklist" | "chat" | "user" | "success"
  | "coins" | "camera" | "clock" | "archive" | "bell" | "menu" | "search" | "chevron-down" | "warning"
  | "info" | "lock" | "view" | "hide" | "back" | "forward" | "close" | "logout" | "export" | "shield"
  | "mail" | "phone" | "check" | "plus" | "trash" | "up" | "down" | "copy" | "whatsapp" | "edit"
  | "link" | "send" | "block" | "flight" | "star";

export type NavKey =
  | "home" | "projects" | "tasks" | "calendar" | "participants" | "finance"
  | "needs" | "media" | "knowledge" | "people" | "settings";

export type NavItem = {
  key: NavKey;
  label: string;
  icon: IconName;
  href: string;
  /** المرحلة التي تُبنى فيها الصفحة (حسب ترتيب البناء في ملف التسليم) */
  phase: number;
  roles: readonly Role[] | "all";
};

const INTERNAL: readonly Role[] = ROLES.filter((r) => r !== "design_vendor");
const FIELD: readonly Role[] = ["top_management", "project_manager", "stage_leader", "project_leader", "committee_head", "supervisor"];

export const NAV: readonly NavItem[] = [
  { key: "home", label: "لوحتي", icon: "home", href: "/", phase: 3, roles: "all" },
  { key: "projects", label: "المشاريع", icon: "projects", href: "/projects", phase: 2, roles: [...FIELD, "accountant"] },
  { key: "tasks", label: "المهام", icon: "task", href: "/tasks", phase: 3, roles: FIELD },
  { key: "calendar", label: "التقويم والاجتماعات", icon: "calendar", href: "/calendar", phase: 8, roles: INTERNAL },
  { key: "participants", label: "المشاركون", icon: "users", href: "/participants", phase: 6, roles: FIELD },
  { key: "finance", label: "المالية", icon: "wallet", href: "/finance", phase: 5, roles: ["top_management", "project_manager", "stage_leader", "accountant"] },
  { key: "needs", label: "الاحتياجات والطلبات", icon: "package", href: "/needs", phase: 4, roles: [...FIELD, "warehouse_manager", "design_vendor"] },
  { key: "media", label: "الإعلام", icon: "megaphone", href: "/media", phase: 7, roles: FIELD },
  { key: "knowledge", label: "المعرفة", icon: "book", href: "/knowledge", phase: 8, roles: INTERNAL },
  { key: "people", label: "الأشخاص والفرق", icon: "id-card", href: "/people", phase: 3, roles: ["top_management", "project_manager", "stage_leader", "project_leader"] },
  { key: "settings", label: "الإدارة والإعدادات", icon: "settings", href: "/settings", phase: 1, roles: ["top_management", "project_manager"] },
];

export function navFor(role: Role | null, grants: readonly GrantKey[] = []): NavItem[] {
  if (!role) return NAV.filter((n) => n.key === "home");
  return NAV.filter(
    (n) =>
      n.roles === "all" ||
      n.roles.includes(role) ||
      // من مُنح «تعديل القوالب» يصل لأنواع المشاريع والقوالب في الإعدادات
      (n.key === "settings" && role !== "design_vendor" && grants.includes("edit_templates")),
  );
}

export function canSeeNav(role: Role | null, key: NavKey, grants: readonly GrantKey[] = []) {
  return navFor(role, grants).some((n) => n.key === key);
}

// ------------------------------------------------------------------ مساحة المشروع

export type ProjectTab = { slug: string; label: string; icon: IconName; phase: number };

export const PROJECT_TABS: readonly ProjectTab[] = [
  { slug: "", label: "نظرة عامة", icon: "chart", phase: 2 },
  { slug: "card", label: "البطاقة والملف", icon: "id-card", phase: 6 },
  { slug: "stages", label: "المراحل والجاهزية", icon: "flag", phase: 2 },
  { slug: "team", label: "الفريق واللجان", icon: "users", phase: 3 },
  { slug: "schedule", label: "الجدول", icon: "calendar", phase: 4 },
  { slug: "tasks", label: "المهام", icon: "checklist", phase: 3 },
  { slug: "meetings", label: "الاجتماعات والقرارات", icon: "chat", phase: 7 },
  { slug: "participants", label: "المشاركون والمجموعات", icon: "user", phase: 6 },
  { slug: "attendance", label: "الحضور", icon: "success", phase: 7 },
  { slug: "budget", label: "الميزانية والمصروفات", icon: "coins", phase: 5 },
  { slug: "needs", label: "الاحتياجات", icon: "package", phase: 4 },
  { slug: "media", label: "الإعلامية", icon: "camera", phase: 7 },
  { slug: "changes", label: "سجل التغييرات", icon: "clock", phase: 7 },
  { slug: "closing", label: "الإغلاق والأرشيف", icon: "archive", phase: 8 },
];

export const BUILD_PHASE_NAME: Record<number, string> = {
  0: "الأساس",
  1: "الإعدادات",
  2: "المقترح والاعتماد",
  3: "الفريق والمهام",
  4: "التخطيط",
  5: "المالية",
  6: "التسجيل",
  7: "التنفيذ",
  8: "الإغلاق والمعرفة",
};
