-- أدوات الاختبار المشتركة
\set ON_ERROR_STOP 1
set client_min_messages = warning;
\o /dev/null
create schema if not exists test;
grant usage on schema test to authenticated, service_role;
create table if not exists test.results (n serial, name text, ok boolean);
grant all on test.results to authenticated, service_role;
grant usage on sequence test.results_n_seq to authenticated, service_role;

create or replace function test.ok(cond boolean, name text) returns void language plpgsql as $$
begin
  insert into test.results (name, ok) values (name, coalesce(cond, false));
  if not coalesce(cond, false) then raise warning 'FAIL: %', name; end if;
end $$;

-- يتوقع أن ينفذ الأمر بخطأ (أي خطأ)
create or replace function test.throws(stmt text, name text) returns void language plpgsql as $$
begin
  begin
    execute stmt;
  exception when others then
    perform test.ok(true, name);
    return;
  end;
  perform test.ok(false, name);
end $$;

-- يتوقع أن الأمر لم يؤثر على أي صف (RLS يخفي الصفوف بدل الخطأ في UPDATE/DELETE)
create or replace function test.affects_none(stmt text, name text) returns void language plpgsql as $$
declare n int;
begin
  begin
    execute stmt;
    get diagnostics n = row_count;
  exception when others then
    n := 0;
  end;
  perform test.ok(n = 0, name);
end $$;
grant execute on all functions in schema test to authenticated, service_role;

create or replace function test.login(uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, false);
$$;
grant execute on function test.login(uuid) to authenticated, service_role;

\o
