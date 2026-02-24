-- Stories (expiring updates) schema + storage policies.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  title text not null,
  content text not null,
  image_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stories
  add column if not exists user_id uuid references public.profiles(id) on delete set null;

alter table public.stories
  add column if not exists image_url text;

alter table public.stories
  add column if not exists expires_at timestamptz;

alter table public.stories
  add column if not exists updated_at timestamptz not null default now();

create index if not exists stories_created_at_idx on public.stories (created_at desc);
create index if not exists stories_expires_at_idx on public.stories (expires_at);
create index if not exists stories_user_id_idx on public.stories (user_id);

create or replace function public.set_story_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_stories_set_updated_at on public.stories;
create trigger trg_stories_set_updated_at
before update on public.stories
for each row execute function public.set_story_updated_at_timestamp();

alter table public.stories enable row level security;

grant select on public.stories to anon, authenticated;
grant insert, update, delete on public.stories to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stories'
      and policyname = 'stories_public_read_active'
  ) then
    create policy stories_public_read_active
    on public.stories
    for select
    to anon, authenticated
    using (expires_at is null or expires_at > now());
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stories'
      and policyname = 'stories_admin_read_all'
  ) then
    create policy stories_admin_read_all
    on public.stories
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
      and tablename = 'stories'
      and policyname = 'stories_admin_insert'
  ) then
    create policy stories_admin_insert
    on public.stories
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
      and tablename = 'stories'
      and policyname = 'stories_admin_update'
  ) then
    create policy stories_admin_update
    on public.stories
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
      and tablename = 'stories'
      and policyname = 'stories_admin_delete'
  ) then
    create policy stories_admin_delete
    on public.stories
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'stories',
  'stories',
  true,
  5242880,
  array['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'stories_storage_public_read'
  ) then
    create policy stories_storage_public_read
    on storage.objects
    for select
    to anon, authenticated
    using (bucket_id = 'stories');
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'stories_storage_admin_insert'
  ) then
    create policy stories_storage_admin_insert
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id = 'stories'
      and exists (
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
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'stories_storage_admin_update'
  ) then
    create policy stories_storage_admin_update
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id = 'stories'
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    )
    with check (
      bucket_id = 'stories'
      and exists (
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
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'stories_storage_admin_delete'
  ) then
    create policy stories_storage_admin_delete
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id = 'stories'
      and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    );
  end if;
end;
$$;
