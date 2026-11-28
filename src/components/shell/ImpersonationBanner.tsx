import { Icon } from "@/components/ui/Icon";
import { endImpersonation } from "@/app/(app)/actions";
import type { CurrentUser } from "@/lib/auth/session";

/** شريط برتقالي ثابت طوال الدخول بحساب شخص آخر */
export function ImpersonationBanner({ user }: { user: CurrentUser }) {
  if (!user.impersonating) return null;
  return (
    <div
      role="status"
      className="no-print sticky top-0 z-40 max-w-[1416px] mx-auto mb-3 bg-orange text-navy rounded-[12px] px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2"
    >
      <Icon name="shield" size={22} />
      <span className="flex-1 min-w-[200px] text-[14px] leading-[22px]">
        أنت داخل بحساب <b>{user.fullName}</b>
        {user.impersonationReason && <> · السبب: {user.impersonationReason}</>}. كل فعل يُسجَّل باسمك
        {user.realName && <> ({user.realName})</>}.
      </span>
      <form action={endImpersonation}>
        <button type="submit" className="min-h-10 px-4 rounded-[12px] bg-navy text-white font-semibold text-[14px] cursor-pointer">
          إنهاء والعودة لحسابي
        </button>
      </form>
    </div>
  );
}
