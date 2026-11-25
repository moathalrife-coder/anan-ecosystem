import { Header } from "@/components/shell/Header";
import { Rail } from "@/components/shell/Rail";
import { ImpersonationBanner } from "@/components/shell/ImpersonationBanner";
import { getCurrentUser } from "@/lib/auth/session";
import { navFor } from "@/lib/roles";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const user = await getCurrentUser();
  const nav = navFor(user.activeRole);
  return (
    <div className="min-h-dvh p-3 box-border">
      <ImpersonationBanner user={user} />
      <Header user={user} nav={nav} />
      <div className="max-w-[1416px] mx-auto mt-4 flex gap-4 items-start">
        <Rail items={nav} />
        <div className="flex-1 min-w-0 flex gap-4 items-start">{children}</div>
      </div>
    </div>
  );
}
