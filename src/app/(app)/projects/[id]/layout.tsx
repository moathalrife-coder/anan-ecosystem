import { notFound } from "next/navigation";
import { getProject } from "@/lib/data/projects";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeNav, SECTION_LABEL, STAGE_LABEL } from "@/lib/roles";
import { ProjectTabsAside, ProjectTabsDropdown } from "@/components/shell/ProjectTabs";
import { TitleTile } from "@/components/shell/TitleTile";
import { PageBody } from "@/components/pages/PageBody";
import { Forbidden } from "@/components/pages/Forbidden";

export default async function ProjectLayout({ children, params }: LayoutProps<"/projects/[id]">) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!canSeeNav(user.activeRole, "projects")) return <Forbidden title="المشاريع" />;
  // RLS: إن لم يكن المشروع ضمن صلاحياته فلن يُرجَع أصلاً
  const project = await getProject(id);
  if (!project) notFound();

  return (
    <>
      <ProjectTabsAside projectId={project.id} />
      <PageBody>
        <TitleTile
          crumb={`المشاريع / ${STAGE_LABEL[project.stage_level]} · ${SECTION_LABEL[project.section]}`}
          title={project.name}
          meta={
            <>
              {project.season && <span>الموسم {project.season}</span>}
              <span>قائد المشروع: {project.leader?.full_name ?? "لم يُحدد"}</span>
            </>
          }
        />
        <ProjectTabsDropdown projectId={project.id} />
        {children}
      </PageBody>
    </>
  );
}
