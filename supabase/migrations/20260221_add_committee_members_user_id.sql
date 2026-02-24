-- Add optional doctor/profile linkage for committee members.
-- Safe to run multiple times.

alter table if exists public.committee_members
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

create index if not exists committee_members_user_id_idx
  on public.committee_members (user_id);
