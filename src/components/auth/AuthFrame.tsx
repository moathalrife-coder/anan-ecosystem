import type { ReactNode } from "react";
import { Mark } from "@/components/ui/Mark";

/** إطار صفحات الدخول: لوحة الهوية الداكنة + النموذج */
export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh box-border p-3 min-[900px]:p-4 flex flex-col min-[900px]:flex-row gap-4 items-stretch max-w-[1416px] mx-auto">
      <section
        aria-label="عنان"
        className="relative overflow-hidden rounded-[24px] bg-navy text-white p-6 min-[900px]:p-10 flex flex-col justify-between gap-6 min-[900px]:min-h-[560px] min-[900px]:flex-1"
      >
        <span
          aria-hidden
          className="absolute inset-0 opacity-[.12]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px,#ffffff 1.5px,transparent 0)", backgroundSize: "28px 28px" }}
        />
        <span aria-hidden className="hidden min-[900px]:block absolute rounded-full border-[40px] border-orange opacity-90 w-[360px] h-[360px] -start-[120px] -bottom-[140px]" />
        <span aria-hidden className="hidden min-[900px]:block absolute rounded-full border-[22px] border-blue w-[160px] h-[160px] end-[60px] top-[120px]" />
        <div className="relative flex items-center gap-3">
          <Mark size={44} />
          <span className="font-display font-bold text-[24px]">عنان</span>
        </div>
        <div className="relative flex flex-col gap-2.5 max-w-[460px]">
          <b className="font-display text-[28px] leading-[40px] min-[900px]:text-[34px] min-[900px]:leading-[48px]">
            منظومة عنان
            <br />
            لإدارة المشاريع
          </b>
          <span className="hidden min-[900px]:block text-[16px] leading-7 text-on-navy-strong">
            من المقترح إلى الأرشيف: الفريق، واللجان، والمهام، والمالية، في مكان واحد.
          </span>
        </div>
        <span className="relative hidden min-[900px]:block text-[13px] text-on-navy">مؤسسة عنان التربوية</span>
      </section>
      <section className="min-[900px]:flex-1 flex items-center justify-center px-1 pt-2 pb-6 min-[900px]:p-6">
        <div className="w-full max-w-[420px] flex flex-col gap-[18px]">
          {children}
          <span className="text-[13px] text-muted text-center">
            بالدخول توافق على سياسة استخدام المنظومة وحماية بيانات المشاركين.
          </span>
        </div>
      </section>
    </div>
  );
}

export function AuthHeading({ title, sub }: { title: string; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="m-0 font-display text-[28px] leading-10 text-navy">{title}</h1>
      {sub && <span className="text-[14px] leading-[22px] text-muted">{sub}</span>}
    </div>
  );
}
