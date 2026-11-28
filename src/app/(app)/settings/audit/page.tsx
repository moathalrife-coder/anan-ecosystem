import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { settingsSection } from "@/lib/settings-guard";
import { formatDateTime } from "@/lib/format";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { ExportButton } from "@/components/export/ExportButton";
import { PrintHeader } from "@/components/export/PrintFrame";
import { Forbidden } from "@/components/pages/Forbidden";
import { buttonClass } from "@/components/ui/Button";

export const metadata: Metadata = { title: "سجل التدقيق" };

const ACTION_LABEL: Record<string, string> = {
  "role.grant": "منح دور",
  "role.revoke": "سحب دور",
  "role.change": "تعديل دور",
  "grant.give": "منح صلاحية إضافية",
  "grant.revoke": "سحب صلاحية إضافية",
  "user.status": "تغيير حالة حساب",
  "user.contact": "تعديل بيانات مستخدم",
  "invitation.create": "إرسال دعوة",
  "invitation.revoke": "إلغاء دعوة",
  "invitation.accept": "قبول دعوة",
  "impersonation.start": "دخول بحساب شخص آخر",
  "impersonation.end": "إنهاء الدخول بحساب آخر",
  "project.create": "إنشاء مشروع",
  "project.change": "تغيير على مشروع",
  "settings.insert": "إضافة في الإعدادات",
  "settings.update": "تعديل في الإعدادات",
  "settings.delete": "حذف من الإعدادات",
};

const ENTITY_LABEL: Record<string, string> = {
  project_types: "أنواع المشاريع",
  phase_requirement_templates: "متطلبات المراحل",
  template_items: "القوالب",
  academic_terms: "التقويم الدراسي (الفصول)",
  calendar_events: "التقويم الدراسي (الإجازات)",
  organization: "بيانات المؤسسة",
};

/** تصنيفات الفلترة كما في التصميم */
const FILTERS: { key: string; label: string; prefixes: string[] }[] = [
  { key: "all", label: "الكل", prefixes: [] },
  { key: "approvals", label: "اعتمادات", prefixes: ["approval.", "proposal."] },
  { key: "permissions", label: "صلاحيات", prefixes: ["role.", "grant.", "user.", "invitation."] },
  { key: "finance", label: "مالية", prefixes: ["finance.", "invoice.", "custody."] },
  { key: "impersonation", label: "دخول بحساب", prefixes: ["impersonation."] },
  { key: "settings", label: "الإعدادات", prefixes: ["settings."] },
];

type Row = {
  id: number;
  at: string;
  action: string;
  entity: string;
  reason: string | null;
  payload: Record<string, unknown>;
  actor_id: string | null;
  on_behalf_of: string | null;
};

const PAGE = 50;

function describe(r: Row) {
  const base = ACTION_LABEL[r.action] ?? r.action;
  if (r.action.startsWith("settings.")) {
    const after = (r.payload.after ?? r.payload.before) as Record<string, unknown> | undefined;
    const name = (after?.title ?? after?.name) as string | undefined;
    return `${base} · ${ENTITY_LABEL[r.entity] ?? r.entity}${name ? ` · ${name}` : ""}`;
  }
  return base;
}

export default async function AuditPage({ searchParams }: PageProps<"/settings/audit">) {
  const ctx = await settingsSection("audit");
  if (!ctx) return <Forbidden title="سجل التدقيق" />;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? 1) || 1);
  const f = FILTERS.find((x) => x.key === sp.f) ?? FILTERS[0];
  const from = typeof sp.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : "";
  const to = typeof sp.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.to) ? sp.to : "";

  const supabase = await createClient();
  let q = supabase
    .from("audit_log")
    .select("id, at, action, entity, reason, payload, actor_id, on_behalf_of", { count: "exact" })
    .order("id", { ascending: false });
  if (f.prefixes.length) q = q.or(f.prefixes.map((p) => `action.like.${p}%`).join(","));
  if (from) q = q.gte("at", `${from}T00:00:00+03:00`);
  if (to) q = q.lte("at", `${to}T23:59:59+03:00`);
  const { data, count } = await q.range((page - 1) * PAGE, page * PAGE - 1);
  const rows = (data ?? []) as Row[];

  const ids = Array.from(new Set(rows.flatMap((r) => [r.actor_id, r.on_behalf_of]).filter(Boolean))) as string[];
  const names = new Map<string, string>();
  if (ids.length) {
    const { data: ps } = await supabase.from("profiles").select("id, full_name").in("id", ids);
    (ps ?? []).forEach((p) => names.set(p.id as string, p.full_name as string));
  }
  const who = (id: string | null) => (id ? names.get(id) ?? "مستخدم" : "النظام");
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (extra: Record<string, string | number>) => {
    const p = new URLSearchParams();
    if (f.key !== "all") p.set("f", f.key);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
    return `?${p.toString()}`;
  };

  return (
    <>
      <PrintHeader title={`سجل التدقيق${from || to ? ` · ${from || "…"} إلى ${to || "…"}` : ""}`} />
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <CardTitle>
            <Icon name="shield" size={24} className="text-blue" />
            سجل التدقيق
          </CardTitle>
          <ExportButton />
        </div>
        <Caption>
          كل عملية حساسة: الاعتمادات، والصلاحيات، والمالية، والدخول بحساب شخص آخر، وتعديلات الإعدادات. لا يُعدَّل ولا
          يُحذف. يراه مدير المشاريع والإدارة العليا فقط.
        </Caption>
        <div className="no-print flex flex-wrap gap-2">
          {FILTERS.map((x) => (
            <Link
              key={x.key}
              href={x.key === "all" ? `?${new URLSearchParams({ ...(from && { from }), ...(to && { to }) })}` : `?${new URLSearchParams({ f: x.key, ...(from && { from }), ...(to && { to }) })}`}
              aria-current={x.key === f.key ? "true" : undefined}
              className={`inline-flex items-center min-h-10 px-3 rounded-full text-[13px] font-semibold border no-underline ${
                x.key === f.key ? "bg-blue-tint border-blue text-navy" : "bg-surface border-[#c5cfe0] text-navy"
              }`}
            >
              {x.label}
            </Link>
          ))}
        </div>
        <form className="no-print flex flex-wrap items-end gap-3" method="get">
          {f.key !== "all" && <input type="hidden" name="f" value={f.key} />}
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
            من
            <input type="date" name="from" defaultValue={from} className="min-h-11 px-3 rounded-[8px] border border-line-strong bg-surface" />
          </label>
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
            إلى
            <input type="date" name="to" defaultValue={to} className="min-h-11 px-3 rounded-[8px] border border-line-strong bg-surface" />
          </label>
          <button type="submit" className={buttonClass("ghost")}>عرض الفترة</button>
        </form>

        {rows.length === 0 ? (
          <Caption>لا توجد سجلات بهذه الفلترة.</Caption>
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
                    <td className="px-3 py-2.5 min-w-[200px] font-semibold">{describe(r)}</td>
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
            {page > 1 ? <Link href={qs({ page: page - 1 })} className="min-h-10 inline-flex items-center">الأحدث</Link> : <span />}
            <span className="text-[14px] text-muted">صفحة {page} من {pages}</span>
            {page < pages ? <Link href={qs({ page: page + 1 })} className="min-h-10 inline-flex items-center">الأقدم</Link> : <span />}
          </nav>
        )}
      </Card>
    </>
  );
}
