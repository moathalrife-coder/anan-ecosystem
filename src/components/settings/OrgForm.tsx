"use client";

import { useState, useTransition } from "react";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, Caption } from "@/components/ui/Card";
import { Field, FormError, Input } from "./form";
import { saveOrganization } from "@/app/(app)/settings/actions";

export type Org = {
  name: string;
  store_url: string;
  contact_phone: string;
  whatsapp: string;
  footer_line: string;
  socials: Record<string, string>;
};

const SOCIALS: { key: string; label: string }[] = [
  { key: "x", label: "إكس" },
  { key: "instagram", label: "إنستغرام" },
  { key: "snapchat", label: "سناب شات" },
  { key: "tiktok", label: "تيك توك" },
];

export function OrgForm({ org, canEdit }: { org: Org; canEdit: boolean }) {
  const [v, setV] = useState(org);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const set = (k: keyof Org, val: string) => {
    setSaved(false);
    setV((o) => ({ ...o, [k]: val }));
  };
  const setSocial = (k: string, val: string) => {
    setSaved(false);
    setV((o) => ({ ...o, socials: { ...o.socials, [k]: val } }));
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          setError(null);
          const socials = Object.fromEntries(Object.entries(v.socials).filter(([, x]) => x.trim()));
          const r = await saveOrganization({ ...v, socials });
          if (r.ok) setSaved(true);
          else setError(r.error);
        });
      }}
      className="flex flex-col gap-4"
    >
      <fieldset disabled={!canEdit} className="contents">
        <Card>
          <CardTitle>
            <Icon name="id-card" size={24} className="text-blue" />
            بيانات المؤسسة
          </CardTitle>
          <Caption>تظهر في الملفات المصدّرة والملف التسويقي ورسائل الأهالي.</Caption>
          <FormError error={error} />
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
            <Field label="اسم المؤسسة">
              <Input value={v.name} onChange={(e) => set("name", e.target.value)} />
            </Field>
            <Field label="رابط المتجر" hint="رابط التسجيل الذي يُرسل للأهالي">
              <Input dir="ltr" className="text-right" type="url" value={v.store_url} onChange={(e) => set("store_url", e.target.value)} />
            </Field>
            <Field label="رقم التواصل" hint="بصيغة 05xxxxxxxx">
              <Input dir="ltr" className="text-right" inputMode="tel" value={v.contact_phone} onChange={(e) => set("contact_phone", e.target.value)} />
            </Field>
            <Field label="رقم واتساب">
              <Input dir="ltr" className="text-right" inputMode="tel" value={v.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
            </Field>
          </div>
          <Field label="سطر التذييل" hint="يظهر أسفل الملفات المصدّرة">
            <Input value={v.footer_line} onChange={(e) => set("footer_line", e.target.value)} maxLength={120} />
          </Field>
        </Card>

        <Card>
          <CardTitle>
            <Icon name="link" size={24} className="text-blue" />
            حسابات التواصل الاجتماعي
          </CardTitle>
          <Caption>اسم الحساب أو الرابط. اترك الخانة فارغة إذا لم يكن هناك حساب.</Caption>
          <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
            {SOCIALS.map((s) => (
              <Field key={s.key} label={s.label}>
                <Input dir="ltr" className="text-right" value={v.socials[s.key] ?? ""} onChange={(e) => setSocial(s.key, e.target.value)} />
              </Field>
            ))}
          </div>
        </Card>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-3 justify-end">
            {saved && (
              <span role="status" className="text-success text-[14px] font-semibold inline-flex items-center gap-1.5">
                <Icon name="check" size={18} />
                حُفظت البيانات
              </span>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "جارٍ الحفظ…" : "حفظ البيانات"}
            </Button>
          </div>
        )}
      </fieldset>
    </form>
  );
}
