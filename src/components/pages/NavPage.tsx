import { getCurrentUser } from "@/lib/auth/session";
import { NAV, canSeeNav, type NavKey } from "@/lib/roles";
import { PLANNED_POINTS } from "@/lib/pages";
import { TitleTile } from "@/components/shell/TitleTile";
import { PageBody } from "./PageBody";
import { Planned } from "./Planned";
import { Forbidden } from "./Forbidden";

/** صفحة من القائمة الرئيسية لم تُبنَ بعد: تتحقق من الدور وتعرض ما ستحتويه. */
export async function NavPage({ navKey }: { navKey: NavKey }) {
  const item = NAV.find((n) => n.key === navKey)!;
  const user = await getCurrentUser();
  if (!canSeeNav(user.activeRole, navKey, user.grants)) return <Forbidden title={item.label} />;
  return (
    <PageBody>
      <TitleTile title={item.label} />
      <Planned phase={item.phase} icon={item.icon} points={PLANNED_POINTS[navKey]} />
    </PageBody>
  );
}
