import { Mark } from "@/components/ui/Mark";
import { formatDate } from "@/lib/format";

/** ترويسة وتذييل يظهران في التصدير فقط: الشعار والألوان والعنوان والتاريخ. */
export function PrintHeader({ title }: { title: string }) {
  return (
    <div className="print-only">
      <div className="flex items-center justify-between gap-4 pb-3 mb-4 border-b-4 border-orange">
        <div className="flex items-center gap-3">
          <span className="inline-flex rounded-[10px] bg-navy p-1.5">
            <Mark size={36} />
          </span>
          <div className="flex flex-col">
            <span className="font-display font-bold text-[18px] text-navy">مؤسسة عنان التربوية</span>
            <span className="text-[12px] text-muted">منظومة إدارة المشاريع</span>
          </div>
        </div>
        <div className="flex flex-col items-end">
          <span className="font-display font-semibold text-[16px] text-navy">{title}</span>
          <span className="text-[12px] text-muted">تاريخ التصدير: {formatDate(new Date())}</span>
        </div>
      </div>
    </div>
  );
}
