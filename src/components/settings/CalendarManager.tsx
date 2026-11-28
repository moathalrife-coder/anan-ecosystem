"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Field, FormError, Group, Input, Select, Textarea } from "./form";
import { deleteCalendarRow, saveCalendarEvent, saveTerm } from "@/app/(app)/settings/actions";

export type Term = {
  id: string;
  year_label: string;
  name: string;
  start_date: string;
  end_date: string;
  thu_override: number | null;
  fri_override: number | null;
  sat_override: number | null;
  note: string | null;
};
export type Availability = {
  term_id: string;
  thu_calc: number;
  fri_calc: number;
  sat_calc: number;
  thu: number;
  fri: number;
  sat: number;
  total: number;
};
export type CalendarEvent = {
  id: string;
  title: string;
  kind: "holiday" | "exams" | "occasion" | "other";
  start_date: string;
  end_date: string;
  blocks_availability: boolean;
  note: string | null;
};

export const EVENT_KIND: Record<CalendarEvent["kind"], { label: string; tone: "info" | "success" | "warning" | "neutral" }> = {
  holiday: { label: "إجازة", tone: "success" },
  exams: { label: "اختبارات", tone: "warning" },
  occasion: { label: "مناسبة", tone: "info" },
  other: { label: "أخرى", tone: "neutral" },
};

// التاريخ يُخزَّن ميلادياً (YYYY-MM-DD) ويُعرض بالميلادي مع الهجري (أم القرى)
const at = (d: string) => new Date(`${d}T12:00:00Z`);
const greg = new Intl.DateTimeFormat("ar-SA-u-ca-gregory-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic-umalqura-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("ar-SA", { weekday: "long", timeZone: "UTC" });

function DateLine({ d }: { d: string }) {
  return (
    <span className="inline-flex flex-col">
      <span className="font-semibold">{weekday.format(at(d))} {greg.format(at(d))}</span>
      <span className="text-[13px] text-muted">{hijri.format(at(d))}</span>
    </span>
  );
}

function rangeText(a: string, b: string) {
  return a === b ? greg.format(at(a)) : `${greg.format(at(a))} إلى ${greg.format(at(b))}`;
}
function rangeHijri(a: string, b: string) {
  return a === b ? hijri.format(at(a)) : `${hijri.format(at(a))} إلى ${hijri.format(at(b))}`;
}
const days = (a: string, b: string) => Math.round((at(b).getTime() - at(a).getTime()) / 86400000) + 1;

export function CalendarManager({
  terms,
  availability,
  events,
  canEdit,
}: {
  terms: Term[];
  availability: Availability[];
  events: CalendarEvent[];
  canEdit: boolean;
}) {
  const [term, setTerm] = useState<Term | "new" | null>(null);
  const [event, setEvent] = useState<CalendarEvent | "new" | null>(null);
  const years = Array.from(new Set(terms.map((t) => t.year_label)));
  const sum = (k: "thu" | "fri" | "sat" | "total", year: string) =>
    terms
      .filter((t) => t.year_label === year)
      .reduce((s, t) => s + (availability.find((a) => a.term_id === t.id)?.[k] ?? 0), 0);

  return (
    <>
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <CardTitle>
            <Icon name="calendar" size={24} className="text-blue" />
            التقويم الدراسي
          </CardTitle>
          {canEdit && (
            <Button onClick={() => setTerm("new")}>
              <Icon name="plus" size={18} />
              فصل دراسي
            </Button>
          )}
        </div>
        <Caption>
          بداية الدراسة ونهايتها لكل فصل، والإجازات والمناسبات، وعدد أيام الخميس والجمعة والسبت المتاحة للمشاريع. يُحدَّث
          كلما صدر تقويم وزارة التعليم أو تغيّر.
        </Caption>
        <div className="flex gap-2 items-start bg-soft rounded-[12px] p-3 text-[13.5px] leading-[22px]">
          <Icon name="info" size={18} className="text-blue mt-0.5" />
          <span>
            الأيام المتاحة تُحسب تلقائياً من تاريخي الفصل، وتُخصم منها أيام المناسبات المعلَّمة «تُخصم من المتاح». ويمكن
            تعديل أي عدد يدوياً من نافذة الفصل.
          </span>
        </div>
      </Card>

      {terms.length === 0 && (
        <Card>
          <Caption>لم يُضف فصل دراسي بعد.{canEdit ? " ابدأ بإضافة الفصل الأول من تقويم الوزارة." : ""}</Caption>
        </Card>
      )}

      {years.map((year) => (
        <Card key={year} label={`العام الدراسي ${year}`}>
          <div className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="m-0 text-[16px] font-semibold">العام الدراسي {year}</h3>
            <span className="text-[14px] text-muted">
              مجموع المتاح: <b className="text-navy">{sum("total", year)} يوماً</b> ({sum("thu", year)} خميس · {sum("fri", year)} جمعة ·{" "}
              {sum("sat", year)} سبت)
            </span>
          </div>
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {terms
              .filter((t) => t.year_label === year)
              .map((t) => {
                const a = availability.find((x) => x.term_id === t.id);
                const manual = t.thu_override !== null || t.fri_override !== null || t.sat_override !== null;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTerm(t)}
                    className="text-start cursor-pointer bg-page rounded-[12px] p-3.5 flex flex-col gap-3 border-0 font-[inherit] text-navy hover:-translate-y-px transition-transform"
                  >
                    <span className="flex justify-between items-center gap-2">
                      <span className="font-semibold text-[15px]">{t.name}</span>
                      {manual && <Badge tone="warning">معدّل يدوياً</Badge>}
                    </span>
                    <span className="grid grid-cols-2 gap-2 text-[14px]">
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[13px] text-muted">بداية الدراسة</span>
                        <DateLine d={t.start_date} />
                      </span>
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[13px] text-muted">نهاية الدراسة</span>
                        <DateLine d={t.end_date} />
                      </span>
                    </span>
                    <span className="grid grid-cols-4 gap-1.5 text-center">
                      {([["خميس", a?.thu], ["جمعة", a?.fri], ["سبت", a?.sat], ["المجموع", a?.total]] as const).map(([l, v]) => (
                        <span key={l} className={`rounded-[10px] py-2 ${l === "المجموع" ? "bg-navy text-white" : "bg-surface"}`}>
                          <span className="block font-display text-[20px] leading-7 font-semibold">{v ?? 0}</span>
                          <span className={`text-[12.5px] ${l === "المجموع" ? "text-white/80" : "text-muted"}`}>{l}</span>
                        </span>
                      ))}
                    </span>
                    {t.note && <span className="text-[13px] text-muted">{t.note}</span>}
                  </button>
                );
              })}
          </div>
        </Card>
      ))}

      <Card>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <CardTitle>
            <Icon name="flag" size={24} className="text-blue" />
            الإجازات والمناسبات
          </CardTitle>
          {canEdit && (
            <Button variant="ghost" onClick={() => setEvent("new")}>
              <Icon name="plus" size={18} />
              إجازة أو مناسبة
            </Button>
          )}
        </div>
        {events.length === 0 && <Caption>لا إجازات أو مناسبات مضافة.</Caption>}
        <ul className="m-0 p-0 list-none flex flex-col">
          {events.map((e) => (
            <li key={e.id} className="border-t border-line first:border-t-0">
              <button
                type="button"
                onClick={() => setEvent(e)}
                className="w-full flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3 text-start bg-transparent border-0 cursor-pointer font-[inherit] text-navy"
              >
                <span className="flex-1 min-w-[220px] flex flex-col">
                  <span className="font-semibold text-[14.5px]">{e.title}</span>
                  <span className="text-[13px] text-muted">
                    {rangeText(e.start_date, e.end_date)} · {rangeHijri(e.start_date, e.end_date)} · {days(e.start_date, e.end_date)}{" "}
                    {days(e.start_date, e.end_date) === 1 ? "يوم" : "أيام"}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <Badge tone={EVENT_KIND[e.kind].tone}>{EVENT_KIND[e.kind].label}</Badge>
                  {e.blocks_availability && <Badge tone="danger">تُخصم من المتاح</Badge>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {term && <TermDialog t={term === "new" ? null : term} a={term === "new" ? undefined : availability.find((x) => x.term_id === term.id)} years={years} canEdit={canEdit} onClose={() => setTerm(null)} />}
      {event && <EventDialog e={event === "new" ? null : event} canEdit={canEdit} onClose={() => setEvent(null)} />}
    </>
  );
}

function DeleteButton({ onConfirm, pending }: { onConfirm: () => void; pending: boolean }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <Button variant="ghost" className="text-danger! border-danger!" disabled={pending} onClick={onConfirm}>
      <Icon name="trash" size={18} />
      تأكيد الحذف
    </Button>
  ) : (
    <Button variant="ghost" onClick={() => setArmed(true)}>
      <Icon name="trash" size={18} />
      حذف
    </Button>
  );
}

const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.min(60, Math.round(Number(v)))));

function TermDialog({
  t,
  a,
  years,
  canEdit,
  onClose,
}: {
  t: Term | null;
  a?: Availability;
  years: string[];
  canEdit: boolean;
  onClose: () => void;
}) {
  const [year, setYear] = useState(t?.year_label ?? years.at(-1) ?? "");
  const [name, setName] = useState(t?.name ?? "");
  const [start, setStart] = useState(t?.start_date ?? "");
  const [end, setEnd] = useState(t?.end_date ?? "");
  const [thu, setThu] = useState(t?.thu_override?.toString() ?? "");
  const [fri, setFri] = useState(t?.fri_override?.toString() ?? "");
  const [sat, setSat] = useState(t?.sat_override?.toString() ?? "");
  const [note, setNote] = useState(t?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start_] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start_(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) onClose();
      else setError(r.error ?? "تعذّر الحفظ");
    });

  return (
    <Modal
      open
      onClose={onClose}
      title={t ? t.name : "فصل دراسي جديد"}
      subtitle={t ? `العام الدراسي ${t.year_label}` : "التقويم الدراسي"}
      icon="calendar"
      size="lg"
      footer={
        canEdit ? (
          <>
            {t && <DeleteButton pending={pending} onConfirm={() => run(() => deleteCalendarRow("academic_terms", t.id))} />}
            <span className="flex-1" />
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  saveTerm({
                    id: t?.id,
                    year_label: year,
                    name,
                    start_date: start,
                    end_date: end,
                    thu_override: num(thu),
                    fri_override: num(fri),
                    sat_override: num(sat),
                    note: note || null,
                  }),
                )
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
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
          <Field label="العام الدراسي" hint="مثل: 1448–1449">
            <Input value={year} onChange={(e) => setYear(e.target.value)} list="term-years" />
            <datalist id="term-years">{years.map((y) => <option key={y} value={y} />)}</datalist>
          </Field>
          <Field label="اسم الفصل">
            <Input value={name} onChange={(e) => setName(e.target.value)} list="term-names" autoFocus={!t} />
            <datalist id="term-names">
              {["الفصل الدراسي الأول", "الفصل الدراسي الثاني", "الفصل الدراسي الثالث", "الإجازة الصيفية"].map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="بداية الدراسة" hint={start ? hijri.format(at(start)) : undefined}>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="نهاية الدراسة" hint={end ? hijri.format(at(end)) : undefined}>
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Group
          label="الأيام المتاحة (اتركها فارغة للحساب التلقائي)"
          hint={a ? `المحسوب حالياً: ${a.thu_calc} خميس · ${a.fri_calc} جمعة · ${a.sat_calc} سبت` : "يُحسب بعد الحفظ من تاريخي الفصل."}
        >
          <div className="grid gap-3 grid-cols-3">
            {([["خميس", thu, setThu, a?.thu_calc], ["جمعة", fri, setFri, a?.fri_calc], ["سبت", sat, setSat, a?.sat_calc]] as const).map(
              ([l, v, set, calc]) => (
                <Field key={l} label={l}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={60}
                    value={v}
                    placeholder={calc !== undefined ? String(calc) : "تلقائي"}
                    onChange={(e) => set(e.target.value)}
                  />
                </Field>
              ),
            )}
          </div>
        </Group>
        <Field label="ملاحظة (اختياري)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </fieldset>
    </Modal>
  );
}

function EventDialog({ e, canEdit, onClose }: { e: CalendarEvent | null; canEdit: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(e?.title ?? "");
  const [kind, setKind] = useState<CalendarEvent["kind"]>(e?.kind ?? "holiday");
  const [start, setStart] = useState(e?.start_date ?? "");
  const [end, setEnd] = useState(e?.end_date ?? "");
  const [blocks, setBlocks] = useState(e?.blocks_availability ?? false);
  const [note, setNote] = useState(e?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, start_] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start_(async () => {
      setError(null);
      const r = await fn();
      if (r.ok) onClose();
      else setError(r.error ?? "تعذّر الحفظ");
    });

  return (
    <Modal
      open
      onClose={onClose}
      title={e ? e.title : "إجازة أو مناسبة جديدة"}
      subtitle="التقويم الدراسي"
      icon="flag"
      footer={
        canEdit ? (
          <>
            {e && <DeleteButton pending={pending} onConfirm={() => run(() => deleteCalendarRow("calendar_events", e.id))} />}
            <span className="flex-1" />
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button
              disabled={pending}
              onClick={() =>
                run(() =>
                  saveCalendarEvent({
                    id: e?.id,
                    title,
                    kind,
                    start_date: start,
                    end_date: end || start,
                    blocks_availability: blocks,
                    note: note || null,
                  }),
                )
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
        <Field label="الاسم">
          <Input value={title} onChange={(ev) => setTitle(ev.target.value)} placeholder="مثل: إجازة اليوم الوطني" autoFocus={!e} />
        </Field>
        <Field label="النوع">
          <Select value={kind} onChange={(ev) => setKind(ev.target.value as CalendarEvent["kind"])}>
            {Object.entries(EVENT_KIND).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
          <Field label="من" hint={start ? hijri.format(at(start)) : undefined}>
            <Input type="date" value={start} onChange={(ev) => setStart(ev.target.value)} />
          </Field>
          <Field label="إلى" hint={end ? hijri.format(at(end)) : "اتركه فارغاً ليوم واحد"}>
            <Input type="date" value={end} min={start || undefined} onChange={(ev) => setEnd(ev.target.value)} />
          </Field>
        </div>
        <Group
          label="الأيام المتاحة للمشاريع"
          hint="اختر «تُخصم» إذا كانت هذه الأيام لا تصلح لإقامة المشاريع، مثل أيام الاختبارات."
        >
          <div className="flex flex-wrap gap-2">
            <Pill on={!blocks} onClick={() => setBlocks(false)}>لا تُخصم</Pill>
            <Pill on={blocks} onClick={() => setBlocks(true)}>تُخصم من المتاح</Pill>
          </div>
        </Group>
        <Field label="ملاحظة (اختياري)">
          <Textarea value={note} onChange={(ev) => setNote(ev.target.value)} />
        </Field>
      </fieldset>
    </Modal>
  );
}
