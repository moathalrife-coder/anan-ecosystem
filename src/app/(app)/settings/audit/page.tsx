import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { canSeeNav } from "@/lib/roles";
import { formatDateTime } from "@/lib/format";
import { TitleTile } from "@/components/shell/TitleTile";
import { PageBody } from "@/components/pages/PageBody";
import { Forbidden } from "@/components/pages/Forbidden";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ExportButton } from "@/components/export/ExportButton";
import { PrintHeader } from "@/components/export/PrintFrame";

export const metadata: Metadata = { title: "سجل التدقيق" };

const ACTION_LABEL: Record<string, string> = {
  "role.grant": "منح دور",
  "role.revoke": "سحب دور",
  "role.change": "تعديل دور",
  "grant.give": "منح صلاحية إضافية",
  "grant.revoke": "سحب صلاحية إضافية",
  "user.status": "تغيير حالة حساب",
  "invitation.create": "إرسال دعوة",
  "invitation.revoke": "إلغاء دعوة",
  "invitation.accept": "قبول دعوة",
  "impersonation.start": "دخول بحساب شخص آخر",
  "impersonation.end": "إنهاء الدخول بحساب آخر",
  "project.create": "إنشاء مشروع",
  "project.change": "تغيير على مشروع",
};

type Row = {
  id: number;
  at: string;
  action: string;
  entity: string;
  entity_id: string | null;
  reason: string | null;
  payload: Record<string, unknown>;
  actor_id: string | null;
  on_behalf_of: string | null;
};

const PAGE = 50;

export default async function AuditPage({ searchParams }: PageProps<"/settings/audit">) {
  const user = await getCurrentUser();
  if (!canSeeNav(user.activeRole, "settings")) return <Forbidden title="سجل التدقيق" />;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);

  const supabase = await createClient();
  const { data, count } = await supabase
    .from("audit_log")
    .select("id, at, action, entity, entity_id, reason, payload, actor_id, on_behalf_of", { count: "exact" })
    .order("id", { ascending: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  const rows = (data ?? []) as Row[];

  const ids = Array.from(new Set(rows.flatMap((r) => [r.actor_id, r.on_behalf_of]).filter(Boolean))) as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    (ps ?? []).forEach((p) => names.set(p.id as string, p.full_name as string));
  }
  const who = (id: string | null) => (id ? names.get(id) ?? "مستخدم" : "النظام");
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));

  return (
    <PageBody>
      <PrintHeader title="سجل التدقيق" />
      <TitleTile
        crumb={<Link href="/settings" className="text-on-navy hover:text-white">الإدارة والإعدادات</Link>}
        title="سجل التدقيق"
        meta={<span>{count ?? 0} سجل · للقراءة فقط</span>}
        actions={<ExportButton onNavy />}
      />
      <Card>
        {rows.length === 0 ? (
          <>
            <CardTitle>
              <Icon name="clock" size={24} className="text-blue" />
              لا توجد سجلات بعد
            </CardTitle>
            <Caption>ستظهر هنا كل عملية حساسة فور حدوثها.</Caption>
          </>
        ) : (
          <div className="border border-line rounded-[12px] overflow-x-auto">
            <table className="w-full border-collapse text-[14px]">
              <thead>
                <tr className="bg-[#e8eef8] text-muted">
                  {["الوقت", "العملية", "الفاعل", "بحساب", "السبب"].map((h) => (
                    <th key={h} className="text-start font-semibold px-3 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-line align-top">
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDateTime(r.at)}</td>
                    <td className="px-3 py-2.5 min-w-[160px] font-semibold">{ACTION_LABEL[r.action] ?? r.action}</td>
                    <td className="px-3 py-2.5 min-w-[120px]">{who(r.actor_id)}</td>
                    <td className="px-3 py-2.5 min-w-[120px]">{r.on_behalf_of ? who(r.on_behalf_of) : "—"}</td>
                    <td className="px-3 py-2.5 min-w-[160px]">{r.reason ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {pages > 1 && (
          <nav aria-label="الصفحات" className="no-print flex items-center justify-between gap-2">
            {page > 1 ? <Link href={`?page=${page - 1}`} className="min-h-10 inline-flex items-center">الأحدث</Link> : <span />}
            <span className="text-[14px] text-muted">صفحة {page} من {pages}</span>
            {page < pages ? <Link href={`?page=${page + 1}`} className="min-h-10 inline-flex items-center">الأقدم</Link> : <span />}
          </nav>
        )}
      </Card>
    </PageBody>
  );
}
