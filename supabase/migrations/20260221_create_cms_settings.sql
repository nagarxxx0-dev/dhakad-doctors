-- CMS settings table for admin-editable frontend sections.
-- Safe to run multiple times.

create table if not exists public.cms_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

alter table if exists public.cms_settings
  add column if not exists value jsonb not null default '{}'::jsonb;

alter table if exists public.cms_settings
  add column if not exists updated_at timestamptz not null default now();

alter table if exists public.cms_settings
  add column if not exists updated_by uuid references public.profiles(id) on delete set null;

create index if not exists cms_settings_updated_at_idx on public.cms_settings (updated_at desc);

create or replace function public.set_cms_settings_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_cms_settings_set_updated_at on public.cms_settings;
create trigger trg_cms_settings_set_updated_at
before update on public.cms_settings
for each row execute function public.set_cms_settings_updated_at_timestamp();

alter table public.cms_settings enable row level security;

grant select on public.cms_settings to anon, authenticated;
grant insert, update, delete on public.cms_settings to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cms_settings'
      and policyname = 'cms_settings_public_read'
  ) then
    create policy cms_settings_public_read
    on public.cms_settings
    for select
    to anon, authenticated
    using (true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cms_settings'
      and policyname = 'cms_settings_admin_insert'
  ) then
    create policy cms_settings_admin_insert
    on public.cms_settings
    for insert
    to authenticated
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cms_settings'
      and policyname = 'cms_settings_admin_update'
  ) then
    create policy cms_settings_admin_update
    on public.cms_settings
    for update
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    )
    with check (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cms_settings'
      and policyname = 'cms_settings_admin_delete'
  ) then
    create policy cms_settings_admin_delete
    on public.cms_settings
    for delete
    to authenticated
    using (
      exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );
  end if;
end;
$$;

insert into public.cms_settings (key, value)
values (
  'home_hero',
  '{
    "hero_badge": "Medical Community Platform",
    "hero_title": "Welcome to Dhakad Doctors Community",
    "hero_description": "A trusted digital network for doctors, students, and verified members with structured approvals, searchable directory, and committee leadership access.",
    "hero_background_image_url": "",
    "primary_cta_label": "Join Community",
    "primary_cta_href": "/signup",
    "secondary_cta_label": "Find Doctors",
    "secondary_cta_href": "/directory",
    "committee_cta_label": "View Committee",
    "committee_cta_href": "/committee",
    "feature_point_1": "Verification-based access",
    "feature_point_2": "Fast medical directory",
    "national_panel_badge": "National Committee",
    "national_panel_title": "Leadership Profiles",
    "national_panel_description": "National level committee members shown in rank order.",
    "national_panel_image_url": "",
    "national_panel_empty": "No national committee members added yet.",
    "national_panel_cta_label": "View Full Committee",
    "national_panel_cta_href": "/committee",
    "show_directory_section": true,
    "show_national_committee_section": true,
    "show_features_section": true,
    "show_stories_section": true,
    "directory_section_order": 1,
    "national_committee_section_order": 2,
    "features_section_order": 3,
    "stories_section_order": 4
  }'::jsonb
)
on conflict (key) do nothing;
