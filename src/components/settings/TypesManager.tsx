"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Field, FormError, Group, Input } from "./form";
import { saveProjectType } from "@/app/(app)/settings/actions";
import type { IconName } from "@/lib/roles";

export type ProjectType = {
  id: string;
  name: string;
  icon: string;
  auto_budget_lines: string[];
  options: string[];
  default_duration: string | null;
  active: boolean;
};

const KNOWN_LINES = ["السكن", "التنقل", "الزيارات", "استئجار المكان", "التأمين", "تذاكر الطيران"];
const KNOWN_OPTS = ["تكليفات أسبوعية بين اللقاءات", "الوجهة في الملف التسويقي", "برنامج يومي بدل لقاءات", "يتطلب موافقة ولي الأمر على السفر"];
const DURATIONS = ["يوم واحد", "عدة أيام", "عدة أسابيع"];
const ICONS: IconName[] = ["calendar", "flight", "home", "star", "projects", "users"];

function ChipsEditor({
  label,
  hint,
  known,
  value,
  onChange,
  addLabel,
}: {
  label: string;
  hint?: string;
  known: string[];
  value: string[];
  onChange: (v: string[]) => void;
  addLabel: string;
}) {
  const [extra, setExtra] = useState("");
  const all = Array.from(new Set([...known, ...value]));
  const add = () => {
    const v = extra.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setExtra("");
  };
  return (
    <Group label={label} hint={hint}>
      <div className="flex flex-wrap gap-2">
        {all.map((x) => (
          <Pill key={x} on={value.includes(x)} onClick={() => onChange(value.includes(x) ? value.filter((y) => y !== x) : [...value, x])}>
            {x}
          </Pill>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={addLabel}
        />
        <Button variant="ghost" onClick={add} disabled={!extra.trim()}>
          <Icon name="plus" size={18} />
          إضافة
        </Button>
      </div>
    </Group>
  );
}

export function TypesManager({ types, canEdit }: { types: ProjectType[]; canEdit: boolean }) {
  const [editing, setEditing] = useState<ProjectType | "new" | null>(null);
  return (
    <>
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <CardTitle>
            <Icon name="projects" size={24} className="text-blue" />
            أنواع المشاريع
          </CardTitle>
          {canEdit && (
            <Button onClick={() => setEditing("new")}>
              <Icon name="plus" size={18} />
              نوع جديد
            </Button>
          )}
        </div>
        <Caption>
          نوع المشروع يحدد البنود التي تُضاف تلقائياً للميزانية، والخيارات التي تظهر في المقترح والملف التسويقي. التعديل
          يسري على المشاريع الجديدة، والمشاريع القائمة تحتفظ ببنودها.
        </Caption>
      </Card>
      <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(280px,1fr))] items-start">
        {types.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setEditing(t)}
            className="text-start cursor-pointer bg-surface rounded-[12px] shadow-[var(--shadow-card)] p-4 flex flex-col gap-2.5 border-0 font-[inherit] text-navy hover:-translate-y-px transition-transform"
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold text-[15px]">
                <Icon name={(ICONS.includes(t.icon as IconName) ? t.icon : "projects") as IconName} size={22} className="text-blue" />
                {t.name}
              </span>
              {!t.active && <Badge tone="neutral">موقوف</Badge>}
            </span>
            <span className="text-[13px] text-muted">بنود تُضاف تلقائياً</span>
            <span className="flex flex-wrap gap-1.5">
              {(t.auto_budget_lines.length ? t.auto_budget_lines : ["لا بنود إضافية"]).map((l) => (
                <span key={l} className="inline-flex items-center min-h-7 px-2.5 rounded-full text-[12.5px] font-semibold bg-page">{l}</span>
              ))}
            </span>
            {t.options.length > 0 && <span className="text-[13px] text-muted leading-[20px]">{t.options.join(" · ")}</span>}
          </button>
        ))}
      </div>
      {editing && (
        <TypeDialog
          t={editing === "new" ? null : editing}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function TypeDialog({ t, canEdit, onClose }: { t: ProjectType | null; canEdit: boolean; onClose: () => void }) {
  const [name, setName] = useState(t?.name ?? "");
  const [icon, setIcon] = useState<string>(t?.icon ?? "projects");
  const [lines, setLines] = useState<string[]>(t?.auto_budget_lines ?? []);
  const [opts, setOpts] = useState<string[]>(t?.options ?? []);
  const [dur, setDur] = useState<string | null>(t?.default_duration ?? null);
  const [active, setActive] = useState(t?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Modal
      open
      onClose={onClose}
      title={t ? t.name : "نوع مشروع جديد"}
      subtitle="نوع مشروع"
      icon="projects"
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
                  const r = await saveProjectType({
                    id: t?.id,
                    name,
                    icon,
                    auto_budget_lines: lines,
                    options: opts,
                    default_duration: dur,
                    active,
                  });
                  if (r.ok) onClose();
                  else setError(r.error);
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
        <Field label="اسم النوع">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Group label="الأيقونة">
          <div className="flex flex-wrap gap-2">
            {ICONS.map((i) => (
              <button
                key={i}
                type="button"
                aria-pressed={icon === i}
                aria-label={i}
                onClick={() => setIcon(i)}
                className={`w-11 h-11 rounded-[10px] inline-flex items-center justify-center border cursor-pointer ${
                  icon === i ? "bg-blue-tint border-blue text-blue" : "bg-surface border-line text-muted"
                }`}
              >
                <Icon name={i} size={22} />
              </button>
            ))}
          </div>
        </Group>
        <ChipsEditor
          label="بنود تُضاف تلقائياً للميزانية"
          hint="بنود اللجان، والجوائز، ومكافآت المشرفين، والإعلام، والطوارئ تُضاف لكل الأنواع دائماً."
          known={KNOWN_LINES}
          value={lines}
          onChange={setLines}
          addLabel="بند آخر"
        />
        <ChipsEditor label="خيارات تظهر في المقترح" known={KNOWN_OPTS} value={opts} onChange={setOpts} addLabel="خيار آخر" />
        <Group label="مدة المشروع المعتادة">
          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((d) => (
              <Pill key={d} on={dur === d} onClick={() => setDur(dur === d ? null : d)}>{d}</Pill>
            ))}
          </div>
        </Group>
        <Group label="الحالة" hint="النوع الموقوف لا يظهر في المقترحات الجديدة، ويبقى في المشاريع السابقة.">
          <div className="flex flex-wrap gap-2">
            <Pill on={active} onClick={() => setActive(true)}>مفعّل</Pill>
            <Pill on={!active} onClick={() => setActive(false)}>موقوف</Pill>
          </div>
        </Group>
      </fieldset>
    </Modal>
  );
}
