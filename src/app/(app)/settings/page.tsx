import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeeNav } from "@/lib/roles";
import { PLANNED_POINTS } from "@/lib/pages";
import { TitleTile } from "@/components/shell/TitleTile";
import { PageBody } from "@/components/pages/PageBody";
import { Planned } from "@/components/pages/Planned";
import { Forbidden } from "@/components/pages/Forbidden";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";

export const metadata: Metadata = { title: "الإدارة والإعدادات" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!canSeeNav(user.activeRole, "settings")) return <Forbidden title="الإدارة والإعدادات" />;
  return (
    <PageBody>
      <TitleTile crumb="الإدارة والإعدادات" title="الإدارة والإعدادات" />
      <Card>
        <CardTitle>
          <Icon name="shield" size={24} className="text-blue" />
          سجل التدقيق
        </CardTitle>
        <Caption>
          كل اعتماد، ومنح أو سحب صلاحية، وعملية مالية، ودخول بحساب شخص آخر. للإضافة فقط: لا يُعدَّل ولا يُحذف، حتى من
          مدير المشاريع.
        </Caption>
        <div>
          <ButtonLink href="/settings/audit">
            <Icon name="clock" size={20} />
            فتح سجل التدقيق
          </ButtonLink>
        </div>
      </Card>
      <Planned phase={1} icon="settings" points={PLANNED_POINTS.settings} />
    </PageBody>
  );
}
