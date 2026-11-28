import type { ReactNode } from "react";

/** عنوان كل صفحة في بلاطة داكنة مستقلة تحت الهيدر */
export function TitleTile({
  crumb,
  title,
  meta,
  actions,
}: {
  crumb?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="print-flat bg-navy-soft rounded-[20px] p-4 sm:px-6 sm:py-5 text-white flex flex-wrap gap-4 items-end justify-between">
      <div className="flex flex-col gap-1.5 min-w-0">
        {crumb && <span className="text-[13px] text-on-navy">{crumb}</span>}
        <h1 className="m-0 font-display text-[24px] leading-[34px] font-semibold">{title}</h1>
        {meta && <div className="flex flex-wrap gap-x-4 gap-y-2 text-[14px] text-on-navy-strong">{meta}</div>}
      </div>
      {actions && <div className="no-print flex flex-wrap gap-2">{actions}</div>}
    </section>
  );
}
