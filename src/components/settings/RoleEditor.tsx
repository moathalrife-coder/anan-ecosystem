"use client";

import { Pill } from "@/components/ui/Pill";
import { Group, Select } from "./form";
import { ROLES, ROLE_LABEL, type Role, type RoleAssignment, type Section, type StageLevel } from "@/lib/roles";

export type RoleDraft = { roles: Role[]; section: Section | null; stage: StageLevel | null };

export function draftFromAssignments(a: RoleAssignment[]): RoleDraft {
  return {
    roles: Array.from(new Set(a.map((x) => x.role))),
    section: a.find((x) => x.section)?.section ?? null,
    stage: a.find((x) => x.stage_level)?.stage_level ?? null,
  };
}

/** الأدوار المختارة كلها بنفس القسم، والمرحلة تخص قائد المرحلة فقط */
export function draftToAssignments(d: RoleDraft): RoleAssignment[] {
  return d.roles.map((role) => ({
    role,
    section: d.section,
    stage_level: role === "stage_leader" ? d.stage : null,
  }));
}

export function RoleEditor({ value, onChange }: { value: RoleDraft; onChange: (v: RoleDraft) => void }) {
  const toggle = (r: Role) =>
    onChange({ ...value, roles: value.roles.includes(r) ? value.roles.filter((x) => x !== r) : [...value.roles, r] });
  return (
    <>
      <Group label="الأدوار" hint="يمكن أن يجمع الشخص أكثر من دور، ويبدّل بينها من أعلى الشاشة.">
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <Pill key={r} on={value.roles.includes(r)} onClick={() => toggle(r)}>
              {ROLE_LABEL[r]}
            </Pill>
          ))}
        </div>
      </Group>
      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
          القسم
          <Select value={value.section ?? ""} onChange={(e) => onChange({ ...value, section: (e.target.value || null) as Section | null })}>
            <option value="">القسمان (بنين وبنات)</option>
            <option value="boys">بنين فقط</option>
            <option value="girls">بنات فقط</option>
          </Select>
        </label>
        {value.roles.includes("stage_leader") && (
          <label className="flex flex-col gap-1.5 text-[14px] font-semibold">
            مرحلة قائد المرحلة
            <Select value={value.stage ?? ""} onChange={(e) => onChange({ ...value, stage: (e.target.value || null) as StageLevel | null })}>
              <option value="">اختر المرحلة</option>
              <option value="primary">المرحلة الابتدائية</option>
              <option value="intermediate">المرحلة المتوسطة</option>
              <option value="secondary">المرحلة الثانوية</option>
            </Select>
          </label>
        )}
      </div>
    </>
  );
}
