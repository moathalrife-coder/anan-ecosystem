"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Field, FormError, Group, Input } from "./form";
import { RoleEditor, draftFromAssignments, draftToAssignments, type RoleDraft } from "./RoleEditor";
import {
  impersonate,
  inviteUser,
  resendInvitation,
  revokeInvitation,
  saveUser,
  setUserStatus,
  type ActionResult,
} from "@/app/(app)/settings/actions";
import { GRANT_LABEL, ROLES, ROLE_LABEL, describeAssignment, type GrantKey, type Role, type RoleAssignment } from "@/lib/roles";

export type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  status: "active" | "invited" | "suspended";
  last_sign_in_at: string | null;
  roles: RoleAssignment[];
  grants: GrantKey[];
};

export type PendingInvite = {
  id: string;
  email: string;
  phone: string | null;
  full_name: string;
  roles: RoleAssignment[];
  expires_at: string;
};

const GRANT_DESC: Record<GrantKey, string> = {
  supervisor_sensitive_data: "الهوية، والآيبان، والجواز، وتاريخ الميلاد، وصور الوثائق. للإدارة العليا ومدير المشاريع افتراضياً.",
  health_all_projects: "الأصل: قائد المشروع ومن فوقه في مشروعه فقط.",
  approve_invoices: "كالمحاسب، لحالات الغياب.",
  edit_templates: "أنواع المشاريع، ومتطلبات المراحل، وقوالب الفحص.",
};
const GRANTS = Object.keys(GRANT_LABEL) as GrantKey[];

const relTime = (iso: string | null) => {
  if (!iso) return "لم يدخل بعد";
  const d = (Date.now() - new Date(iso).getTime()) / 86400000;
  if (d < 1) return "اليوم";
  if (d < 2) return "أمس";
  if (d < 7) return `قبل ${Math.floor(d)} أيام`;
  return new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium" }).format(new Date(iso));
};

type Row =
  | { kind: "user"; u: AdminUser }
  | { kind: "invite"; i: PendingInvite };

export function UsersManager({
  users,
  invites,
  canManage,
  currentUserId,
}: {
  users: AdminUser[];
  invites: PendingInvite[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [q, setQ] = useState("");
  const [rf, setRf] = useState<Role | "all">("all");
  const [open, setOpen] = useState<
    | { m: "user"; u: AdminUser }
    | { m: "invite" }
    | { m: "pending"; i: PendingInvite }
    | { m: "imp"; u: AdminUser }
    | { m: "link"; url: string; name: string }
    | null
  >(null);

  const rows: Row[] = useMemo(() => {
    const t = q.trim();
    const match = (name: string, roles: RoleAssignment[]) =>
      (!t || name.includes(t)) && (rf === "all" || roles.some((r) => r.role === rf));
    return [
      ...invites.filter((i) => match(i.full_name, i.roles)).map((i) => ({ kind: "invite" as const, i })),
      ...users.filter((u) => match(u.full_name, u.roles)).map((u) => ({ kind: "user" as const, u })),
    ];
  }, [users, invites, q, rf]);

  const close = () => setOpen(null);

  return (
    <Card>
      <div className="flex flex-wrap justify-between items-center gap-2">
        <CardTitle>
          <Icon name="users" size={24} className="text-blue" />
          المستخدمون والصلاحيات
        </CardTitle>
        {canManage && (
          <Button onClick={() => setOpen({ m: "invite" })}>
            <Icon name="send" size={18} />
            دعوة مستخدم
          </Button>
        )}
      </div>
      <label className="flex items-center gap-2 min-h-11 px-3 rounded-[8px] border border-line-strong bg-surface max-w-[420px]">
        <Icon name="search" size={20} className="text-muted" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث بالاسم"
          aria-label="بحث في المستخدمين"
          className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[15px] font-[inherit]"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Pill on={rf === "all"} onClick={() => setRf("all")}>الكل</Pill>
        {ROLES.map((r) => (
          <Pill key={r} on={rf === r} onClick={() => setRf(r)}>
            {ROLE_LABEL[r]}
          </Pill>
        ))}
      </div>

      <div className="border border-line rounded-[12px] overflow-x-auto">
        <table className="w-full border-collapse text-[14px]">
          <thead>
            <tr className="bg-[#e8eef8] text-muted">
              {["المستخدم", "الأدوار", "آخر دخول", "الحالة"].map((h) => (
                <th key={h} className="text-start font-semibold px-3 py-2.5 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-muted">لا نتائج.</td>
              </tr>
            )}
            {rows.map((row) => {
              const name = row.kind === "user" ? row.u.full_name : row.i.full_name;
              const roles = row.kind === "user" ? row.u.roles : row.i.roles;
              const status =
                row.kind === "invite" ? (
                  <Badge tone="info">دعوة مرسلة</Badge>
                ) : row.u.status === "suspended" ? (
                  <Badge tone="neutral">موقوف</Badge>
                ) : (
                  <Badge tone="success">نشط</Badge>
                );
              return (
                <tr key={row.kind + (row.kind === "user" ? row.u.id : row.i.id)} className="border-t border-line hover:bg-soft">
                  <td className="px-3 py-2 min-w-[180px]">
                    <button
                      type="button"
                      onClick={() => setOpen(row.kind === "user" ? { m: "user", u: row.u } : { m: "pending", i: row.i })}
                      className="flex items-center gap-2.5 min-h-10 w-full text-start bg-transparent border-0 cursor-pointer font-semibold text-navy"
                    >
                      <span className="w-8 h-8 rounded-full bg-blue-tint text-blue inline-flex items-center justify-center text-[13px] flex-none">
                        {name.trim().charAt(0)}
                      </span>
                      {name}
                    </button>
                  </td>
                  <td className="px-3 py-2 min-w-[200px]">
                    <span className="flex flex-wrap gap-1.5">
                      {roles.map((r, k) => (
                        <span key={k} className="inline-flex items-center min-h-7 px-2.5 rounded-full text-[12.5px] font-semibold bg-page">
                          {describeAssignment(r)}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted text-[13px] whitespace-nowrap">
                    {row.kind === "user" ? relTime(row.u.last_sign_in_at) : "—"}
                  </td>
                  <td className="px-3 py-2">{status}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Caption className="text-[13px]">
        الصلاحية تأتي من الدور، ويمكن منح أي شخص صلاحيات إضافية من بطاقته. كل تغيير يُسجَّل في سجل التدقيق.
      </Caption>

      {open?.m === "user" && (
        <UserDialog
          u={open.u}
          canManage={canManage}
          isSelf={open.u.id === currentUserId}
          onClose={close}
          onImpersonate={() => setOpen({ m: "imp", u: open.u })}
        />
      )}
      {open?.m === "imp" && <ImpersonateDialog u={open.u} onClose={close} />}
      {open?.m === "invite" && (
        <InviteDialog onClose={close} onDone={(url, name) => setOpen({ m: "link", url, name })} />
      )}
      {open?.m === "pending" && (
        <PendingDialog i={open.i} canManage={canManage} onClose={close} onLink={(url, name) => setOpen({ m: "link", url, name })} />
      )}
      {open?.m === "link" && <InviteLinkDialog url={open.url} name={open.name} onClose={close} />}
    </Card>
  );
}

// ------------------------------------------------------------------ بطاقة المستخدم

function UserDialog({
  u,
  canManage,
  isSelf,
  onClose,
  onImpersonate,
}: {
  u: AdminUser;
  canManage: boolean;
  isSelf: boolean;
  onClose: () => void;
  onImpersonate: () => void;
}) {
  const [name, setName] = useState(u.full_name);
  const [phone, setPhone] = useState(u.phone ?? "");
  const [draft, setDraft] = useState<RoleDraft>(draftFromAssignments(u.roles));
  const [grants, setGrants] = useState<GrantKey[]>(u.grants);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const suspended = u.status === "suspended";

  const run = (fn: () => Promise<ActionResult>) =>
    start(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) onClose();
      else setError(r.error);
    });

  return (
    <Modal
      open
      onClose={onClose}
      title="بطاقة المستخدم"
      subtitle={u.full_name}
      icon="user"
      size="lg"
      footer={
        canManage ? (
          <>
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() => saveUser({ id: u.id, full_name: name, phone, roles: draftToAssignments(draft), grants }))
              }
            >
              {pending ? "جارٍ الحفظ…" : "حفظ"}
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        )
      }
    >
      <FormError error={error} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-muted" dir="ltr">{u.email}</span>
        {suspended ? <Badge tone="neutral">موقوف</Badge> : <Badge tone="success">نشط</Badge>}
      </div>
      {canManage ? (
        <>
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
            <Field label="الاسم">
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="الجوال">
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="05xxxxxxxx" className="text-right" />
            </Field>
          </div>
          <RoleEditor value={draft} onChange={setDraft} />
          <Group label="صلاحيات إضافية">
            <div className="flex flex-col">
              {GRANTS.map((g) => {
                const on = grants.includes(g);
                return (
                  <div key={g} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 border-t border-line first:border-t-0">
                    <span className="flex-1 min-w-[200px]">
                      <span className="block font-semibold text-[14px]">{GRANT_LABEL[g]}</span>
                      <span className="text-[13px] text-muted">{GRANT_DESC[g]}</span>
                    </span>
                    <Pill on={on} onClick={() => setGrants(on ? grants.filter((x) => x !== g) : [...grants, g])}>
                      {on ? "ممنوحة" : "غير ممنوحة"}
                    </Pill>
                  </div>
                );
              })}
            </div>
          </Group>
          {!isSelf && (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-line">
              {!suspended && (
                <Button variant="ghost" onClick={onImpersonate}>
                  <Icon name="view" size={18} />
                  الدخول بحسابه للمتابعة
                </Button>
              )}
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() => run(() => setUserStatus(u.id, suspended ? "active" : "suspended"))}
              >
                <Icon name={suspended ? "success" : "block"} size={18} />
                {suspended ? "تفعيل الحساب" : "إيقاف الحساب"}
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
          <Group label="الأدوار">
            <div className="flex flex-wrap gap-1.5">
              {u.roles.map((r, k) => (
                <Badge key={k} tone="info">{describeAssignment(r)}</Badge>
              ))}
            </div>
          </Group>
          <Group label="صلاحيات إضافية">
            {u.grants.length ? (
              <div className="flex flex-wrap gap-1.5">
                {u.grants.map((g) => (
                  <Badge key={g} tone="success">{GRANT_LABEL[g]}</Badge>
                ))}
              </div>
            ) : (
              <span className="text-[14px] text-muted">لا توجد</span>
            )}
          </Group>
        </>
      )}
    </Modal>
  );
}

// ------------------------------------------------------------------ الدخول بحساب شخص آخر

function ImpersonateDialog({ u, onClose }: { u: AdminUser; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Modal
      open
      onClose={onClose}
      title={`الدخول بحساب ${u.full_name}`}
      subtitle="للمتابعة فقط"
      icon="view"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button
            disabled={pending || reason.trim().length < 5}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await impersonate(u.id, reason);
                if (r && !r.ok) setError(r.error);
              })
            }
          >
            دخول
          </Button>
        </>
      }
    >
      <FormError error={error} />
      <p className="m-0 text-[14px] leading-[22px] text-muted">
        ستدخل بحساب {u.full_name} لترى ما يراه بالضبط. كل ما تفعله يُسجَّل باسمك في سجل التدقيق، ويظهر شريط برتقالي أعلى
        الشاشة حتى تخرج. تنتهي الجلسة تلقائياً بعد 8 ساعات.
      </p>
      <Field label="السبب">
        <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: متابعة خطة اللجنة" autoFocus />
      </Field>
    </Modal>
  );
}

// ------------------------------------------------------------------ الدعوة

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: (url: string, name: string) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [draft, setDraft] = useState<RoleDraft>({ roles: ["supervisor"], section: null, stage: null });
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Modal
      open
      onClose={onClose}
      title="دعوة مستخدم"
      subtitle="يصله رابط لتعيين كلمة المرور، صالح 7 أيام"
      icon="send"
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>إلغاء</Button>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const r = await inviteUser({ full_name: name, email, phone, roles: draftToAssignments(draft) });
                if (r.ok && r.inviteUrl) onDone(r.inviteUrl, name);
                else if (!r.ok) setError(r.error);
              })
            }
          >
            {pending ? "جارٍ الإنشاء…" : "إنشاء الدعوة"}
          </Button>
        </>
      }
    >
      <FormError error={error} />
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
        <Field label="الاسم">
          <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="البريد الإلكتروني">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" placeholder="name@example.com" className="text-right" />
        </Field>
        <Field label="الجوال">
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" dir="ltr" placeholder="05xxxxxxxx" className="text-right" />
        </Field>
      </div>
      <RoleEditor value={draft} onChange={setDraft} />
      {draft.roles.includes("supervisor") && (
        <div className="bg-soft rounded-[12px] p-3 text-[13.5px] leading-[22px]">
          المشرف يُدعى غالباً من دليل المشرفين عند تكليفه بمشروع (المرحلة 3). الدعوة هنا لمن ليس في الدليل.
        </div>
      )}
    </Modal>
  );
}

function PendingDialog({
  i,
  canManage,
  onClose,
  onLink,
}: {
  i: PendingInvite;
  canManage: boolean;
  onClose: () => void;
  onLink: (url: string, name: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const expires = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { dateStyle: "medium" }).format(new Date(i.expires_at));
  return (
    <Modal
      open
      onClose={onClose}
      title="دعوة مرسلة"
      subtitle={i.full_name}
      icon="send"
      footer={
        canManage ? (
          <>
            <Button
              variant="ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await revokeInvitation(i.id);
                  if (r.ok) onClose();
                  else setError(r.error);
                })
              }
            >
              إلغاء الدعوة
            </Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const r = await resendInvitation(i.id);
                  if (r.ok && r.inviteUrl) onLink(r.inviteUrl, i.full_name);
                  else if (!r.ok) setError(r.error);
                })
              }
            >
              رابط جديد
            </Button>
          </>
        ) : (
          <Button variant="ghost" onClick={onClose}>إغلاق</Button>
        )
      }
    >
      <FormError error={error} />
      <span className="text-[14px]" dir="ltr" style={{ textAlign: "right" }}>{i.email}</span>
      <div className="flex flex-wrap gap-1.5">
        {i.roles.map((r, k) => (
          <Badge key={k} tone="info">{describeAssignment(r)}</Badge>
        ))}
      </div>
      <Caption>الرابط صالح حتى {expires}. الرابط الجديد يلغي القديم.</Caption>
    </Modal>
  );
}

function InviteLinkDialog({ url, name, onClose }: { url: string; name: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const msg = `مرحباً ${name}، هذه دعوتك لمنظومة عنان لإدارة المشاريع. افتح الرابط لتعيين كلمة المرور (صالح 7 أيام):\n${url}`;
  return (
    <Modal open onClose={onClose} title="الدعوة جاهزة" subtitle={name} icon="success">
      <p className="m-0 text-[14px] leading-[22px]">
        أرسل الرابط للمدعو. لا يظهر الرابط مرة أخرى بعد إغلاق هذه النافذة، ويمكنك إنشاء رابط جديد من قائمة المستخدمين.
      </p>
      <div dir="ltr" className="bg-soft rounded-[10px] p-3 text-[13px] break-all select-all">{url}</div>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
            } catch {
              setCopied(false);
            }
          }}
        >
          <Icon name={copied ? "check" : "copy"} size={18} />
          {copied ? "تم النسخ" : "نسخ الرابط"}
        </Button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(msg)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-[12px] font-semibold text-[14px] min-h-10 px-4 bg-surface text-navy border border-line-strong no-underline"
        >
          <Icon name="whatsapp" size={18} />
          إرسال عبر واتساب
        </a>
      </div>
    </Modal>
  );
}
