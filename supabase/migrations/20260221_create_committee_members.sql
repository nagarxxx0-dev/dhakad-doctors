-- 3-tier committee management schema for Dhakad Doctors
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.committee_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  full_name text not null,
  designation text,
  tier text not null check (tier in ('national', 'state', 'district')),
  state text,
  district text,
  rank integer not null check (rank > 0),
  avatar_url text,
  status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
  approval_status text not null default 'approved' check (approval_status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.committee_members
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'committee_members_tier_location_chk'
  ) then
    alter table public.committee_members
      add constraint committee_members_tier_location_chk
      check (
        (tier = 'national' and state is null and district is null) or
        (tier = 'state' and state is not null and district is null) or
        (tier = 'district' and state is not null and district is not null)
      );
  end if;
end;
$$;

create index if not exists committee_members_tier_rank_idx on public.committee_members (tier, rank);
create index if not exists committee_members_user_id_idx on public.committee_members (user_id);
create index if not exists committee_members_state_rank_idx on public.committee_members (state, rank);
create index if not exists committee_members_district_rank_idx on public.committee_members (district, rank);
create index if not exists committee_members_status_idx on public.committee_members (status, approval_status);

create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_committee_members_set_updated_at on public.committee_members;
create trigger trg_committee_members_set_updated_at
before update on public.committee_members
for each row execute function public.set_updated_at_timestamp();

alter table public.committee_members enable row level security;

grant select on public.committee_members to anon, authenticated;
grant insert, update, delete on public.committee_members to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'committee_members'
      and policyname = 'committee_public_read_approved'
  ) then
    create policy committee_public_read_approved
    on public.committee_members
    for select
    to anon, authenticated
    using (status = 'approved' or approval_status = 'approved');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'committee_members'
      and policyname = 'committee_admin_read_all'
  ) then
    create policy committee_admin_read_all
    on public.committee_members
    for select
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

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'committee_members'
      and policyname = 'committee_admin_insert'
  ) then
    create policy committee_admin_insert
    on public.committee_members
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
      and tablename = 'committee_members'
      and policyname = 'committee_admin_update'
  ) then
    create policy committee_admin_update
    on public.committee_members
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
      and tablename = 'committee_members'
      and policyname = 'committee_admin_delete'
  ) then
    create policy committee_admin_delete
    on public.committee_members
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
