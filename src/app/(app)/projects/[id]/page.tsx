import { getProject } from "@/lib/data/projects";
import { PHASE_NAMES } from "@/lib/roles";
import { Card } from "@/components/ui/Card";
import { Planned } from "@/components/pages/Planned";

export default async function ProjectOverview({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const project = (await getProject(id))!;
  return (
    <>
      <Card label="مراحل المشروع" className="grid! gap-x-2 gap-y-3 grid-cols-[repeat(auto-fit,minmax(150px,1fr))]">
        {PHASE_NAMES.map((name, i) => {
          const n = i + 1;
          const done = n < project.current_phase;
          const cur = n === project.current_phase;
          return (
            <div key={name} className="min-w-0 flex flex-col gap-2 p-1">
              <div className={`h-1.5 rounded-full ${done ? "bg-[#0d7a63]" : cur ? "bg-orange" : "bg-[#e8eef8]"}`} />
              <div className="flex items-center gap-2">
                <span
                  className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[12px] font-semibold flex-none ${
                    done ? "bg-success-bg text-[#0d7a63]" : cur ? "bg-orange text-navy" : "bg-[#e8eef8] text-muted"
                  }`}
                >
                  {n}
                </span>
                <span className="text-[14px] font-semibold">{name}</span>
              </div>
              <span className="text-[13px] text-muted">{done ? "مكتملة" : cur ? "المرحلة الحالية" : "لم تبدأ"}</span>
            </div>
          );
        })}
      </Card>
      <Planned
        phase={2}
        icon="chart"
        points={[
          "الجاهزية، والمتأخر والحرج، والميزانية.",
          "اللجان (كل لجنة تفتح صفحتها)، والمشاركون، وآخر التغييرات.",
        ]}
      />
    </>
  );
}
