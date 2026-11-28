import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { listProjects } from "@/lib/data/projects";
import { canSeeNav, PHASE_NAMES, PROJECT_STATUS_LABEL, SECTION_LABEL, STAGE_LABEL } from "@/lib/roles";
import { TitleTile } from "@/components/shell/TitleTile";
import { PageBody } from "@/components/pages/PageBody";
import { Forbidden } from "@/components/pages/Forbidden";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { ExportButton } from "@/components/export/ExportButton";
import { PrintHeader } from "@/components/export/PrintFrame";

export const metadata: Metadata = { title: "المشاريع" };

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!canSeeNav(user.activeRole, "projects", user.grants)) return <Forbidden title="المشاريع" />;
  const projects = await listProjects();

  return (
    <PageBody>
      <PrintHeader title="المشاريع" />
      <TitleTile
        crumb="المشاريع"
        title="المشاريع"
        meta={<span>{projects.length} مشروع ضمن صلاحياتك</span>}
        actions={projects.length > 0 ? <ExportButton onNavy /> : undefined}
      />
      <Card>
        {projects.length === 0 ? (
          <>
            <CardTitle>
              <Icon name="projects" size={24} className="text-blue" />
              لا توجد مشاريع ضمن صلاحياتك بعد
            </CardTitle>
            <Caption>
              المشاريع تُنشأ من تعميد المقترحات (المرحلة 2). كل دور يرى هنا ما يخصه فقط: قائد المرحلة مشاريع مرحلته وقسمه،
              وقائد المشروع مشروعه، والمشرف المشاريع التي هو في فريقها.
            </Caption>
          </>
        ) : (
          <div className="border border-line rounded-[12px] overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#e8eef8] text-muted">
                  {["المشروع", "القسم", "المرحلة الدراسية", "مرحلة المشروع", "الحالة", "قائد المشروع"].map((h) => (
                    <th key={h} className="text-start font-semibold px-3 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p.id} className="border-t border-line hover:bg-soft">
                    <td className="px-3 py-2.5 font-semibold min-w-[180px]">
                      <Link href={`/projects/${p.id}`} className="no-underline inline-flex items-center gap-2 min-h-10">
                        <Icon name="projects" size={20} />
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{SECTION_LABEL[p.section]}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{STAGE_LABEL[p.stage_level]}</td>
                    <td className="px-3 py-2.5 min-w-[140px]">{p.current_phase}. {PHASE_NAMES[p.current_phase - 1]}</td>
                    <td className="px-3 py-2.5"><Badge tone="info">{PROJECT_STATUS_LABEL[p.status] ?? p.status}</Badge></td>
                    <td className="px-3 py-2.5 min-w-[140px]">{p.leader?.full_name ?? "لم يُحدد"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageBody>
  );
}
