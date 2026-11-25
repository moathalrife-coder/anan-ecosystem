import { ButtonLink } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="bg-surface rounded-[12px] shadow-[var(--shadow-card)] p-6 max-w-[440px] w-full flex flex-col gap-3 text-center items-center">
        <Icon name="search" size={32} className="text-blue" />
        <h1 className="m-0 font-display text-[22px]">الصفحة غير موجودة</h1>
        <p className="m-0 text-[14px] leading-[22px] text-muted">الرابط غير صحيح، أو أن ما تبحث عنه ليس ضمن صلاحياتك.</p>
        <ButtonLink href="/">العودة إلى لوحتي</ButtonLink>
      </div>
    </main>
  );
}
