"use client";

import { Icon } from "@/components/ui/Icon";
import { buttonClass } from "@/components/ui/Button";

/** التصدير PDF الأساسي: يفتح نافذة الطباعة بقالب عنان (احفظ كـ PDF). */
export function ExportButton({ onNavy = false }: { onNavy?: boolean }) {
  return (
    <button type="button" onClick={() => window.print()} className={buttonClass(onNavy ? "onNavy" : "ghost")}>
      <Icon name="export" size={20} />
      تصدير PDF
    </button>
  );
}
