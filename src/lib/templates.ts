/**
 * الأحداث التي يمكن أن تُكمل متطلباً تلقائياً. كل حدث يُبنى منطقه في مرحلته؛
 * القالب يربط المتطلب بالحدث فقط. لا يُضاف حدث هنا إلا مع منطقه في المنظومة.
 */
export const AUTO_EVENTS: { key: string; label: string; phase: number }[] = [
  { key: "proposal.approved", label: "تعميد المقترح", phase: 2 },
  { key: "proposal.budget_approved", label: "اعتماد الميزانية التقديرية", phase: 2 },
  { key: "schedule.sent", label: "إرسال الجدول للفريق", phase: 4 },
  { key: "team.approved", label: "اعتماد الفريق", phase: 3 },
  { key: "committee_plans.complete", label: "اكتمال خطط اللجان المفعّلة", phase: 4 },
  { key: "budget.detailed", label: "اكتمال الميزانية التفصيلية", phase: 5 },
  { key: "marketing.complete", label: "اكتمال الملف التسويقي", phase: 6 },
  { key: "store.open", label: "فتح التسجيل في المتجر", phase: 6 },
  { key: "registrations.target_80", label: "بلوغ 80% من المستهدف", phase: 6 },
  { key: "sites.checked", label: "فحص كل المواقع", phase: 4 },
  { key: "needs.first_meeting_reserved", label: "حجز احتياجات اللقاء الأول", phase: 4 },
  { key: "groups.assigned", label: "توزيع المجموعات ومشرفيها", phase: 6 },
  { key: "logistics_plan.approved", label: "اعتماد خطة اللوجستية", phase: 4 },
  { key: "meetings.all_done", label: "تنفيذ كل اللقاءات", phase: 7 },
  { key: "minutes.all_closed", label: "إغلاق كل المحاضر", phase: 7 },
  { key: "custody.settled", label: "تسوية العهد", phase: 5 },
  { key: "evaluation.complete", label: "اكتمال التقييم الختامي", phase: 8 },
];

export const OWNER_SUGGESTIONS = [
  "قائد المشروع",
  "قائد المرحلة",
  "مدير المشاريع",
  "المحاسب",
  "مسؤولو اللجان",
  "اللجنة الإعلامية",
  "اللجنة اللوجستية",
  "مسؤول اللجنة اللوجستية",
  "سلسلة الاعتماد",
];

export type TemplateKind = "site_check" | "media_recommendation" | "segment_type" | "knowledge_category";

export const TEMPLATE_TABS: {
  key: "stages" | TemplateKind;
  label: string;
  desc: string;
  groupLabel?: string;
  hasColor?: boolean;
}[] = [
  { key: "stages", label: "متطلبات المراحل", desc: "ما يلزم لكل مرحلة من المراحل الست، ومصدر كل متطلب." },
  { key: "site_check", label: "فحص المواقع", desc: "بنود فحص كل نوع موقع.", groupLabel: "نوع الموقع" },
  { key: "media_recommendation", label: "توصيات الإعلامية", desc: "ما يُقترح تصويره لكل نوع مادة.", groupLabel: "نوع المادة" },
  { key: "segment_type", label: "أنواع الفقرات", desc: "أنواع فقرات برنامج اللقاء وألوانها.", hasColor: true },
  { key: "knowledge_category", label: "تصنيفات المعرفة", desc: "تصنيفات التوصيات في قاعدة المعرفة." },
];
