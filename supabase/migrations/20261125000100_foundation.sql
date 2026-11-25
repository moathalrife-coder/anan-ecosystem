-- =====================================================================
-- منظومة عنان — المرحلة 0 (الأساس)
-- الأدوار التسعة، الصلاحيات الإضافية، الدعوات، الدخول بحساب شخص آخر،
-- سجل التدقيق غير القابل للتعديل، وأساس المشاريع وفريقها مع RLS.
--
-- مبادئ:
--   * كل قرار صلاحية يُفرض هنا (RLS + دوال SECURITY DEFINER)، والواجهة مرآة فقط.
--   * كل جدول تشغيلي يحمل project_id و section.
--   * audit_log للإضافة فقط: لا تعديل ولا حذف ولا تفريغ، حتى لمفتاح الخدمة.
--   * الدوال المساعدة في مخطط private غير المكشوف عبر الـ API.
-- =====================================================================

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;

-- ---------------------------------------------------------------------
-- الأنواع
-- ---------------------------------------------------------------------
create type public.app_role as enum (
  'top_management',     -- الإدارة العليا
  'project_manager',    -- مدير المشاريع
  'stage_leader',       -- قائد المرحلة
  'project_leader',     -- قائد المشروع
  'committee_head',     -- مسؤول اللجنة
  'supervisor',         -- مشرف
  'accountant',         -- المحاسب
  'warehouse_manager',  -- مسؤول المستودع
  'design_vendor'       -- ماي اي (التصميم)
);

create type public.section as enum ('boys', 'girls');                 -- بنين / بنات
create type public.stage_level as enum ('primary', 'intermediate', 'secondary'); -- ابتدائي / متوسط / ثانوي
create type public.user_status as enum ('invited', 'active', 'suspended');

create type public.grant_key as enum (
  'supervisor_sensitive_data', -- البيانات الحساسة للمشرفين
  'health_all_projects',       -- الملف الصحي لكل المشاريع
  'approve_invoices',          -- اعتماد الفواتير عند غياب المحاسب
  'edit_templates'             -- تعديل القوالب
);

create type public.committee as enum (
  'development',  -- اللجنة التطويرية
  'educational',  -- اللجنة التربوية
  'events',       -- لجنة الفعاليات
  'sports',       -- اللجنة الرياضية
  'food',         -- لجنة التغذية
  'logistics',    -- اللجنة اللوجستية
  'motivation',   -- اللجنة التحفيزية
  'media',        -- اللجنة الإعلامية
  'improvement'   -- لجنة التطوير (مختلفة عن التطويرية)
);

create type public.project_status as enum ('proposal', 'active', 'closed', 'archived', 'cancelled');

-- ---------------------------------------------------------------------
-- بيانات المؤسسة (صف واحد)
-- ---------------------------------------------------------------------
create table public.organization (
  id            boolean primary key default true check (id),  -- يضمن صفاً واحداً
  name          text not null default 'مؤسسة عنان التربوية',
  contact_phone text,
  whatsapp      text,
  socials       jsonb not null default '{}'::jsonb,
  store_url     text,
  logo_path     text,
  footer_line   text,
  updated_at    timestamptz not null default now()
);
insert into public.organization (id) values (true);

-- ---------------------------------------------------------------------
-- المستخدمون
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete restrict,
  full_name   text not null check (length(btrim(full_name)) > 1),
  email       text not null unique,
  phone       text unique check (phone is null or phone ~ '^05[0-9]{8}$'),
  status      public.user_status not null default 'active',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- أدوار متعددة للشخص. section فارغ = القسمان. stage_level لازم لقائد المرحلة.
create table public.user_roles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         public.app_role not null,
  section      public.section,
  stage_level  public.stage_level,
  granted_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  constraint stage_leader_needs_stage check (role <> 'stage_leader' or stage_level is not null),
  constraint stage_only_for_stage_leader check (stage_level is null or role = 'stage_leader')
);
alter table public.user_roles
  add constraint user_roles_unique unique nulls not distinct (user_id, role, section, stage_level);

-- صلاحيات إضافية يمنحها مدير المشاريع. السحب = حذف الصف (ويُسجَّل في التدقيق).
create table public.user_grants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  grant_key   public.grant_key not null,
  granted_by  uuid references public.profiles (id),
  granted_at  timestamptz not null default now(),
  unique (user_id, grant_key)
);

-- ---------------------------------------------------------------------
-- الدعوات (صالحة 7 أيام). الرمز نفسه لا يُخزَّن، فقط بصمته SHA-256.
-- ---------------------------------------------------------------------
create table public.invitations (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  phone        text check (phone is null or phone ~ '^05[0-9]{8}$'),
  full_name    text not null,
  roles        jsonb not null check (jsonb_typeof(roles) = 'array' and jsonb_array_length(roles) > 0),
  token_hash   text not null unique,
  invited_by   uuid references public.profiles (id),
  expires_at   timestamptz not null default now() + interval '7 days',
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles (id),
  revoked_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index invitations_email_idx on public.invitations (lower(email));

-- ---------------------------------------------------------------------
-- الدخول بحساب شخص آخر (مدير المشاريع فقط، بسبب مكتوب)
-- ---------------------------------------------------------------------
create table public.impersonation_sessions (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references public.profiles (id),
  target_id   uuid not null references public.profiles (id),
  reason      text not null check (length(btrim(reason)) >= 5),
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  check (actor_id <> target_id)
);
create unique index impersonation_one_active on public.impersonation_sessions (actor_id) where ended_at is null;

-- ---------------------------------------------------------------------
-- محاولات الدخول (للإيقاف 15 دقيقة بعد 5 محاولات) — للخادم فقط
-- ---------------------------------------------------------------------
create table private.login_attempts (
  identifier    text primary key,
  failures      int not null default 0,
  locked_until  timestamptz,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- سجل التدقيق (append-only)
-- ---------------------------------------------------------------------
create table public.audit_log (
  id            bigint generated always as identity primary key,
  at            timestamptz not null default now(),
  actor_id      uuid,          -- من نفّذ فعلاً (مدير المشاريع عند الدخول بحساب غيره)
  on_behalf_of  uuid,          -- صاحب الحساب الذي دخل به
  action        text not null,
  entity        text not null,
  entity_id     text,
  section       public.section,
  payload       jsonb not null default '{}'::jsonb,
  reason        text
);
create index audit_log_at_idx on public.audit_log (at desc);
create index audit_log_entity_idx on public.audit_log (entity, entity_id);

create function private.audit_log_immutable() returns trigger
language plpgsql as $$
begin
  raise exception 'سجل التدقيق للإضافة فقط: لا يُعدَّل ولا يُحذف'
    using errcode = 'insufficient_privilege';
end $$;

create trigger audit_log_no_update before update or delete on public.audit_log
  for each row execute function private.audit_log_immutable();
create trigger audit_log_no_truncate before truncate on public.audit_log
  for each statement execute function private.audit_log_immutable();

-- ---------------------------------------------------------------------
-- المشاريع وفريقها (أساس النطاق؛ تتوسع في المراحل التالية)
-- ---------------------------------------------------------------------
create table public.projects (
  id               uuid primary key default gen_random_uuid(),
  section          public.section not null,
  stage_level      public.stage_level not null,
  name             text not null,
  season           text,
  status           public.project_status not null default 'proposal',
  current_phase    smallint not null default 1 check (current_phase between 1 and 6),
  leader_id        uuid references public.profiles (id),
  stage_leader_id  uuid references public.profiles (id),
  starts_on        date,
  ends_on          date,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table public.team_members (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  section     public.section not null,
  user_id     uuid not null references public.profiles (id),
  committee   public.committee,
  is_head     boolean not null default false,
  group_id    uuid,
  created_at  timestamptz not null default now(),
  unique (project_id, user_id, committee)
);
create index team_members_user_idx on public.team_members (user_id);

-- section في team_members يُنسخ دائماً من المشروع ولا يُكتب يدوياً
create function private.team_member_section() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  select p.section into new.section from public.projects p where p.id = new.project_id;
  return new;
end $$;
create trigger team_members_section before insert or update on public.team_members
  for each row execute function private.team_member_section();

-- =====================================================================
-- دوال الهوية والصلاحيات (private)
-- =====================================================================

-- المستخدم الفعلي الذي يقرأ الصلاحيات بعينه: صاحب الحساب المدخول عليه إن وُجدت جلسة نشطة.
create function private.effective_uid() returns uuid
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select s.target_id from public.impersonation_sessions s
      where s.actor_id = auth.uid() and s.ended_at is null
        and s.started_at > now() - interval '8 hours'
      limit 1),
    auth.uid())
$$;

-- صاحب الحساب المدخول عليه (أو null)
create function private.on_behalf_of() returns uuid
language sql stable security definer set search_path = '' as $$
  select s.target_id from public.impersonation_sessions s
   where s.actor_id = auth.uid() and s.ended_at is null
     and s.started_at > now() - interval '8 hours'
   limit 1
$$;

create function private.is_active_user(uid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.status = 'active')
$$;

-- هل يحمل المستخدم الفعلي هذا الدور (بأي نطاق)؟
create function private.has_role(r public.app_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_user(private.effective_uid()) and exists (
    select 1 from public.user_roles ur
     where ur.user_id = private.effective_uid() and ur.role = r)
$$;

-- هل يحمل الدور في نطاق قسم/مرحلة معينين؟ (section/stage فارغة في الدور = تشمل الكل)
create function private.has_role_in(r public.app_role, s public.section, l public.stage_level)
returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_user(private.effective_uid()) and exists (
    select 1 from public.user_roles ur
     where ur.user_id = private.effective_uid() and ur.role = r
       and (ur.section is null or ur.section = s)
       and (ur.stage_level is null or ur.stage_level = l))
$$;

-- الإدارة العليا أو مدير المشاريع، في القسم المحدد (null = يتطلب صلاحية على القسمين)
create function private.is_admin_in(s public.section) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role_in('project_manager', s, null)
      or private.has_role_in('top_management', s, null)
$$;

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role('project_manager') or private.has_role('top_management')
$$;

create function private.has_grant(g public.grant_key) returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_user(private.effective_uid()) and exists (
    select 1 from public.user_grants ug
     where ug.user_id = private.effective_uid() and ug.grant_key = g)
$$;

-- مدير المشاريع بحسابه الحقيقي (لا عبر الدخول بحساب غيره) — لإدارة المستخدمين والصلاحيات
create function private.is_real_project_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.on_behalf_of() is null
     and private.is_active_user(auth.uid())
     and exists (select 1 from public.user_roles ur
                  where ur.user_id = auth.uid() and ur.role = 'project_manager')
$$;

-- رؤية مشروع (بطاقة المشروع: الإدارة، المحاسب، قائد المرحلة في نطاقه، قائد المشروع، أعضاء الفريق)
create function private.can_view_project(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
     where p.id = pid and (
          private.is_admin_in(p.section)
       or private.has_role_in('accountant', p.section, null)
       or private.has_role_in('stage_leader', p.section, p.stage_level)
       or p.leader_id = private.effective_uid()
       or exists (select 1 from public.team_members tm
                   where tm.project_id = p.id and tm.user_id = private.effective_uid())
     ))
$$;

-- تعديل مشروع: مدير المشاريع، قائد المرحلة في نطاقه، قائد المشروع
create function private.can_edit_project(pid uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.projects p
     where p.id = pid and (
          private.has_role_in('project_manager', p.section, null)
       or private.has_role_in('stage_leader', p.section, p.stage_level)
       or (p.leader_id = private.effective_uid() and private.has_role('project_leader'))
     ))
$$;

-- كتابة سطر في سجل التدقيق. لا تُستدعى إلا من داخل دوال/محفزات القاعدة أو من الخادم بمفتاح الخدمة.
create function private.write_audit(
  p_action text, p_entity text, p_entity_id text,
  p_payload jsonb default '{}'::jsonb, p_reason text default null,
  p_section public.section default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.audit_log (actor_id, on_behalf_of, action, entity, entity_id, section, payload, reason)
  values (auth.uid(), private.on_behalf_of(), p_action, p_entity, p_entity_id, p_section,
          coalesce(p_payload, '{}'::jsonb), p_reason)
$$;

grant execute on all functions in schema private to authenticated, service_role;
revoke execute on function private.write_audit(text, text, text, jsonb, text, public.section) from authenticated;
revoke execute on function private.audit_log_immutable() from authenticated;

-- =====================================================================
-- محفزات التدقيق التلقائي
-- =====================================================================
create function private.audit_user_roles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit('role.grant', 'user_roles', new.user_id::text,
      jsonb_build_object('role', new.role, 'section', new.section, 'stage_level', new.stage_level));
    return new;
  elsif tg_op = 'DELETE' then
    perform private.write_audit('role.revoke', 'user_roles', old.user_id::text,
      jsonb_build_object('role', old.role, 'section', old.section, 'stage_level', old.stage_level));
    return old;
  else
    perform private.write_audit('role.change', 'user_roles', new.user_id::text,
      jsonb_build_object('before', to_jsonb(old) - 'id', 'after', to_jsonb(new) - 'id'));
    return new;
  end if;
end $$;
create trigger user_roles_audit after insert or update or delete on public.user_roles
  for each row execute function private.audit_user_roles();

create function private.audit_user_grants() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit('grant.give', 'user_grants', new.user_id::text,
      jsonb_build_object('grant', new.grant_key));
    return new;
  else
    perform private.write_audit('grant.revoke', 'user_grants', old.user_id::text,
      jsonb_build_object('grant', old.grant_key));
    return old;
  end if;
end $$;
create trigger user_grants_audit after insert or delete on public.user_grants
  for each row execute function private.audit_user_grants();

create function private.audit_profiles() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    perform private.write_audit('user.status', 'profiles', new.id::text,
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger profiles_audit before update on public.profiles
  for each row execute function private.audit_profiles();

create function private.audit_invitations() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit('invitation.create', 'invitations', new.id::text,
      jsonb_build_object('email', new.email, 'roles', new.roles));
  elsif new.revoked_at is not null and old.revoked_at is null then
    perform private.write_audit('invitation.revoke', 'invitations', new.id::text,
      jsonb_build_object('email', new.email));
  end if;
  return new;
end $$;
create trigger invitations_audit after insert or update on public.invitations
  for each row execute function private.audit_invitations();

create function private.audit_projects() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.write_audit('project.create', 'projects', new.id::text,
      jsonb_build_object('name', new.name), null, new.section);
  elsif new.status is distinct from old.status or new.current_phase is distinct from old.current_phase
     or new.leader_id is distinct from old.leader_id or new.stage_leader_id is distinct from old.stage_leader_id then
    perform private.write_audit('project.change', 'projects', new.id::text,
      jsonb_build_object(
        'before', jsonb_build_object('status', old.status, 'phase', old.current_phase,
                                     'leader', old.leader_id, 'stage_leader', old.stage_leader_id),
        'after',  jsonb_build_object('status', new.status, 'phase', new.current_phase,
                                     'leader', new.leader_id, 'stage_leader', new.stage_leader_id)),
      null, new.section);
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger projects_audit_ins after insert on public.projects
  for each row execute function private.audit_projects();
create trigger projects_audit_upd before update on public.projects
  for each row execute function private.audit_projects();

-- لا يتغير قسم المشروع بعد إنشائه (يفصل البيانات بين البنين والبنات)
create function private.projects_section_locked() returns trigger
language plpgsql as $$
begin
  if new.section is distinct from old.section then
    raise exception 'لا يمكن نقل مشروع بين القسمين' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger projects_section_locked before update on public.projects
  for each row execute function private.projects_section_locked();

-- =====================================================================
-- دوال عامة تُستدعى من الواجهة (RPC)
-- =====================================================================

-- بدء الدخول بحساب شخص آخر
create function public.start_impersonation(p_target uuid, p_reason text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if not private.is_real_project_manager() then
    raise exception 'الدخول بحساب شخص آخر لمدير المشاريع فقط' using errcode = 'insufficient_privilege';
  end if;
  if p_reason is null or length(btrim(p_reason)) < 5 then
    raise exception 'اكتب سبب الدخول' using errcode = 'check_violation';
  end if;
  if not private.is_active_user(p_target) then
    raise exception 'الحساب غير نشط' using errcode = 'check_violation';
  end if;
  update public.impersonation_sessions set ended_at = now()
   where actor_id = auth.uid() and ended_at is null;
  insert into public.impersonation_sessions (actor_id, target_id, reason)
  values (auth.uid(), p_target, btrim(p_reason)) returning id into v_id;
  insert into public.audit_log (actor_id, on_behalf_of, action, entity, entity_id, reason)
  values (auth.uid(), p_target, 'impersonation.start', 'profiles', p_target::text, btrim(p_reason));
  return v_id;
end $$;

-- إنهاء الدخول بحساب شخص آخر
create function public.end_impersonation() returns void
language plpgsql security definer set search_path = '' as $$
declare v_target uuid;
begin
  update public.impersonation_sessions set ended_at = now()
   where actor_id = auth.uid() and ended_at is null
  returning target_id into v_target;
  if v_target is not null then
    insert into public.audit_log (actor_id, on_behalf_of, action, entity, entity_id)
    values (auth.uid(), v_target, 'impersonation.end', 'profiles', v_target::text);
  end if;
end $$;

-- سياق المستخدم الحالي للواجهة (الأدوار والصلاحيات الفعلية + حالة الدخول بحساب آخر)
create function public.my_context() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'user_id', private.effective_uid(),
    'real_user_id', auth.uid(),
    'impersonating', private.on_behalf_of() is not null,
    'impersonation_reason', (select s.reason from public.impersonation_sessions s
                              where s.actor_id = auth.uid() and s.ended_at is null
                                and s.started_at > now() - interval '8 hours' limit 1),
    'real_name', (select p.full_name from public.profiles p where p.id = auth.uid()),
    'profile', (select jsonb_build_object('full_name', p.full_name, 'email', p.email,
                                          'phone', p.phone, 'status', p.status)
                  from public.profiles p where p.id = private.effective_uid()),
    'roles', coalesce((select jsonb_agg(jsonb_build_object('role', ur.role, 'section', ur.section,
                                                           'stage_level', ur.stage_level)
                                        order by ur.role)
                         from public.user_roles ur where ur.user_id = private.effective_uid()), '[]'::jsonb),
    'grants', coalesce((select jsonb_agg(ug.grant_key order by ug.grant_key)
                          from public.user_grants ug where ug.user_id = private.effective_uid()), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------
-- دوال للخادم فقط (service_role): الدعوات ومحاولات الدخول
-- ---------------------------------------------------------------------

-- إنهاء دعوة بعد إنشاء حساب الدخول: ينشئ الملف والأدوار ويغلق الدعوة، في معاملة واحدة.
create function public.finalize_invitation(p_token_hash text, p_user_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare inv public.invitations; r jsonb;
begin
  select * into inv from public.invitations
   where token_hash = p_token_hash for update;
  if not found or inv.revoked_at is not null or inv.accepted_at is not null or inv.expires_at < now() then
    raise exception 'رابط الدعوة غير صالح أو منتهي' using errcode = 'check_violation';
  end if;

  insert into public.profiles (id, full_name, email, phone, status)
  values (p_user_id, inv.full_name, lower(inv.email), inv.phone, 'active');

  for r in select * from jsonb_array_elements(inv.roles) loop
    insert into public.user_roles (user_id, role, section, stage_level, granted_by)
    values (p_user_id, (r->>'role')::public.app_role,
            nullif(r->>'section', '')::public.section,
            nullif(r->>'stage_level', '')::public.stage_level,
            inv.invited_by);
  end loop;

  update public.invitations set accepted_at = now(), accepted_by = p_user_id where id = inv.id;
  insert into public.audit_log (actor_id, action, entity, entity_id, payload)
  values (p_user_id, 'invitation.accept', 'invitations', inv.id::text,
          jsonb_build_object('email', inv.email, 'invited_by', inv.invited_by));
  return jsonb_build_object('email', lower(inv.email), 'full_name', inv.full_name);
end $$;

-- قراءة دعوة صالحة برمزها (لعرض الاسم والدور في صفحة تعيين كلمة المرور)
create function public.invitation_by_token(p_token_hash text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('full_name', i.full_name, 'email', i.email, 'roles', i.roles,
                            'expires_at', i.expires_at)
    from public.invitations i
   where i.token_hash = p_token_hash and i.accepted_at is null and i.revoked_at is null
     and i.expires_at > now()
$$;

-- البريد المقابل لمعرّف الدخول (بريد أو جوال) — لا يُكشف للعميل
create function public.login_email_for(p_identifier text) returns text
language sql stable security definer set search_path = '' as $$
  select p.email from public.profiles p
   where lower(p.email) = lower(btrim(p_identifier)) or p.phone = btrim(p_identifier)
   limit 1
$$;

create function public.login_status(p_identifier text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'locked_until', (select la.locked_until from private.login_attempts la
                      where la.identifier = lower(btrim(p_identifier)) and la.locked_until > now()),
    'user_status', (select p.status from public.profiles p
                     where lower(p.email) = lower(btrim(p_identifier)) or p.phone = btrim(p_identifier) limit 1))
$$;

create function public.login_failed(p_identifier text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v private.login_attempts; k text := lower(btrim(p_identifier));
begin
  insert into private.login_attempts as la (identifier, failures, updated_at)
  values (k, 1, now())
  on conflict (identifier) do update
     set failures = case when la.locked_until is not null and la.locked_until <= now() then 1
                         when la.updated_at < now() - interval '15 minutes' then 1
                         else la.failures + 1 end,
         locked_until = null,
         updated_at = now()
  returning * into v;
  if v.failures >= 5 then
    update private.login_attempts set locked_until = now() + interval '15 minutes'
     where identifier = k returning * into v;
  end if;
  return jsonb_build_object('failures', v.failures, 'remaining', greatest(0, 5 - v.failures),
                            'locked_until', v.locked_until);
end $$;

create function public.login_succeeded(p_identifier text) returns void
language sql security definer set search_path = '' as $$
  delete from private.login_attempts where identifier = lower(btrim(p_identifier))
$$;

-- صلاحيات تنفيذ الدوال العامة
revoke execute on function public.finalize_invitation(text, uuid) from public, anon, authenticated;
revoke execute on function public.invitation_by_token(text) from public, anon, authenticated;
revoke execute on function public.login_email_for(text) from public, anon, authenticated;
revoke execute on function public.login_status(text) from public, anon, authenticated;
revoke execute on function public.login_failed(text) from public, anon, authenticated;
revoke execute on function public.login_succeeded(text) from public, anon, authenticated;
grant execute on function public.finalize_invitation(text, uuid) to service_role;
grant execute on function public.invitation_by_token(text) to service_role;
grant execute on function public.login_email_for(text) to service_role;
grant execute on function public.login_status(text) to service_role;
grant execute on function public.login_failed(text) to service_role;
grant execute on function public.login_succeeded(text) to service_role;

revoke execute on function public.start_impersonation(uuid, text) from public, anon;
revoke execute on function public.end_impersonation() from public, anon;
revoke execute on function public.my_context() from public, anon;
grant execute on function public.start_impersonation(uuid, text) to authenticated;
grant execute on function public.end_impersonation() to authenticated;
grant execute on function public.my_context() to authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.organization           enable row level security;
alter table public.profiles               enable row level security;
alter table public.user_roles             enable row level security;
alter table public.user_grants            enable row level security;
alter table public.invitations            enable row level security;
alter table public.impersonation_sessions enable row level security;
alter table public.audit_log              enable row level security;
alter table public.projects               enable row level security;
alter table public.team_members           enable row level security;
alter table private.login_attempts        enable row level security;

-- لا شيء للزائر غير المسجل
revoke all on all tables in schema public from anon;
revoke all on all tables in schema private from anon, authenticated;

-- بيانات المؤسسة: يقرؤها كل مستخدم نشط، ويعدّلها مدير المشاريع
create policy org_read on public.organization for select to authenticated
  using (private.is_active_user(private.effective_uid()));
create policy org_write on public.organization for update to authenticated
  using (private.has_role('project_manager')) with check (private.has_role('project_manager'));

-- الملفات الشخصية: كل مستخدم داخلي يرى الأسماء والجوالات (عدا ماي اي يرى نفسه فقط)
create policy profiles_read on public.profiles for select to authenticated
  using (
    id = private.effective_uid()
    or (private.is_active_user(private.effective_uid())
        and exists (select 1 from public.user_roles ur
                     where ur.user_id = private.effective_uid() and ur.role <> 'design_vendor'))
  );
create policy profiles_pm_update on public.profiles for update to authenticated
  using (private.is_real_project_manager()) with check (private.is_real_project_manager());
-- الإنشاء يتم عبر finalize_invitation فقط؛ لا حذف (الإيقاف بدل الحذف)

-- الأدوار: يرى المستخدم أدواره، والإدارة ترى الكل. التعديل لمدير المشاريع بحسابه الحقيقي.
create policy roles_read on public.user_roles for select to authenticated
  using (user_id = private.effective_uid() or private.is_admin());
create policy roles_insert on public.user_roles for insert to authenticated
  with check (private.is_real_project_manager());
create policy roles_update on public.user_roles for update to authenticated
  using (private.is_real_project_manager()) with check (private.is_real_project_manager());
create policy roles_delete on public.user_roles for delete to authenticated
  using (private.is_real_project_manager());

create policy grants_read on public.user_grants for select to authenticated
  using (user_id = private.effective_uid() or private.is_admin());
create policy grants_insert on public.user_grants for insert to authenticated
  with check (private.is_real_project_manager());
create policy grants_delete on public.user_grants for delete to authenticated
  using (private.is_real_project_manager());

-- الدعوات: الإدارة تقرأ، ومدير المشاريع ينشئ ويلغي
create policy invitations_read on public.invitations for select to authenticated
  using (private.is_admin());
create policy invitations_insert on public.invitations for insert to authenticated
  with check (private.is_real_project_manager() and invited_by = auth.uid());
create policy invitations_revoke on public.invitations for update to authenticated
  using (private.is_real_project_manager()) with check (private.is_real_project_manager());

-- جلسات الدخول بحساب آخر: يراها صاحبها والإدارة. الإنشاء عبر start_impersonation فقط.
create policy impersonation_read on public.impersonation_sessions for select to authenticated
  using (actor_id = auth.uid() or private.is_admin());

-- سجل التدقيق: قراءة للإدارة العليا ومدير المشاريع فقط. لا إضافة مباشرة من العميل.
create policy audit_read on public.audit_log for select to authenticated
  using (private.is_admin());

-- المشاريع
create policy projects_read on public.projects for select to authenticated
  using (private.can_view_project(id));
create policy projects_update on public.projects for update to authenticated
  using (private.can_edit_project(id)) with check (private.can_edit_project(id));
-- إنشاء المشروع يأتي من تعميد المقترح (المرحلة 2). حتى ذلك الحين: مدير المشاريع فقط.
create policy projects_insert on public.projects for insert to authenticated
  with check (private.has_role_in('project_manager', section, null));

-- فريق المشروع
create policy team_read on public.team_members for select to authenticated
  using (private.can_view_project(project_id));
create policy team_write on public.team_members for all to authenticated
  using (private.can_edit_project(project_id)) with check (private.can_edit_project(project_id));

-- صلاحيات الجداول (RLS يحدد الصفوف، وهذه تحدد العمليات الممكنة أصلاً)
grant select, update on public.organization to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.user_roles to authenticated;
grant select, insert, delete on public.user_grants to authenticated;
grant select, insert, update on public.invitations to authenticated;
grant select on public.impersonation_sessions to authenticated;
grant select on public.audit_log to authenticated;
grant select, insert, update on public.projects to authenticated;
grant select, insert, update, delete on public.team_members to authenticated;

-- سجل التدقيق: لا تعديل ولا حذف لأي دور، حتى مفتاح الخدمة (المحفز يمنع أيضاً)
revoke update, delete, truncate on public.audit_log from authenticated, service_role;
revoke insert on public.audit_log from authenticated;
