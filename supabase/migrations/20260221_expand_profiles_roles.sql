-- Expand profiles for role-based access, doctor/student data, and contact visibility.
-- Safe to run multiple times.

alter table if exists public.profiles
  add column if not exists age integer;

alter table if exists public.profiles
  add column if not exists gender text;

alter table if exists public.profiles
  add column if not exists phone text;

alter table if exists public.profiles
  add column if not exists role text default 'public';

alter table if exists public.profiles
  add column if not exists status text default 'pending';

alter table if exists public.profiles
  add column if not exists approval_status text default 'pending';

alter table if exists public.profiles
  add column if not exists qualification text;

alter table if exists public.profiles
  add column if not exists specialization text;

alter table if exists public.profiles
  add column if not exists experience text;

alter table if exists public.profiles
  add column if not exists clinic_name text;

alter table if exists public.profiles
  add column if not exists course text;

alter table if exists public.profiles
  add column if not exists college text;

alter table if exists public.profiles
  add column if not exists academic_year text;

alter table if exists public.profiles
  add column if not exists gotra text;

alter table if exists public.profiles
  add column if not exists state text;

alter table if exists public.profiles
  add column if not exists district text;

alter table if exists public.profiles
  add column if not exists city text;

alter table if exists public.profiles
  add column if not exists show_phone boolean not null default false;

alter table if exists public.profiles
  add column if not exists verified boolean not null default false;

update public.profiles
set role = 'public'
where role is null
  or lower(role) not in ('guest', 'public', 'doctor', 'student', 'admin');

update public.profiles
set status = 'pending'
where status is null
  or lower(status) not in ('pending', 'approved', 'verified', 'rejected');

update public.profiles
set approval_status = 'pending'
where approval_status is null
  or lower(approval_status) not in ('pending', 'approved', 'verified', 'rejected');

update public.profiles
set verified = (
  coalesce(lower(approval_status), lower(status), 'pending') in ('approved', 'verified')
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (lower(role) in ('guest', 'public', 'doctor', 'student', 'admin'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_status_check
      check (lower(status) in ('pending', 'approved', 'verified', 'rejected'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_approval_status_check'
  ) then
    alter table public.profiles
      add constraint profiles_approval_status_check
      check (lower(approval_status) in ('pending', 'approved', 'verified', 'rejected'));
  end if;
end;
$$;

create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status, approval_status);
create index if not exists profiles_verified_idx on public.profiles (verified);
create index if not exists profiles_location_idx on public.profiles (state, district, city);
