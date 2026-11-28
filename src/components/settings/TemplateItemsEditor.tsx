"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/Modal";
import { Icon } from "@/components/ui/Icon";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Field, FormError, Group, Input } from "./form";
import { moveTemplateRow, saveTemplateItem } from "@/app/(app)/settings/actions";
import type { TemplateKind } from "@/lib/templates";

export type TemplateItem = {
  id: string;
  kind: TemplateKind;
  group_label: string | null;
  title: string;
  color: string | null;
  sort: number;
  active: boolean;
};

const PALETTE = ["#3560ac", "#ec7f1a", "#1baf7a", "#0d7a63", "#e87ba4", "#8a5cd6", "#2a9fd6", "#7d8699", "#c2862b", "#1b2d52"];

export function TemplateItemsEditor({
  kind,
  label,
  desc,
  groupLabel,
  hasColor,
  items,
  canEdit,
}: {
  kind: TemplateKind;
  label: string;
  desc: string;
  groupLabel?: string;
  hasColor?: boolean;
  items: TemplateItem[];
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState<TemplateItem | { group: string | null } | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const groups: (string | null)[] = groupLabel
    ? Array.from(new Set(items.map((i) => i.group_label ?? ""))).map((g) => g || null)
    : [null];

  return (
    <>
      <Card>
        <div className="flex flex-wrap justify-between items-center gap-2">
          <CardTitle>
            <Icon name="checklist" size={24} className="text-blue" />
            {label}
          </CardTitle>
          {canEdit && (
            <Button onClick={() => setEditing({ group: null })}>
              <Icon name="plus" size={18} />
              {groupLabel ? `بند أو ${groupLabel} جديد` : "عنصر جديد"}
            </Button>
          )}
        </div>
        <Caption>{desc} التعديل يسري على ما يُنشأ بعده، وكل تعديل يُسجَّل في سجل التدقيق.</Caption>
        <FormError error={error} />
      </Card>

      {groups.map((g) => {
        const list = items.filter((i) => (i.group_label ?? null) === g).sort((a, b) => a.sort - b.sort);
        return (
          <Card key={g ?? "_"} label={g ?? label}>
            {groupLabel && (
              <div className="flex flex-wrap justify-between items-center gap-2">
                <h3 className="m-0 text-[15px] font-semibold">
                  {groupLabel}: {g ?? "بلا تصنيف"}
                </h3>
                {canEdit && (
                  <Button variant="ghost" onClick={() => setEditing({ group: g })}>
                    <Icon name="plus" size={18} />
                    بند
                  </Button>
                )}
              </div>
            )}
            {list.length === 0 && <Caption>لا عناصر بعد.</Caption>}
            <ol className="m-0 p-0 list-none flex flex-col">
              {list.map((it, k) => (
                <li
                  key={it.id}
                  className={`flex items-center gap-3 py-2 border-t border-line first:border-t-0 ${it.active ? "" : "opacity-60"}`}
                >
                  {hasColor && (
                    <span aria-hidden className="w-4 h-4 rounded-full flex-none" style={{ background: it.color ?? "#7d8699" }} />
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(it)}
                    className="flex-1 min-w-0 text-start bg-transparent border-0 cursor-pointer font-[inherit] text-navy p-0 text-[14.5px] min-h-10"
                  >
                    {it.title}
                  </button>
                  {!it.active && <Badge tone="neutral">موقوف</Badge>}
                  {canEdit && (
                    <span className="flex">
                      {([[-1, "up", "تحريك للأعلى", k === 0], [1, "down", "تحريك للأسفل", k === list.length - 1]] as const).map(
                        ([dir, icon, aria, disabled]) => (
                          <button
                            key={icon}
                            type="button"
                            aria-label={aria}
                            disabled={pending || disabled}
                            onClick={() =>
                              start(async () => {
                                setError(null);
                                const x = await moveTemplateRow("template_items", it.id, dir);
                                if (!x.ok) setError(x.error);
                              })
                            }
                            className="w-10 h-10 rounded-[10px] inline-flex items-center justify-center text-muted hover:bg-soft disabled:opacity-30 cursor-pointer"
                          >
                            <Icon name={icon} size={18} />
                          </button>
                        ),
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </Card>
        );
      })}

      {editing && (
        <ItemDialog
          kind={kind}
          item={"id" in editing ? editing : null}
          group={"id" in editing ? editing.group_label : editing.group}
          groups={groups.filter((g): g is string => !!g)}
          groupLabel={groupLabel}
          hasColor={hasColor}
          canEdit={canEdit}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

function ItemDialog({
  kind,
  item,
  group,
  groups,
  groupLabel,
  hasColor,
  canEdit,
  onClose,
}: {
  kind: TemplateKind;
  item: TemplateItem | null;
  group: string | null;
  groups: string[];
  groupLabel?: string;
  hasColor?: boolean;
  canEdit: boolean;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [grp, setGrp] = useState(group ?? "");
  const [color, setColor] = useState(item?.color ?? PALETTE[0]);
  const [active, setActive] = useState(item?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <Modal
      open
      onClose={onClose}
      title={item ? "تعديل عنصر" : "عنصر جديد"}
      subtitle={groupLabel && grp ? `${groupLabel}: ${grp}` : undefined}
      icon="checklist"
      footer={
        canEdit ? (
          <>
            <Button variant="ghost" onClick={onClose}>إلغاء</Button>
            <Button
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  if (groupLabel && !grp.trim()) return setError(`اختر ${groupLabel} أو اكتب جديداً`);
                  const r = await saveTemplateItem({
                    id: item?.id,
                    kind,
                    group_label: groupLabel ? grp : null,
                    title,
                    color: hasColor ? color : null,
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
        {groupLabel && (
          <Field label={groupLabel} hint="اختر من القائمة أو اكتب نوعاً جديداً.">
            <Input value={grp} onChange={(e) => setGrp(e.target.value)} list={`groups-${kind}`} />
            <datalist id={`groups-${kind}`}>{groups.map((g) => <option key={g} value={g} />)}</datalist>
          </Field>
        )}
        <Field label="العنصر">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus={!item} />
        </Field>
        {hasColor && (
          <Group label="اللون">
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`لون ${PALETTE.indexOf(c) + 1}`}
                  aria-pressed={color === c}
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-full cursor-pointer border-[3px] ${color === c ? "border-navy" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Group>
        )}
        <Group label="الحالة" hint="العنصر الموقوف لا يظهر في الاختيارات الجديدة، ويبقى فيما استُخدم فيه.">
          <div className="flex flex-wrap gap-2">
            <Pill on={active} onClick={() => setActive(true)}>مفعّل</Pill>
            <Pill on={!active} onClick={() => setActive(false)}>موقوف</Pill>
          </div>
        </Group>
      </fieldset>
    </Modal>
  );
}
