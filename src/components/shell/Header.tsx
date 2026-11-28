import { Icon } from "@/components/ui/Icon";
import { Mark } from "@/components/ui/Mark";
import { DropMenu } from "./DropMenu";
import { NavList } from "./Rail";
import { setActiveRole, signOut } from "@/app/(app)/actions";
import { ROLE_LABEL, describeAssignment, type NavItem } from "@/lib/roles";
import type { CurrentUser } from "@/lib/auth/session";

const onNavyBtn =
  "inline-flex items-center justify-center gap-2 min-h-10 rounded-[12px] text-white font-semibold text-[14px]";

function RoleItems({ user }: { user: CurrentUser }) {
  return (
    <>
      <p className="m-0 px-3 pt-1 pb-2 text-[13px] text-muted">اعرض المنظومة بصفة:</p>
      {user.roles.map((r) => (
        <form key={r} action={setActiveRole}>
          <input type="hidden" name="role" value={r} />
          <button
            type="submit"
            aria-pressed={r === user.activeRole}
            className={`w-full flex items-center gap-2.5 px-3 min-h-11 rounded-[8px] text-[15px] text-start cursor-pointer ${
              r === user.activeRole ? "bg-blue-tint text-blue font-semibold" : "hover:bg-blue/5"
            }`}
          >
            <Icon name={r === user.activeRole ? "check" : "user"} size={18} />
            {ROLE_LABEL[r]}
          </button>
        </form>
      ))}
    </>
  );
}

export function Header({ user, nav }: { user: CurrentUser; nav: NavItem[] }) {
  const initial = user.fullName.trim().charAt(0) || "؟";
  return (
    <header className="no-print max-w-[1416px] mx-auto bg-navy-soft rounded-[20px] h-16 px-3 sm:px-5 flex items-center gap-3 sm:gap-4 text-white">
      {/* زر القائمة: تحت 560px فقط */}
      <DropMenu
        className="sm:hidden"
        summaryLabel="القائمة الرئيسية"
        summaryClassName={`${onNavyBtn} w-11 h-11`}
        summary={<Icon name="menu" size={24} />}
        panelClassName="start-0 w-[min(320px,calc(100vw-24px))] max-h-[75dvh] overflow-y-auto"
      >
        <NavList items={nav} />
        {user.roles.length > 1 && (
          <div className="border-t border-line mt-1 pt-1">
            <RoleItems user={user} />
          </div>
        )}
      </DropMenu>

      <div className="flex items-center gap-2.5 flex-none">
        <Mark size={34} />
        <span className="font-display font-bold text-[18px]">عنان</span>
        <span className="hidden md:inline text-[13px] text-on-navy">منظومة إدارة المشاريع</span>
      </div>

      <div className="ms-auto flex items-center gap-2 sm:gap-3">
        {user.roles.length > 0 && (
          <DropMenu
            className="hidden sm:block"
            summaryLabel="تبديل الدور"
            summaryClassName={`${onNavyBtn} px-4 bg-white/10 border border-white/20 hover:bg-white/15`}
            summary={
              <>
                <Icon name="user" size={20} />
                {user.activeRole ? ROLE_LABEL[user.activeRole] : "بدون دور"}
                {user.roles.length > 1 && <Icon name="chevron-down" size={16} />}
              </>
            }
            panelClassName="end-0 min-w-[240px]"
          >
            {user.roles.length > 1 ? (
              <RoleItems user={user} />
            ) : (
              <p className="m-0 px-3 py-2 text-[14px] text-muted">لديك دور واحد. يضيف مدير المشاريع الأدوار من الإعدادات.</p>
            )}
          </DropMenu>
        )}

        <DropMenu
          summaryLabel="الإشعارات"
          summaryClassName={`${onNavyBtn} w-10 hover:bg-white/10`}
          summary={<Icon name="bell" size={22} />}
          panelClassName="end-0 w-[min(320px,calc(100vw-24px))]"
        >
          <p className="m-0 px-3 pt-1 font-semibold text-[15px]">الإشعارات</p>
          <p className="m-0 px-3 pb-2 text-[14px] leading-[22px] text-muted">
            لا توجد إشعارات. ستصلك هنا التكليفات والاعتمادات والتنبيهات حين تُفعَّل.
          </p>
        </DropMenu>

        <DropMenu
          summaryLabel="حسابي"
          summaryClassName="w-10 h-10 rounded-full bg-[#8eaddf] text-navy inline-flex items-center justify-center font-semibold text-[15px]"
          summary={<span aria-hidden>{initial}</span>}
          panelClassName="end-0 w-[min(300px,calc(100vw-24px))]"
        >
          <div className="px-3 pt-1 pb-2 flex flex-col gap-1">
            <span className="font-semibold text-[15px]">{user.fullName}</span>
            <span className="text-[13px] text-muted" dir="ltr" style={{ textAlign: "right" }}>{user.email}</span>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {user.assignments.map((a, i) => (
                <span key={i} className="inline-flex items-center min-h-7 px-2.5 rounded-full text-[12.5px] font-semibold bg-page">
                  {describeAssignment(a)}
                </span>
              ))}
            </div>
          </div>
          <form action={signOut} className="border-t border-line pt-1">
            <button type="submit" className="w-full flex items-center gap-2.5 px-3 min-h-11 rounded-[8px] text-[15px] text-start cursor-pointer hover:bg-danger-bg hover:text-danger">
              <Icon name="logout" size={20} />
              تسجيل الخروج
            </button>
          </form>
        </DropMenu>
      </div>
    </header>
  );
}
