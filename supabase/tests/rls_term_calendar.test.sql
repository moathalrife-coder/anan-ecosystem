-- اختبارات التقويم الدراسي. تعتمد على مستخدمي rls_foundation.test.sql (اسم الملف يضمن تشغيله بعدها).
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null
set role authenticated;

-- مدير المشاريع يضيف فصلاً: 2026-08-23 (أحد) إلى 2026-09-19 (سبت) = 4 خميس، 4 جمعة، 4 سبت
select test.login('00000000-0000-0000-0000-000000000002');
insert into public.academic_terms (id, year_label, name, start_date, end_date)
values ('00000000-0000-0000-0000-0000000000c1', '1448–1449', 'الفصل الدراسي الأول', '2026-08-23', '2026-09-19');
select test.ok((select total from public.term_availability() where term_id = '00000000-0000-0000-0000-0000000000c1') = 12,
               'حساب الأيام المتاحة: 12 يوماً في أربعة أسابيع');

-- إجازة لا تُخصم، ثم إجازة تُخصم (الخميس 2026-09-03 إلى السبت 2026-09-05)
insert into public.calendar_events (title, kind, start_date, end_date, blocks_availability)
values ('يوم مفتوح', 'occasion', '2026-09-10', '2026-09-10', false);
insert into public.calendar_events (title, kind, start_date, end_date, blocks_availability)
values ('اختبارات قصيرة', 'exams', '2026-09-03', '2026-09-05', true);
select test.ok((select (thu, fri, sat, total) = (3, 3, 3, 9) from public.term_availability()
                 where term_id = '00000000-0000-0000-0000-0000000000c1'),
               'الأيام التي تُخصم من المتاح تُستثنى، والمناسبات الأخرى لا');

update public.academic_terms set fri_override = 5 where id = '00000000-0000-0000-0000-0000000000c1';
select test.ok((select (fri_calc, fri, total) = (3, 5, 11) from public.term_availability()
                 where term_id = '00000000-0000-0000-0000-0000000000c1'),
               'التعديل اليدوي يغلب العدد المحسوب');
select test.throws($$insert into public.academic_terms (year_label, name, start_date, end_date)
                     values ('1448–1449', 'فصل خاطئ', '2026-09-01', '2026-08-01')$$, 'نهاية الفصل لا تسبق بدايته');

-- القراءة والكتابة لغير مدير المشاريع
select test.login('00000000-0000-0000-0000-000000000006');
select test.ok((select count(*) from public.academic_terms) = 1, 'المستخدم الداخلي يقرأ التقويم الدراسي');
select test.affects_none($$update public.academic_terms set name = 'عبث'$$, 'المشرف لا يعدّل الفصول');
select test.throws($$insert into public.calendar_events (title, kind, start_date, end_date) values ('عبث', 'other', '2026-09-01', '2026-09-01')$$,
                   'المشرف لا يضيف إجازة');
select test.login('00000000-0000-0000-0000-000000000001');
select test.affects_none($$delete from public.calendar_events$$, 'الإدارة العليا لا تحذف من التقويم (عرض فقط)');
select test.login('00000000-0000-0000-0000-000000000009');
select test.ok((select count(*) from public.calendar_events) = 0, 'ماي اي لا ترى التقويم الداخلي');

reset role;
select test.ok((select count(*) from public.audit_log where entity = 'academic_terms') >= 2, 'تعديلات التقويم تُسجَّل في سجل التدقيق');
\o
