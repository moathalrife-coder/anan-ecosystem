-- =====================================================================
-- منظومة عنان — المرحلة 1 (الإعدادات)
-- إدارة المستخدمين (أدوار، صلاحيات إضافية، إيقاف)، أنواع المشاريع،
-- القوالب (متطلبات المراحل وغيرها) قابلة للتعديل، وبيانات المؤسسة.
-- كل تعديل هنا يُسجَّل في سجل التدقيق.
-- =====================================================================

-- ---------------------------------------------------------------------
-- صلاحية تعديل القوالب: مدير المشاريع أو من مُنح «تعديل القوالب»
-- ---------------------------------------------------------------------
create function private.can_edit_templates() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.has_role('project_manager') or private.has_grant('edit_templates')
$$;

-- مستخدم داخلي نشط (كل الأدوار عدا ماي اي)
create function private.is_internal() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.is_active_user(private.effective_uid()) and exists (
    select 1 from public.user_roles ur
     where ur.user_id = private.effective_uid() and ur.role <> 'design_vendor')
$$;

grant execute on function private.can_edit_templates() to authenticated, service_role;
grant execute on function private.is_internal() to authenticated, service_role;

-- ---------------------------------------------------------------------
-- محفز تدقيق عام لجداول الإعدادات (يسجل القيم قبل وبعد)
-- ---------------------------------------------------------------------
create function private.audit_settings_row() returns trigger
language plpgsql security definer set search_path = '' as $$
declare v_id text; v_payload jsonb;
begin
  if tg_op = 'DELETE' then
    v_id := (to_jsonb(old) ->> 'id');
    v_payload := jsonb_build_object('before', to_jsonb(old));
  elsif tg_op = 'INSERT' then
    v_id := (to_jsonb(new) ->> 'id');
    v_payload := jsonb_build_object('after', to_jsonb(new));
  else
    if to_jsonb(new) - 'updated_at' = to_jsonb(old) - 'updated_at' then
      return new;
    end if;
    v_id := (to_jsonb(new) ->> 'id');
    v_payload := jsonb_build_object('before', to_jsonb(old), 'after', to_jsonb(new));
  end if;
  perform private.write_audit('settings.' || lower(tg_op), tg_table_name, v_id, v_payload);
  return coalesce(new, old);
end $$;

create function private.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- تعديل بيانات المؤسسة يُسجَّل
create trigger organization_touch before update on public.organization
  for each row execute function private.touch_updated_at();
create trigger organization_audit after update on public.organization
  for each row execute function private.audit_settings_row();

-- ---------------------------------------------------------------------
-- أنواع المشاريع (§6.6) — قابلة للتعديل
-- ---------------------------------------------------------------------
create table public.project_types (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null unique check (length(btrim(name)) > 1),
  icon               text not null default 'projects',
  auto_budget_lines  text[] not null default '{}',
  options            text[] not null default '{}',
  default_duration   text,
  sort               int not null default 0,
  active             boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger project_types_touch before update on public.project_types
  for each row execute function private.touch_updated_at();
create trigger project_types_audit after insert or update or delete on public.project_types
  for each row execute function private.audit_settings_row();

alter table public.projects add column type_id uuid references public.project_types (id);

insert into public.project_types (name, icon, auto_budget_lines, options, default_duration, sort) values
  ('برنامج متعدد اللقاءات', 'calendar', '{}', '{"تكليفات أسبوعية بين اللقاءات"}', 'عدة أسابيع', 1),
  ('رحلة', 'flight', '{"السكن","التنقل","الزيارات","التأمين","تذاكر الطيران"}',
     '{"الوجهة في الملف التسويقي","يتطلب موافقة ولي الأمر على السفر"}', 'عدة أيام', 2),
  ('مخيم', 'home', '{"استئجار المكان","التنقل","التأمين"}',
     '{"برنامج يومي بدل لقاءات","يتطلب موافقة ولي الأمر على السفر"}', 'عدة أيام', 3),
  ('فعالية يوم واحد', 'star', '{"استئجار المكان"}', '{}', 'يوم واحد', 4);

-- ---------------------------------------------------------------------
-- قوالب متطلبات المراحل (§6.1) — قابلة للتعديل من الإعدادات
-- «تلقائي» يرتبط بحدث في المنظومة (auto_event)، و«يدوي» يحتاج تأكيداً بإرفاق.
-- القاعدة: تعديل القالب يسري على المشاريع الجديدة. كل مشروع يأخذ نسخته من
-- المتطلبات عند إنشائه (المرحلة 2)، فلا يتغير مشروع قائم دون قرار صريح.
-- ---------------------------------------------------------------------
create table public.phase_requirement_templates (
  id           uuid primary key default gen_random_uuid(),
  phase        smallint not null check (phase between 1 and 6),
  title        text not null check (length(btrim(title)) > 2),
  description  text,
  mode         text not null check (mode in ('auto', 'manual')),
  auto_event   text,
  owner_label  text not null,
  sort         int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check ((mode = 'auto') = (auto_event is not null))
);
create index phase_req_tpl_phase_idx on public.phase_requirement_templates (phase, sort);
create trigger phase_req_tpl_touch before update on public.phase_requirement_templates
  for each row execute function private.touch_updated_at();
create trigger phase_req_tpl_audit after insert or update or delete on public.phase_requirement_templates
  for each row execute function private.audit_settings_row();

insert into public.phase_requirement_templates (phase, sort, title, mode, auto_event, owner_label, description) values
  (1, 1, 'بطاقة المشروع معتمدة', 'auto', 'proposal.approved', 'سلسلة الاعتماد', 'تكتمل حين يعتمد مدير المشاريع المقترح.'),
  (1, 2, 'الميزانية التقديرية معتمدة', 'auto', 'proposal.budget_approved', 'سلسلة الاعتماد', 'جزء من اعتماد المقترح.'),
  (2, 1, 'جدول اللقاءات وبرنامج اللقاء مُرسل للفريق', 'auto', 'schedule.sent', 'قائد المشروع', 'أول ما يُنجز في التخطيط. يضعه قائد المشروع ويرسله، واللجان تخطط عليه.'),
  (2, 2, 'الفريق معتمد', 'auto', 'team.approved', 'قائد المرحلة', 'يكتمل حين يعتمد قائد المرحلة قائمة الفريق.'),
  (2, 3, 'خطط اللجان مكتملة', 'auto', 'committee_plans.complete', 'مسؤولو اللجان', 'كل لجنة مفعّلة رفعت خطتها واعتمدها قائد المشروع.'),
  (2, 4, 'الميزانية التفصيلية', 'auto', 'budget.detailed', 'قائد المشروع', 'مجموع بنود اللجان ضمن المعتمد.'),
  (3, 1, 'الملف التسويقي مكتمل', 'auto', 'marketing.complete', 'قائد المشروع', 'كل العناصر المطلوبة في الملف التسويقي مكتملة.'),
  (3, 2, 'التسجيل مفتوح في المتجر', 'auto', 'store.open', 'قائد المشروع', 'المنتج منشور ومرتبط بالمشروع.'),
  (3, 3, 'الإعلان منشور', 'manual', null, 'اللجنة الإعلامية', 'يرفع المسؤول صورة الإعلان المنشور.'),
  (3, 4, 'المسجلون المؤكدون 80% من المستهدف', 'auto', 'registrations.target_80', 'قائد المشروع', 'يُحسب من المدفوعين والمنح.'),
  (4, 1, 'مواقع اللقاءات مفحوصة', 'auto', 'sites.checked', 'اللجنة اللوجستية', 'كل موقع له فحص مطابق.'),
  (4, 2, 'احتياجات اللقاء الأول محجوزة', 'auto', 'needs.first_meeting_reserved', 'اللجنة اللوجستية', 'كل طلبات الاحتياج للقاء الأول محجوزة أو مشتراة.'),
  (4, 3, 'المجموعات موزعة ولكل مجموعة مشرف', 'auto', 'groups.assigned', 'قائد المشروع', 'لا مشارك بلا مجموعة، ولا مجموعة بلا مشرف.'),
  (4, 4, 'خطة اللجنة اللوجستية معتمدة', 'auto', 'logistics_plan.approved', 'مسؤول اللجنة اللوجستية', 'الخطة مرفوعة ومعتمدة.'),
  (4, 5, 'اجتماع التحضير منعقد', 'manual', null, 'قائد المشروع', 'يُرفق محضر الاجتماع أو يُغلق في صفحة الاجتماعات.'),
  (5, 1, 'كل اللقاءات منفذة', 'auto', 'meetings.all_done', 'قائد المشروع', 'حضور مسجل لكل لقاء.'),
  (5, 2, 'محاضر ما بعد اللقاءات مغلقة', 'auto', 'minutes.all_closed', 'قائد المشروع', 'لا محضر ناقص.'),
  (6, 1, 'العهد مسوّاة', 'auto', 'custody.settled', 'المحاسب', 'لا عهدة مفتوحة.'),
  (6, 2, 'التقييم الختامي مكتمل', 'auto', 'evaluation.complete', 'قائد المشروع', 'تقييم المشاركين والفريق مغلق.'),
  (6, 3, 'التقرير الختامي معتمد', 'manual', null, 'قائد المرحلة', 'يعتمد قائد المرحلة التقرير.');

-- ---------------------------------------------------------------------
-- قوالب أخرى بقوائم بسيطة: فحص المواقع، توصيات الإعلامية، أنواع الفقرات، تصنيفات المعرفة
-- ---------------------------------------------------------------------
create table public.template_items (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null check (kind in ('site_check', 'media_recommendation', 'segment_type', 'knowledge_category')),
  group_label  text,           -- نوع الموقع لفحص المواقع، أو نوع المادة للإعلامية
  title        text not null check (length(btrim(title)) > 1),
  color        text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  sort         int not null default 0,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index template_items_kind_idx on public.template_items (kind, group_label, sort);
create trigger template_items_touch before update on public.template_items
  for each row execute function private.touch_updated_at();
create trigger template_items_audit after insert or update or delete on public.template_items
  for each row execute function private.audit_settings_row();

insert into public.template_items (kind, group_label, title, color, sort) values
  ('segment_type', null, 'استقبال', '#3560ac', 1),
  ('segment_type', null, 'ضيافة', '#ec7f1a', 2),
  ('segment_type', null, 'دورة', '#1baf7a', 3),
  ('segment_type', null, 'صلاة', '#0d7a63', 4),
  ('segment_type', null, 'وجبة', '#e87ba4', 5),
  ('segment_type', null, 'فعالية', '#8a5cd6', 6),
  ('segment_type', null, 'رياضة', '#2a9fd6', 7),
  ('segment_type', null, 'استراحة', '#7d8699', 8),
  ('segment_type', null, 'زيارة', '#c2862b', 9),
  ('segment_type', null, 'ختام', '#1b2d52', 10),
  ('site_check', 'مدرسة', 'دورات المياه نظيفة وكافية', null, 1),
  ('site_check', 'مدرسة', 'مخارج الطوارئ واضحة', null, 2),
  ('site_check', 'مدرسة', 'طفايات الحريق صالحة', null, 3),
  ('site_check', 'استراحة', 'دورات المياه نظيفة وكافية', null, 1),
  ('site_check', 'استراحة', 'مخارج الطوارئ واضحة', null, 2),
  ('site_check', 'استراحة', 'المسبح مسوّر أو مغلق', null, 3),
  ('site_check', 'فندق', 'غرف المشرفين قريبة من غرف المشاركين', null, 1),
  ('site_check', 'فندق', 'مخارج الطوارئ واضحة', null, 2),
  ('site_check', 'قاعة', 'التكييف والصوت يعملان', null, 1),
  ('site_check', 'قاعة', 'مخارج الطوارئ واضحة', null, 2),
  ('site_check', 'موقع زيارة', 'مكان تجمع واضح للمجموعات', null, 1),
  ('site_check', 'موقع زيارة', 'مرشد أو مسؤول من الجهة متوفر', null, 2),
  ('media_recommendation', 'تصوير اللقاء', 'افتتاحية اللقاء', null, 1),
  ('media_recommendation', 'تصوير اللقاء', 'صورة جماعية لكل مجموعة', null, 2),
  ('media_recommendation', 'مقطع', 'ملخص اللقاء في 60 ثانية', null, 3),
  ('knowledge_category', null, 'التخطيط', null, 1),
  ('knowledge_category', null, 'اللجان', null, 2),
  ('knowledge_category', null, 'المالية', null, 3),
  ('knowledge_category', null, 'التواصل مع الأهالي', null, 4),
  ('knowledge_category', null, 'التشغيل الميداني', null, 5);

-- ---------------------------------------------------------------------
-- RLS للإعدادات
-- ---------------------------------------------------------------------
alter table public.project_types enable row level security;
alter table public.phase_requirement_templates enable row level security;
alter table public.template_items enable row level security;

create policy project_types_read on public.project_types for select to authenticated using (private.is_internal());
create policy project_types_write on public.project_types for all to authenticated
  using (private.can_edit_templates()) with check (private.can_edit_templates());

create policy phase_req_tpl_read on public.phase_requirement_templates for select to authenticated using (private.is_internal());
create policy phase_req_tpl_write on public.phase_requirement_templates for all to authenticated
  using (private.can_edit_templates()) with check (private.can_edit_templates());

create policy template_items_read on public.template_items for select to authenticated using (private.is_internal());
create policy template_items_write on public.template_items for all to authenticated
  using (private.can_edit_templates()) with check (private.can_edit_templates());

revoke all on public.project_types, public.phase_requirement_templates, public.template_items from anon;
grant select, insert, update, delete on public.project_types, public.phase_requirement_templates, public.template_items to authenticated;

-- ---------------------------------------------------------------------
-- إدارة المستخدمين (RPC) — مدير المشاريع بحسابه الحقيقي فقط
-- ---------------------------------------------------------------------

-- قائمة المستخدمين للإدارة، مع آخر دخول والأدوار والصلاحيات
create function public.admin_users() returns table (
  id uuid, full_name text, email text, phone text, status public.user_status,
  last_sign_in_at timestamptz, roles jsonb, grants jsonb, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.full_name, p.email, p.phone, p.status, u.last_sign_in_at,
         coalesce((select jsonb_agg(jsonb_build_object('role', ur.role, 'section', ur.section, 'stage_level', ur.stage_level)
                                    order by ur.role)
                     from public.user_roles ur where ur.user_id = p.id), '[]'::jsonb),
         coalesce((select jsonb_agg(ug.grant_key order by ug.grant_key)
                     from public.user_grants ug where ug.user_id = p.id), '[]'::jsonb),
         p.created_at
    from public.profiles p
    left join auth.users u on u.id = p.id
   where private.is_admin()
   order by p.full_name
$$;

-- استبدال أدوار شخص بمجموعة جديدة (الفرق فقط يُكتب، فيُسجَّل في التدقيق منحاً وسحباً)
create function public.set_user_roles(p_user uuid, p_roles jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare r jsonb;
begin
  if not private.is_real_project_manager() then
    raise exception 'إدارة الأدوار لمدير المشاريع فقط' using errcode = 'insufficient_privilege';
  end if;
  if jsonb_typeof(p_roles) <> 'array' or jsonb_array_length(p_roles) = 0 then
    raise exception 'اختر دوراً واحداً على الأقل' using errcode = 'check_violation';
  end if;
  if p_user = auth.uid() and not exists (
       select 1 from jsonb_array_elements(p_roles) x where x->>'role' = 'project_manager') then
    raise exception 'لا يمكنك سحب دور مدير المشاريع من نفسك' using errcode = 'check_violation';
  end if;

  delete from public.user_roles ur
   where ur.user_id = p_user
     and not exists (
       select 1 from jsonb_array_elements(p_roles) x
        where (x->>'role')::public.app_role = ur.role
          and nullif(x->>'section', '')::public.section is not distinct from ur.section
          and nullif(x->>'stage_level', '')::public.stage_level is not distinct from ur.stage_level);

  insert into public.user_roles (user_id, role, section, stage_level, granted_by)
  select distinct p_user, (x->>'role')::public.app_role,
         nullif(x->>'section', '')::public.section,
         nullif(x->>'stage_level', '')::public.stage_level, auth.uid()
    from jsonb_array_elements(p_roles) x
  on conflict on constraint user_roles_unique do nothing;
end $$;

create function public.set_user_grants(p_user uuid, p_grants public.grant_key[]) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_real_project_manager() then
    raise exception 'منح الصلاحيات لمدير المشاريع فقط' using errcode = 'insufficient_privilege';
  end if;
  delete from public.user_grants where user_id = p_user and not (grant_key = any (coalesce(p_grants, '{}')));
  insert into public.user_grants (user_id, grant_key, granted_by)
  select p_user, g, auth.uid() from unnest(coalesce(p_grants, '{}')) g
  on conflict (user_id, grant_key) do nothing;
end $$;

create function public.set_user_status(p_user uuid, p_status public.user_status) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_real_project_manager() then
    raise exception 'إيقاف الحسابات لمدير المشاريع فقط' using errcode = 'insufficient_privilege';
  end if;
  if p_user = auth.uid() then
    raise exception 'لا يمكنك إيقاف حسابك' using errcode = 'check_violation';
  end if;
  if p_status not in ('active', 'suspended') then
    raise exception 'حالة غير صالحة' using errcode = 'check_violation';
  end if;
  update public.profiles set status = p_status where id = p_user;
  -- إنهاء أي دخول بحساب هذا الشخص عند إيقافه
  if p_status = 'suspended' then
    update public.impersonation_sessions set ended_at = now() where target_id = p_user and ended_at is null;
  end if;
end $$;

create function public.update_user_contact(p_user uuid, p_full_name text, p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_real_project_manager() then
    raise exception 'تعديل بيانات المستخدمين لمدير المشاريع فقط' using errcode = 'insufficient_privilege';
  end if;
  update public.profiles
     set full_name = btrim(p_full_name), phone = nullif(btrim(p_phone), '')
   where id = p_user;
  perform private.write_audit('user.contact', 'profiles', p_user::text,
    jsonb_build_object('full_name', btrim(p_full_name), 'phone', nullif(btrim(p_phone), '')));
end $$;

-- الدعوات المعلّقة (بدون بصمة الرمز)
create function public.pending_invitations() returns table (
  id uuid, email text, phone text, full_name text, roles jsonb, expires_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select i.id, i.email, i.phone, i.full_name, i.roles, i.expires_at, i.created_at
    from public.invitations i
   where private.is_admin() and i.accepted_at is null and i.revoked_at is null
   order by i.created_at desc
$$;

-- الدعوات: عمود token_hash لا يُقرأ من العميل
revoke select on public.invitations from authenticated;
grant select (id, email, phone, full_name, roles, invited_by, expires_at, accepted_at, accepted_by, revoked_at, created_at)
  on public.invitations to authenticated;

-- لا دعوة لبريد مسجل أو لدعوة نشطة بنفس البريد
create function private.invitation_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.email := lower(btrim(new.email));
  if exists (select 1 from public.profiles p where p.email = new.email) then
    raise exception 'يوجد حساب بهذا البريد' using errcode = 'unique_violation';
  end if;
  if new.phone is not null and exists (select 1 from public.profiles p where p.phone = new.phone) then
    raise exception 'يوجد حساب بهذا الجوال' using errcode = 'unique_violation';
  end if;
  update public.invitations set revoked_at = now()
   where lower(email) = new.email and accepted_at is null and revoked_at is null;
  return new;
end $$;
create trigger invitations_guard before insert on public.invitations
  for each row execute function private.invitation_guard();

-- صلاحيات تنفيذ الدوال الجديدة
revoke execute on function public.admin_users() from public, anon;
revoke execute on function public.set_user_roles(uuid, jsonb) from public, anon;
revoke execute on function public.set_user_grants(uuid, public.grant_key[]) from public, anon;
revoke execute on function public.set_user_status(uuid, public.user_status) from public, anon;
revoke execute on function public.update_user_contact(uuid, text, text) from public, anon;
revoke execute on function public.pending_invitations() from public, anon;
grant execute on function public.admin_users() to authenticated;
grant execute on function public.set_user_roles(uuid, jsonb) to authenticated;
grant execute on function public.set_user_grants(uuid, public.grant_key[]) to authenticated;
grant execute on function public.set_user_status(uuid, public.user_status) to authenticated;
grant execute on function public.update_user_contact(uuid, text, text) to authenticated;
grant execute on function public.pending_invitations() to authenticated;
