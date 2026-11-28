import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { TitleTile } from "@/components/shell/TitleTile";
import { PageBody } from "@/components/pages/PageBody";
import { Planned } from "@/components/pages/Planned";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { GRANT_LABEL, ROLE_LABEL, describeAssignment, navFor } from "@/lib/roles";
import { PLANNED_POINTS } from "@/lib/pages";

export const metadata: Metadata = { title: "لوحتي" };

export default async function HomePage() {
  const user = await getCurrentUser();
  const nav = navFor(user.activeRole, user.grants).filter((n) => n.key !== "home");
  return (
    <PageBody>
      <TitleTile
        crumb="لوحتي"
        title={`أهلاً ${user.fullName}`}
        meta={user.activeRole ? <span>تعرض المنظومة الآن بصفة {ROLE_LABEL[user.activeRole]}</span> : undefined}
      />

      <div className="grid gap-4 grid-cols-1 xl:grid-cols-12 items-start">
        <Card className="xl:col-span-5">
          <CardTitle>
            <Icon name="id-card" size={24} className="text-blue" />
            أدوارك وصلاحياتك
          </CardTitle>
          {user.assignments.length === 0 ? (
            <Caption>لم يُسند لك دور بعد. تواصل مع مدير المشاريع.</Caption>
          ) : (
            <div className="flex flex-wrap gap-2">
              {user.assignments.map((a, i) => (
                <Badge key={i} tone="info">{describeAssignment(a)}</Badge>
              ))}
            </div>
          )}
          {user.grants.length > 0 && (
            <>
              <p className="m-0 text-[15px] font-semibold">صلاحيات إضافية</p>
              <div className="flex flex-wrap gap-2">
                {user.grants.map((g) => (
                  <Badge key={g} tone="success">{GRANT_LABEL[g]}</Badge>
                ))}
              </div>
            </>
          )}
          <Caption>
            الصلاحيات تُفرض في قاعدة البيانات نفسها، وكل منح أو سحب لها يُسجَّل في سجل التدقيق.
          </Caption>
        </Card>

        <Card className="xl:col-span-7">
          <CardTitle>
            <Icon name="projects" size={24} className="text-blue" />
            اذهب إلى
          </CardTitle>
          <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
            {nav.map((n) => (
              <ButtonLink key={n.key} href={n.href} variant="ghost" className="justify-start">
                <Icon name={n.icon} size={20} className="text-blue" />
                {n.label}
              </ButtonLink>
            ))}
          </div>
        </Card>

        <div className="xl:col-span-12">
          <Planned phase={3} icon="home" points={PLANNED_POINTS.home} />
        </div>
      </div>
    </PageBody>
  );
}
