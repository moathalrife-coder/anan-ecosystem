import { getCurrentUser } from "@/lib/auth/session";
import { settingsAccess } from "@/lib/settings";
import { TitleTile } from "@/components/shell/TitleTile";
import { PageBody } from "@/components/pages/PageBody";
import { Forbidden } from "@/components/pages/Forbidden";
import { SectionTabs } from "@/components/settings/SectionTabs";
import { Badge } from "@/components/ui/Badge";

export default async function SettingsLayout({ children }: LayoutProps<"/settings">) {
  const user = await getCurrentUser();
  const access = settingsAccess(user);
  if (access.sections.length === 0) return <Forbidden title="الإدارة والإعدادات" />;
  return (
    <PageBody>
      <TitleTile
        crumb="منظومة عنان"
        title="الإدارة والإعدادات"
        meta={
          <>
            <span>المستخدمون، والقوالب، وبيانات المؤسسة</span>
            {access.readOnly && (
              <span className="inline-flex">
                <Badge tone="info">عرض فقط</Badge>
              </span>
            )}
          </>
        }
      />
      <SectionTabs allowed={access.sections} />
      {children}
    </PageBody>
  );
}
