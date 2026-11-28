-- =====================================================================
-- التقويم الدراسي (طلب معاذ 2026-11-28)
-- الفصول الدراسية وتواريخها، والإجازات والمناسبات، وعدد أيام الخميس والجمعة
-- والسبت المتاحة في كل فصل. يتغير مع تقويم وزارة التعليم، فهو بيانات تُعدّل
-- من الإعدادات. يقرؤه كل مستخدم داخلي، ويعدّله مدير المشاريع. كل تعديل يُسجَّل.
-- =====================================================================

create table public.academic_terms (
  id            uuid primary key default gen_random_uuid(),
  year_label    text not null check (length(btrim(year_label)) > 1),   -- مثل: 1448–1449
  name          text not null check (length(btrim(name)) > 1),         -- مثل: الفصل الدراسي الأول
  start_date    date not null,
  end_date      date not null,
  -- تعديل يدوي على العدد المحسوب (فارغ = يُعتمد المحسوب)
  thu_override  int check (thu_override between 0 and 60),
  fri_override  int check (fri_override between 0 and 60),
  sat_override  int check (sat_override between 0 and 60),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint academic_terms_dates check (end_date >= start_date),
  constraint academic_terms_unique unique (year_label, name)
);

create table public.calendar_events (
  id                   uuid primary key default gen_random_uuid(),
  title                text not null check (length(btrim(title)) > 1),
  kind                 text not null check (kind in ('holiday', 'exams', 'occasion', 'other')),
  start_date           date not null,
  end_date             date not null,
  -- هل تُخصم هذه الأيام من الأيام المتاحة للمشاريع؟
  blocks_availability  boolean not null default false,
  note                 text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint calendar_events_dates check (end_date >= start_date)
);
create index calendar_events_range on public.calendar_events (start_date, end_date);

create trigger academic_terms_touch before update on public.academic_terms
  for each row execute function private.touch_updated_at();
create trigger academic_terms_audit after insert or update or delete on public.academic_terms
  for each row execute function private.audit_settings_row();
create trigger calendar_events_touch before update on public.calendar_events
  for each row execute function private.touch_updated_at();
create trigger calendar_events_audit after insert or update or delete on public.calendar_events
  for each row execute function private.audit_settings_row();

alter table public.academic_terms enable row level security;
alter table public.calendar_events enable row level security;

create policy academic_terms_read on public.academic_terms for select to authenticated using (private.is_internal());
create policy academic_terms_write on public.academic_terms for all to authenticated
  using (private.has_role('project_manager')) with check (private.has_role('project_manager'));
create policy calendar_events_read on public.calendar_events for select to authenticated using (private.is_internal());
create policy calendar_events_write on public.calendar_events for all to authenticated
  using (private.has_role('project_manager')) with check (private.has_role('project_manager'));

revoke all on public.academic_terms, public.calendar_events from anon;
grant select, insert, update, delete on public.academic_terms, public.calendar_events to authenticated;

-- ---------------------------------------------------------------------
-- الأيام المتاحة لكل فصل: أيام الخميس والجمعة والسبت بين بدايته ونهايته،
-- عدا الأيام الواقعة في مناسبة «تُخصم من المتاح». التعديل اليدوي يغلب المحسوب.
-- ---------------------------------------------------------------------
create function public.term_availability()
returns table (
  term_id uuid, thu_calc int, fri_calc int, sat_calc int, thu int, fri int, sat int, total int
)
language sql stable security invoker set search_path = '' as $$
  with days as (
    select t.id, d::date as day, extract(isodow from d)::int as dow
      from public.academic_terms t,
           generate_series(t.start_date, t.end_date, interval '1 day') d
     where extract(isodow from d) in (4, 5, 6)
       and not exists (select 1 from public.calendar_events e
                        where e.blocks_availability and d::date between e.start_date and e.end_date)
  ),
  calc as (
    select t.id,
           count(*) filter (where dy.dow = 4)::int as thu_calc,
           count(*) filter (where dy.dow = 5)::int as fri_calc,
           count(*) filter (where dy.dow = 6)::int as sat_calc,
           t.thu_override, t.fri_override, t.sat_override
      from public.academic_terms t left join days dy on dy.id = t.id
     group by t.id
  )
  select id, thu_calc, fri_calc, sat_calc,
         coalesce(thu_override, thu_calc), coalesce(fri_override, fri_calc), coalesce(sat_override, sat_calc),
         coalesce(thu_override, thu_calc) + coalesce(fri_override, fri_calc) + coalesce(sat_override, sat_calc)
    from calc
$$;
revoke all on function public.term_availability() from public, anon;
grant execute on function public.term_availability() to authenticated;
