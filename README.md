# منظومة عنان لإدارة المشاريع

منظومة ويب لإدارة دورة حياة مشاريع عنان: من المقترح والاعتماد، إلى الفريق واللجان والمهام والمالية والمشاركين، حتى الإغلاق والأرشيف.

**النسخة الحالية:** v0.2.0 — المرحلة 1 (الإعدادات). انظر [سجل التغييرات](CHANGELOG.md).

## التقنية

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4، عربي RTL أولاً.
- Supabase: PostgreSQL + Auth، والصلاحيات مفروضة بـ Row Level Security.
- أيقونات Phosphor (duotone)، وخطا Alexandria و IBM Plex Sans Arabic.

## البنية

```
supabase/migrations/   مخطط القاعدة والأدوار وRLS وسجل التدقيق
supabase/tests/        اختبارات الصلاحيات (كل دور يحاول ما ليس له)
src/app/(auth)/        الدخول، والدعوة، واستعادة كلمة المرور
src/app/(app)/         الهيكل وكل صفحات القائمة ومساحة المشروع
src/components/shell/  الهيدر، وشريط الأيقونات، وتبويبات المشروع، وبلاطة العنوان
src/lib/roles.ts       أسماء الأدوار والقوائم (مرآة للواجهة؛ الصلاحية الحقيقية في القاعدة)
```

## التشغيل محلياً

1. `npm install`
2. انسخ `.env.example` إلى `.env.local` واملأ مفاتيح مشروع Supabase.
3. طبّق الترحيلات على المشروع: `supabase db push` (أو الصق ملفات `supabase/migrations` في محرر SQL بالترتيب).
4. في لوحة Supabase:
   - **Authentication → Sign In / Providers:** أوقف التسجيل الذاتي (Allow new users to sign up).
   - **Authentication → URL Configuration:** أضف `https://<النطاق>/auth/callback` و `https://<النطاق>/auth/confirm`.
   - **Authentication → Email Templates → Reset Password:** استخدم القالب في `supabase/templates/recovery.html`.
5. أنشئ أول حساب مدير مشاريع: `npm run bootstrap:admin -- "الاسم" email@example.com 05xxxxxxxx`
6. `npm run dev` وافتح http://localhost:3000

## الفحوص

```
npm run lint
npm run typecheck
npm run test:db     # اختبارات RLS على PostgreSQL مؤقت (لا يحتاج Docker)
npm run build
```

## مبادئ ثابتة

- كل جدول تشغيلي يحمل `project_id` و `section`، وكل تغيير حساس يُكتب في `audit_log`.
- الواجهة لا تقرر الصلاحية: أي إخفاء في الواجهة يقابله منع في القاعدة، ومعه اختبار في `supabase/tests`.
- لا نص إنجليزي ظاهر في الواجهة، ولا أزرار ميتة.
- كل مرحلة تُسلَّم وتُعتمد قبل بدء التي بعدها (ترتيب البناء في ملف التسليم §8).
