-- اختبارات صلاحيات المرحلة 1 (الإعدادات). تعتمد على مستخدمي rls_foundation.test.sql.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null

-- مشرف يُمنح «تعديل القوالب» لاحقاً
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000030', 'tpl@anan.test');
insert into public.profiles (id, full_name, email) values ('00000000-0000-0000-0000-000000000030', 'مشرف القوالب', 'tpl@anan.test');
insert into public.user_roles (user_id, role, section) values ('00000000-0000-0000-0000-000000000030', 'supervisor', 'boys');

set role authenticated;

-- ---------------------------------------------------------------- القراءة
select test.login('00000000-0000-0000-0000-000000000006');
select test.ok((select count(*) from public.phase_requirement_templates) = 20, 'المستخدم الداخلي يقرأ متطلبات المراحل (20 متطلباً)');
select test.ok((select count(*) from public.project_types) = 4, 'المستخدم الداخلي يقرأ أنواع المشاريع');
select test.affects_none($$update public.phase_requirement_templates set title = 'عبث'$$, 'المشرف لا يعدّل متطلبات المراحل');
select test.throws($$insert into public.project_types (name) values ('نوع مزيف')$$, 'المشرف لا يضيف نوع مشروع');
select test.affects_none($$update public.organization set name = 'عبث'$$, 'المشرف لا يعدّل بيانات المؤسسة');
select test.ok((select count(*) from public.admin_users()) = 0, 'المشرف لا يرى قائمة المستخدمين للإدارة');
select test.ok((select count(*) from public.pending_invitations()) = 0, 'المشرف لا يرى الدعوات');
select test.throws($$select public.set_user_roles('00000000-0000-0000-0000-000000000006', '[{"role":"project_manager"}]')$$, 'المشرف لا يرقّي نفسه');
select test.throws($$select public.set_user_status('00000000-0000-0000-0000-000000000004', 'suspended')$$, 'المشرف لا يوقف أحداً');

select test.login('00000000-0000-0000-0000-000000000009');
select test.ok((select count(*) from public.phase_requirement_templates) = 0, 'ماي اي لا تقرأ القوالب الداخلية');

-- ---------------------------------------------------------------- الإدارة العليا: عرض فقط
select test.login('00000000-0000-0000-0000-000000000001');
select test.ok((select count(*) from public.admin_users()) > 5, 'الإدارة العليا ترى قائمة المستخدمين');
select test.affects_none($$update public.phase_requirement_templates set title = 'عبث'$$, 'الإدارة العليا لا تعدّل القوالب (عرض فقط)');
select test.throws($$select public.set_user_grants('00000000-0000-0000-0000-000000000006', '{approve_invoices}')$$, 'الإدارة العليا لا تمنح صلاحيات');
select test.ok(not exists (select 1 from information_schema.column_privileges
                            where table_name = 'invitations' and column_name = 'token_hash'
                              and grantee = 'authenticated' and privilege_type = 'SELECT'),
               'بصمة رمز الدعوة لا تُقرأ من العميل');

-- ---------------------------------------------------------------- مدير المشاريع
select test.login('00000000-0000-0000-0000-000000000002');
select public.set_user_roles('00000000-0000-0000-0000-000000000006',
  '[{"role":"supervisor","section":"boys"},{"role":"committee_head","section":"boys"}]');
select test.ok((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-000000000006') = 2, 'مدير المشاريع يجمع دورين لشخص');
select test.ok((select count(*) from public.audit_log where action = 'role.grant' and entity_id = '00000000-0000-0000-0000-000000000006' and actor_id = '00000000-0000-0000-0000-000000000002') = 1,
               'إضافة الدور تُسجَّل مرة واحدة (الفرق فقط)');
select public.set_user_roles('00000000-0000-0000-0000-000000000006', '[{"role":"supervisor","section":"boys"}]');
select test.ok((select count(*) from public.audit_log where action = 'role.revoke' and entity_id = '00000000-0000-0000-0000-000000000006') = 1, 'سحب الدور يُسجَّل');
select test.throws($$select public.set_user_roles('00000000-0000-0000-0000-000000000002', '[{"role":"supervisor"}]')$$, 'مدير المشاريع لا يسحب دوره من نفسه');
select test.throws($$select public.set_user_roles('00000000-0000-0000-0000-000000000006', '[]')$$, 'لا يُترك شخص بلا دور');
select test.throws($$select public.set_user_roles('00000000-0000-0000-0000-000000000006', '[{"role":"stage_leader"}]')$$, 'قائد المرحلة يتطلب تحديد المرحلة');
select test.throws($$select public.set_user_status('00000000-0000-0000-0000-000000000002', 'suspended')$$, 'مدير المشاريع لا يوقف نفسه');

select public.set_user_grants('00000000-0000-0000-0000-000000000030', '{edit_templates}');
select test.ok((select count(*) from public.user_grants where user_id = '00000000-0000-0000-0000-000000000030') = 1, 'منح «تعديل القوالب»');

update public.phase_requirement_templates set title = 'الإعلان منشور في القنوات الرسمية' where title = 'الإعلان منشور';
select test.ok((select count(*) from public.audit_log where entity = 'phase_requirement_templates' and action = 'settings.update') = 1,
               'تعديل متطلب مرحلة يُسجَّل مع القيم قبل وبعد');
select test.throws($$insert into public.phase_requirement_templates (phase, title, mode, owner_label) values (2, 'متطلب تلقائي بلا حدث', 'auto', 'قائد المشروع')$$,
                   'المتطلب التلقائي لا يُحفظ بدون حدث مرتبط');
update public.organization set contact_phone = '0500000000';
select test.ok((select count(*) from public.audit_log where entity = 'organization') = 1, 'تعديل بيانات المؤسسة يُسجَّل');

-- الإيقاف
select public.start_impersonation('00000000-0000-0000-0000-000000000004', 'متابعة جدول المشروع');
select public.end_impersonation();
select public.set_user_status('00000000-0000-0000-0000-000000000012', 'suspended');
select test.ok((select status from public.profiles where id = '00000000-0000-0000-0000-000000000012') = 'suspended', 'مدير المشاريع يوقف حساباً');
select test.ok((select count(*) from public.audit_log where action = 'user.status' and entity_id = '00000000-0000-0000-0000-000000000012') = 1, 'الإيقاف يُسجَّل');

-- الدعوات
select test.throws($$insert into public.invitations (email, full_name, roles, token_hash, invited_by)
  values ('PM@anan.test', 'مكرر', '[{"role":"supervisor"}]', 'hash-dup', '00000000-0000-0000-0000-000000000002')$$,
  'لا دعوة لبريد مسجل مسبقاً');
insert into public.invitations (email, full_name, roles, token_hash, invited_by)
values ('Twice@anan.test', 'دعوة 1', '[{"role":"supervisor"}]', 'hash-t1', '00000000-0000-0000-0000-000000000002');
insert into public.invitations (email, full_name, roles, token_hash, invited_by)
values ('twice@anan.test', 'دعوة 2', '[{"role":"supervisor"}]', 'hash-t2', '00000000-0000-0000-0000-000000000002');
select test.ok((select count(*) from public.pending_invitations() where email = 'twice@anan.test') = 1, 'الدعوة الجديدة تلغي السابقة لنفس البريد');

-- صاحب «تعديل القوالب» يعدّلها دون أن يصير مديراً
select test.login('00000000-0000-0000-0000-000000000030');
update public.template_items set title = 'دورات المياه نظيفة وكافية للعدد' where kind = 'site_check' and group_label = 'مدرسة' and sort = 1;
select test.ok((select count(*) from public.template_items where title = 'دورات المياه نظيفة وكافية للعدد') = 1, 'صاحب صلاحية «تعديل القوالب» يعدّل القوالب');
select test.ok((select count(*) from public.admin_users()) = 0, 'صاحب «تعديل القوالب» لا يرى إدارة المستخدمين');
select test.affects_none($$update public.organization set name = 'عبث'$$, 'صاحب «تعديل القوالب» لا يعدّل بيانات المؤسسة');
reset role;
\o
