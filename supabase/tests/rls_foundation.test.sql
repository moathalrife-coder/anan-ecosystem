-- اختبارات صلاحيات المرحلة 0: كل اختبار يحاول ما ليس للدور، والمتوقع أن تمنعه قاعدة البيانات.
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null

-- ---------------------------------------------------------------- بيانات
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'top@anan.test'),
  ('00000000-0000-0000-0000-000000000002', 'pm@anan.test'),
  ('00000000-0000-0000-0000-000000000003', 'stage.primary.boys@anan.test'),
  ('00000000-0000-0000-0000-000000000004', 'leader@anan.test'),
  ('00000000-0000-0000-0000-000000000005', 'head@anan.test'),
  ('00000000-0000-0000-0000-000000000006', 'sup@anan.test'),
  ('00000000-0000-0000-0000-000000000007', 'acc@anan.test'),
  ('00000000-0000-0000-0000-000000000008', 'wh@anan.test'),
  ('00000000-0000-0000-0000-000000000009', 'mai@anan.test'),
  ('00000000-0000-0000-0000-000000000010', 'girls.stage@anan.test'),
  ('00000000-0000-0000-0000-000000000011', 'suspended@anan.test'),
  ('00000000-0000-0000-0000-000000000012', 'outsider.sup@anan.test');

insert into public.profiles (id, full_name, email, status)
select id, 'مستخدم ' || right(id::text, 2), email,
       case when email like 'suspended%' then 'suspended'::public.user_status else 'active' end
  from auth.users;

insert into public.user_roles (user_id, role, section, stage_level) values
  ('00000000-0000-0000-0000-000000000001', 'top_management', null, null),
  ('00000000-0000-0000-0000-000000000002', 'project_manager', null, null),
  ('00000000-0000-0000-0000-000000000003', 'stage_leader', 'boys', 'primary'),
  ('00000000-0000-0000-0000-000000000004', 'project_leader', 'boys', null),
  ('00000000-0000-0000-0000-000000000005', 'committee_head', 'boys', null),
  ('00000000-0000-0000-0000-000000000005', 'supervisor', 'boys', null),
  ('00000000-0000-0000-0000-000000000006', 'supervisor', 'boys', null),
  ('00000000-0000-0000-0000-000000000007', 'accountant', null, null),
  ('00000000-0000-0000-0000-000000000008', 'warehouse_manager', null, null),
  ('00000000-0000-0000-0000-000000000009', 'design_vendor', null, null),
  ('00000000-0000-0000-0000-000000000010', 'stage_leader', 'girls', 'primary'),
  ('00000000-0000-0000-0000-000000000011', 'project_manager', null, null),
  ('00000000-0000-0000-0000-000000000012', 'supervisor', 'boys', null);

insert into public.projects (id, section, stage_level, name, leader_id, stage_leader_id) values
  ('10000000-0000-0000-0000-000000000001', 'boys',  'primary',      'أشبال عنان 6', '00000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000003'),
  ('10000000-0000-0000-0000-000000000002', 'boys',  'intermediate', 'مشروع المتوسط', null, null),
  ('10000000-0000-0000-0000-000000000003', 'girls', 'primary',      'مشروع البنات', null, '00000000-0000-0000-0000-000000000010');

insert into public.team_members (project_id, user_id, committee, is_head, section) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000005', 'food', true, 'girls'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000006', 'food', false, 'girls');

select test.ok((select bool_and(section = 'boys') from public.team_members), 'قسم عضو الفريق يُنسخ من المشروع ولا يُكتب يدوياً');

-- ---------------------------------------------------------------- كجهات مختلفة
set role authenticated;

-- زائر بلا جلسة
select set_config('request.jwt.claims', '', false);
select test.ok((select count(*) from public.projects) = 0, 'بدون دخول: لا مشاريع');
select test.ok((select count(*) from public.profiles) = 0, 'بدون دخول: لا ملفات شخصية');

-- الإدارة العليا
select test.login('00000000-0000-0000-0000-000000000001');
select test.ok((select count(*) from public.projects) = 3, 'الإدارة العليا ترى كل المشاريع في القسمين');
select test.ok((select count(*) from public.audit_log) > 0, 'الإدارة العليا تقرأ سجل التدقيق');
select test.affects_none($$update public.projects set name = 'x'$$, 'الإدارة العليا لا تعدّل المشاريع (عرض فقط)');
select test.throws($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-000000000006', 'accountant')$$,
                   'الإدارة العليا لا تمنح أدواراً');
select test.throws($$select public.start_impersonation('00000000-0000-0000-0000-000000000006', 'متابعة سير العمل')$$,
                   'الإدارة العليا لا تدخل بحساب غيرها');

-- مدير المشاريع
select test.login('00000000-0000-0000-0000-000000000002');
select test.ok((select count(*) from public.projects) = 3, 'مدير المشاريع يرى كل المشاريع');
insert into public.user_grants (user_id, grant_key) values ('00000000-0000-0000-0000-000000000003', 'supervisor_sensitive_data');
select test.ok((select count(*) from public.audit_log where action = 'grant.give') = 1, 'منح صلاحية يُسجَّل في التدقيق');
delete from public.user_grants where user_id = '00000000-0000-0000-0000-000000000003';
select test.ok((select count(*) from public.audit_log where action = 'grant.revoke') = 1, 'سحب صلاحية يُسجَّل في التدقيق');
select test.ok((select actor_id from public.audit_log where action = 'grant.revoke') = '00000000-0000-0000-0000-000000000002',
               'التدقيق يسجّل الفاعل الحقيقي');
select test.throws($$update public.audit_log set action = 'x'$$, 'لا تعديل على سجل التدقيق');
select test.throws($$delete from public.audit_log$$, 'لا حذف من سجل التدقيق');
select test.throws($$insert into public.audit_log (action, entity) values ('fake', 'x')$$, 'لا إضافة مباشرة لسجل التدقيق من العميل');
select test.throws($$truncate public.audit_log$$, 'لا تفريغ لسجل التدقيق');
update public.projects set current_phase = 2 where id = '10000000-0000-0000-0000-000000000001';
select test.ok((select count(*) from public.audit_log where action = 'project.change') = 1, 'تغيير مرحلة المشروع يُسجَّل');
select test.throws($$update public.projects set section = 'girls' where id = '10000000-0000-0000-0000-000000000001'$$,
                   'لا يُنقل مشروع بين القسمين');
select test.throws($$select public.start_impersonation('00000000-0000-0000-0000-000000000006', 'قصير')$$,
                   'الدخول بحساب آخر يتطلب سبباً مكتوباً');

-- الدخول بحساب المشرف
select public.start_impersonation('00000000-0000-0000-0000-000000000006', 'متابعة رفع خطة لجنة التغذية');
select test.ok((select count(*) from public.projects) = 1, 'أثناء الدخول بحساب المشرف: يرى ما يراه المشرف فقط');
select test.ok((select count(*) from public.audit_log) = 0, 'أثناء الدخول بحساب المشرف: لا يقرأ سجل التدقيق');
select test.throws($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-000000000006', 'accountant')$$,
                   'أثناء الدخول بحساب آخر: لا إدارة للصلاحيات');
select test.ok((public.my_context() ->> 'impersonating')::boolean, 'سياق الواجهة يعرف أن الجلسة دخول بحساب آخر');
select public.end_impersonation();
select test.ok((select count(*) from public.audit_log where action = 'impersonation.start'
                  and actor_id = '00000000-0000-0000-0000-000000000002'
                  and on_behalf_of = '00000000-0000-0000-0000-000000000006'
                  and reason = 'متابعة رفع خطة لجنة التغذية') = 1,
               'الدخول بحساب آخر يُسجَّل باسم مدير المشاريع مع السبب وصاحب الحساب');
select test.ok((select count(*) from public.audit_log where action = 'impersonation.end') = 1, 'إنهاء الدخول بحساب آخر يُسجَّل');
select test.ok((select count(*) from public.projects) = 3, 'بعد الإنهاء يعود مدير المشاريع لصلاحياته');

-- قائد مرحلة ابتدائي بنين
select test.login('00000000-0000-0000-0000-000000000003');
select test.ok((select array_agg(name) from public.projects) = array['أشبال عنان 6'], 'قائد المرحلة يرى مشاريع مرحلته وقسمه فقط');
select test.ok((select count(*) from public.audit_log) = 0, 'قائد المرحلة لا يرى سجل التدقيق');
select test.affects_none($$update public.projects set name = 'x' where id = '10000000-0000-0000-0000-000000000002'$$,
                         'قائد المرحلة لا يعدّل مشروعاً خارج مرحلته');
select test.affects_none($$update public.projects set name = 'x' where id = '10000000-0000-0000-0000-000000000003'$$,
                         'قائد مرحلة البنين لا يعدّل مشروع البنات');

-- قائدة مرحلة ابتدائي بنات
select test.login('00000000-0000-0000-0000-000000000010');
select test.ok((select array_agg(name) from public.projects) = array['مشروع البنات'], 'قسم البنات منفصل: ترى مشاريع البنات فقط');

-- قائد المشروع
select test.login('00000000-0000-0000-0000-000000000004');
select test.ok((select count(*) from public.projects) = 1, 'قائد المشروع يرى مشروعه فقط');
update public.projects set season = '1448' where id = '10000000-0000-0000-0000-000000000001';
select test.ok((select season from public.projects where id = '10000000-0000-0000-0000-000000000001') = '1448', 'قائد المشروع يعدّل مشروعه');
select test.throws($$insert into public.projects (section, stage_level, name) values ('boys', 'primary', 'مشروع جديد')$$,
                   'قائد المشروع لا ينشئ مشروعاً مباشرة (عبر المقترح فقط)');

-- مسؤول اللجنة / المشرف
select test.login('00000000-0000-0000-0000-000000000006');
select test.ok((select count(*) from public.projects) = 1, 'المشرف يرى المشروع الذي هو في فريقه فقط');
select test.affects_none($$update public.projects set name = 'x'$$, 'المشرف لا يعدّل بطاقة المشروع');
select test.affects_none($$delete from public.team_members$$, 'المشرف لا يعدّل الفريق');
select test.ok((select count(*) from public.user_roles) = 1, 'المشرف يرى أدواره فقط');
select test.throws($$insert into public.user_grants (user_id, grant_key) values ('00000000-0000-0000-0000-000000000006', 'approve_invoices')$$,
                   'المشرف لا يمنح نفسه صلاحية');
select test.throws($$select public.start_impersonation('00000000-0000-0000-0000-000000000004', 'أريد أن أرى حسابه')$$,
                   'المشرف لا يدخل بحساب غيره');
select test.affects_none($$update public.profiles set status = 'active'$$, 'المشرف لا يعدّل حالة الحسابات');

-- مشرف ليس في أي فريق
select test.login('00000000-0000-0000-0000-000000000012');
select test.ok((select count(*) from public.projects) = 0, 'مشرف خارج الفريق لا يرى المشروع');

-- المحاسب
select test.login('00000000-0000-0000-0000-000000000007');
select test.ok((select count(*) from public.projects) = 3, 'المحاسب يرى كل المشاريع (للمالية)');
select test.affects_none($$update public.projects set name = 'x'$$, 'المحاسب لا يعدّل المشاريع');
select test.ok((select count(*) from public.audit_log) = 0, 'المحاسب لا يرى سجل التدقيق');

-- مسؤول المستودع
select test.login('00000000-0000-0000-0000-000000000008');
select test.ok((select count(*) from public.projects) = 0, 'مسؤول المستودع لا يرى بطاقات المشاريع');

-- ماي اي
select test.login('00000000-0000-0000-0000-000000000009');
select test.ok((select count(*) from public.projects) = 0, 'ماي اي لا ترى المشاريع');
select test.ok((select count(*) from public.profiles) = 1, 'ماي اي ترى ملفها فقط، لا جوالات المشرفين');

-- حساب موقوف (حتى لو كان مدير مشاريع)
select test.login('00000000-0000-0000-0000-000000000011');
select test.ok((select count(*) from public.projects) = 0, 'الحساب الموقوف لا يرى شيئاً');
select test.throws($$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-000000000011', 'top_management')$$,
                   'الحساب الموقوف لا يمنح أدواراً');

-- ---------------------------------------------------------------- مفتاح الخدمة
reset role;
set role service_role;
select test.throws($$delete from public.audit_log$$, 'حتى مفتاح الخدمة لا يحذف من سجل التدقيق');
select test.throws($$update public.audit_log set reason = 'x'$$, 'حتى مفتاح الخدمة لا يعدّل سجل التدقيق');
reset role;

-- الدعوات
insert into public.invitations (email, full_name, roles, token_hash, invited_by)
values ('new@anan.test', 'مشرف جديد', '[{"role":"supervisor","section":"boys"}]', 'hash-ok', '00000000-0000-0000-0000-000000000002'),
       ('old@anan.test', 'دعوة قديمة', '[{"role":"supervisor"}]', 'hash-old', '00000000-0000-0000-0000-000000000002');
update public.invitations set expires_at = now() - interval '1 day' where token_hash = 'hash-old';
insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000000020', 'new@anan.test'),
                                          ('00000000-0000-0000-0000-000000000021', 'old@anan.test');
set role service_role;
select test.ok(public.invitation_by_token('hash-ok') is not null, 'الدعوة الصالحة تُقرأ برمزها');
select test.ok(public.invitation_by_token('hash-old') is null, 'الدعوة المنتهية (أكثر من 7 أيام) لا تُقرأ');
select public.finalize_invitation('hash-ok', '00000000-0000-0000-0000-000000000020');
select test.ok((select count(*) from public.user_roles where user_id = '00000000-0000-0000-0000-000000000020' and role = 'supervisor') = 1,
               'قبول الدعوة ينشئ الأدوار المحددة فيها');
select test.throws($$select public.finalize_invitation('hash-ok', '00000000-0000-0000-0000-000000000020')$$, 'الدعوة لا تُستخدم مرتين');
select test.throws($$select public.finalize_invitation('hash-old', '00000000-0000-0000-0000-000000000021')$$, 'الدعوة المنتهية مرفوضة');
-- قفل الدخول
select public.login_failed('x@anan.test') from generate_series(1, 5);
select test.ok((public.login_status('X@anan.test') ->> 'locked_until') is not null, 'إيقاف الدخول 15 دقيقة بعد 5 محاولات');
select public.login_succeeded('x@anan.test');
select test.ok((public.login_status('x@anan.test') ->> 'locked_until') is null, 'الدخول الناجح يمسح العداد');
reset role;

set role authenticated;
select test.login('00000000-0000-0000-0000-000000000006');
select test.throws($$select public.finalize_invitation('hash-x', '00000000-0000-0000-0000-000000000006')$$, 'العميل لا يستدعي دوال الدعوات');
select test.throws($$select public.login_email_for('pm@anan.test')$$, 'العميل لا يكشف البريد من الجوال');
select test.throws($$select * from private.login_attempts$$, 'العميل لا يقرأ محاولات الدخول');
reset role;

