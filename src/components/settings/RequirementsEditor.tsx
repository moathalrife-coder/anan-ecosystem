"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Field, FormError, Group, Input, Select, Textarea } from "./form";
import { moveTemplateRow, saveRequirement } from "@/app/(app)/settings/actions";
import { PHASE_NAMES } from "@/lib/roles";
import { AUTO_EVENTS, OWNER_SUGGESTIONS } from "@/lib/templates";

export type Requirement = {
  id: string;
  phase: number;
  title: string;
  description: string | null;
  mode: "auto" | "manual";
  auto_event: string | null;
  owner_label: string;
  sort: number;
  active: boolean;
};

const eventLabel = (k: string | null) => AUTO_EVENTS.find((e) => e.key === k)?.label ?? k ?? "";

export function RequirementsEditor({ items, canEdit }: { items: Requirement[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<Requirement | { phase: number } | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const total = items.filter((i) => i.active).length;

  return (
    <>
      <Card>
        <CardTitle>
          <Icon name="flag" size={24} className="text-blue" />
          متطلبات المراحل
        </CardTitle>
        <Caption>
          6 مراحل · {total} متطلباً مفعّلاً. «تلقائي» يكتمل من حدث في المنظومة، و«يدوي» يحتاج تأكيداً بإرفاق.
        </Caption>
        <div className="flex gap-2 items-start bg-soft rounded-[12px] p-3 text-[13.5px] leading-[22px]">
          <Icon name="info" size={18} className="text-blue mt-0.5" />
          <span>
            التعديل هنا يسري على <b>المشاريع الجديدة</b>. كل مشروع يأخذ نسخته من المتطلبات عند إنشائه، فلا يتغير مشروع
            قائم دون قرار صريح. كل تعديل يُسجَّل في سجل التدقيق.
          </span>
        </div>
        <FormError error={error} />
      </Card>

      {PHASE_NAMES.map((name, idx) => {
        const phase = idx + 1;
        const list = items.filter((i) => i.phase === phase).sort((a, b) => a.sort - b.sort);
        return (
          <Card key={phase} label={`المرحلة ${phase}`}>
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h3 className="m-0 text-[15px] font-semibold flex items-center gap-2">
                <span className="w-7 h-7 rounded-full bg-blue-tint text-blue inline-flex items-center justify-center text-[13px]">{phase}</span>
                {name}
              </h3>
              {canEdit && (
                <Button variant="ghost" onClick={() => setEditing({ phase })}>
                  <Icon name="plus" size={18} />
                  متطلب
                </Button>
              )}
            </div>
            {list.length === 0 && <Caption>لا متطلبات لهذه المرحلة.</Caption>}
            <ol className="m-0 p-0 list-none flex flex-col">
              {list.map((r, k) => (
                <li key={r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 border-t border-line first:border-t-0 ${r.active ? "" : "opacity-60"}`}>
                  <button
                    type="button"
                    onClick={() => setEditing(r)}
                    className="flex-1 min-w-[220px] text-start bg-transparent border-0 cursor-pointer font-[inherit] text-navy p-0"
                  >
                    <span className="block font-semibold text-[14px]">{r.title}</span>
                    <span className="text-[13px] text-muted">
                      {r.owner_label}
                      {r.mode === "auto" ? ` · يكتمل عند: ${eventLabel(r.auto_event)}` : " · يدوي بإرفاق"}
                    </span>
                  </button>
                  <span className="flex items-center gap-1.5">
                    {!r.active && <Badge tone="neutral">موقوف</Badge>}
                    <Badge tone={r.mode === "auto" ? "info" : "warning"}>{r.mode === "auto" ? "تلقائي" : "يدوي"}</Badge>
                    {canEdit && (
                      <>
                        <button
                          type="button"
                          aria-label="تحريك للأعلى"
                          disabled={pending || k === 0}
                          onClick={() => start(async () => { const x = await moveTemplateRow("phase_requirement_templates", r.id, -1); if (!x.ok) setError(x.error); })}
                          className="w-10 h-10 rounded-[10px] inline-flex items-center justify-center text-muted hover:bg-soft disabled:opacity-30 cursor-pointer"
                        >
                          <Icon name="up" size={18} />
                        </button>
                        <button
                          type="button"
                          aria-label="تحريك للأسفل"
                          disabled={pending || k === list.length - 1}
                          onClick={() => start(async () => { const x = await moveTemplateRow("phase_requirement_templates", r.id, 1); if (!x.ok) setError(x.error); })}
                          className="w-10 h-10 rounded-[10px] inline-flex items-center justify-center text-muted hover:bg-soft disabled:opacity-30 cursor-pointer"
                        >
                          <Icon name="down" size={18} />
                        </button>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        );
      })}

      {editing && <RequirementDialog r={editing} canEdit={canEdit} onClose={() => setEditing(null)} />}
    </>
  );
}

function RequirementDialog({
  r,
  canEdit,
  onClose,
}: {
  r: Requirement | { phase: number };
  canEdit: boolean;
  onClose: () => void;
}) {
  const ex = "id" in r ? r : null;
  const [phase, setPhase] = useState(r.phase);
  const [title, setTitle] = useState(ex?.title ?? "");
  const [desc, setDesc] = useState(ex?.description ?? "");
  const [mode, setMode] = useState<"auto" | "manual">(ex?.mode ?? "manual");
  const [event, setEvent] = useState(ex?.auto_event ?? "");
  const [owner, setOwner] = useState(ex?.owner_label ?? "");
  const [active, setActive] = useState(ex?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Modal
      open
      onClose={onClose}
      title={ex ? "تعديل متطلب" : "متطلب جديد"}
      subtitle={`المرحلة ${phase}: ${PHASE_NAMES[phase - 1]}`}
      icon="flag"
      size="lg"
      footer={
        canEdit ? (
          <>
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await saveRequirement({
                    id: ex?.id,
                    phase,
                    title,
                    description: desc || null,
                    mode,
                    auto_event: mode === "auto" ? event || null : null,
                    owner_label: owner,
                    active,
                  });
                  if (res.ok) onClose();
                  else setError(res.error);
                })
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
      <fieldset disabled={!canEdit} className="contents">
        <FormError error={error} />
        <Field label="المتطلب">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!ex} />
        </Field>
        <Field label="الشرح (اختياري)">
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Field>
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <Field label="المرحلة">
            <Select value={phase} onChange={(e) => setPhase(Number(e.target.value))}>
              {PHASE_NAMES.map((n, i) => (
                <option key={n} value={i + 1}>{i + 1}. {n}</option>
              ))}
            </Select>
          </Field>
          <Field label="صاحب المتطلب">
            <Input value={owner} onChange={(e) => setOwner(e.target.value)} list="owner-suggestions" />
            <datalist id="owner-suggestions">
              {OWNER_SUGGESTIONS.map((o) => <option key={o} value={o} />)}
            </datalist>
          </Field>
        </div>
        <Group label="طريقة الاكتمال">
          <div className="flex flex-wrap gap-2">
            <Pill on={mode === "auto"} onClick={() => setMode("auto")}>تلقائي من المنظومة</Pill>
            <Pill on={mode === "manual"} onClick={() => setMode("manual")}>يدوي بإرفاق</Pill>
          </div>
        </Group>
        {mode === "auto" && (
          <Field label="يكتمل تلقائياً عند" hint="الأحداث المتاحة هي ما تعرفه المنظومة. حدث جديد يحتاج بناء منطقه أولاً.">
            <Select value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="">اختر الحدث</option>
              {AUTO_EVENTS.map((e) => (
                <option key={e.key} value={e.key}>{e.label}</option>
              ))}
            </Select>
          </Field>
        )}
        <Group label="الحالة" hint="المتطلب الموقوف لا يُضاف للمشاريع الجديدة، ويبقى في المشاريع القائمة.">
          <div className="flex flex-wrap gap-2">
            <Pill on={active} onClick={() => setActive(true)}>مفعّل</Pill>
            <Pill on={!active} onClick={() => setActive(false)}>موقوف</Pill>
          </div>
        </Group>
      </fieldset>
    </Modal>
  );
}
