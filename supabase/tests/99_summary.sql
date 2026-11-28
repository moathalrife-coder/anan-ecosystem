\set ON_ERROR_STOP 1
-- ---------------------------------------------------------------- النتيجة
\o
\pset footer off
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from test.results;
select name as failed_test from test.results where not ok;
do $$ begin
  if exists (select 1 from test.results where not ok) then raise exception 'فشلت اختبارات الصلاحيات'; end if;
end $$;
