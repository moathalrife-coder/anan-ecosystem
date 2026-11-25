import { notFound } from "next/navigation";
import { PROJECT_TABS } from "@/lib/roles";
import { Planned } from "@/components/pages/Planned";

const POINTS: Record<string, string[]> = {
  card: ["البطاقة، والملف التسويقي وإخراجه (تلقائي بهوية عنان أو لماي اي أو الاثنين)، والمستندات."],
  stages: ["المراحل الست ومتطلباتها (تلقائي ويدوي)، وطلب الانتقال، وطلب الاستثناء بسبب."],
  team: ["اختيار المشرفين من الدليل بفلاتر وبحث، وتعيين مسؤول لكل لجنة، ثم الرفع للاعتماد."],
  schedule: ["جدول اللقاءات وبرنامج كل لقاء. مجموع الفقرات لا يتجاوز نافذة اللقاء، والحفظ يُمنع عند التجاوز."],
  tasks: ["كل مهام المشروع بمخرجاتها، والتسليم، والمراجعة."],
  meetings: ["المحاضر والقرارات والتوصيات. التوصية تتحول لمهمة."],
  participants: ["التسجيل من المتجر، والمجموعات، والملف الصحي بصلاحياته."],
  attendance: ["شاشة المشرف الميدانية (للتابلت): حضور بسيط، ولحظات اللقاء."],
  budget: ["البنود، والعهد، والفواتير مع القراءة الآلية."],
  needs: ["طلبات اللجان: المستودع أولاً، ثم الشراء، ثم الاستعارة."],
  media: ["خطة الإعلام للمشروع ومتطلباته."],
  changes: ["كل تغيير على المشروع بعد اعتماده، وطلب التغيير واعتماده."],
  closing: ["التقييم الختامي، والتقرير، والأرشيف للقراءة فقط."],
};

export default async function ProjectTab({ params }: PageProps<"/projects/[id]/[tab]">) {
  const { tab } = await params;
  const def = PROJECT_TABS.find((t) => t.slug === tab && t.slug !== "");
  if (!def) notFound();
  return <Planned phase={def.phase} icon={def.icon} points={POINTS[tab] ?? []} />;
}
