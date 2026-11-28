import type { ReactNode } from "react";

/** عمود المحتوى الرئيسي بجانب الأشرطة */
export function PageBody({ children }: { children: ReactNode }) {
  return <main className="flex-1 min-w-0 flex flex-col gap-4">{children}</main>;
}
