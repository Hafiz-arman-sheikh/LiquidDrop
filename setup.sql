-- Run in the Supabase SQL Editor as the project administrator.
-- This script owns only public.files and policies prefixed liquiddrop_.
-- Use a new project or audit other existing permissive policies first.

begin;

create table if not exists public.files (
  id uuid primary key,

  owner_id uuid not null
    references auth.users(id) on delete cascade,

  original_name text not null
    check (char_length(original_name) between 1 and 1024),

  object_path text not null unique,

  mime_type text not null default 'application/octet-stream'
    check (char_length(mime_type) between 1 and 255),

  size_bytes bigint not null
    check (size_bytes between 0 and 20971520),

  created_at timestamptz not null default now(),

  constraint files_owned_path check (
    split_part(object_path, '/', 1) = owner_id::text
    and split_part(object_path, '/', 2) = id::text
    and object_path ~
      '^[0-9a-f-]+/[0-9a-f-]+/[a-zA-Z0-9_][a-zA-Z0-9._-]*$'
  )
);

create index if not exists files_owner_created_idx
  on public.files (owner_id, created_at desc);

create index if not exists files_owner_name_idx
  on public.files (owner_id, original_name);

create index if not exists files_owner_id_idx
  on public.files (owner_id, id);

alter table public.files enable row level security;

revoke all on public.files from anon, authenticated;
grant select, insert, delete on public.files to authenticated;

-- Metadata is immutable in this version, so UPDATE is not granted.

drop policy if exists liquiddrop_files_select on public.files;

create policy liquiddrop_files_select
on public.files
for select
to authenticated
using (
  owner_id = (select auth.uid())
);

drop policy if exists liquiddrop_files_insert on public.files;

create policy liquiddrop_files_insert
on public.files
for insert
to authenticated
with check (
  owner_id = (select auth.uid())
  and exists (
    select 1
    from storage.objects
    where bucket_id = 'liquiddrop-files'
      and name = object_path
  )
);

drop policy if exists liquiddrop_files_delete on public.files;

create policy liquiddrop_files_delete
on public.files
for delete
to authenticated
using (
  owner_id = (select auth.uid())
);

-- Bucket configuration is supported.
-- Do not ALTER Supabase-managed table structures.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'liquiddrop-files',
  'liquiddrop-files',
  false,
  20971520,
  null
)
on conflict (id) do update set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = null;

drop policy if exists liquiddrop_objects_select on storage.objects;

create policy liquiddrop_objects_select
on storage.objects
for select
to authenticated
using (
  bucket_id = 'liquiddrop-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists liquiddrop_objects_insert on storage.objects;

create policy liquiddrop_objects_insert
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'liquiddrop-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists liquiddrop_objects_delete on storage.objects;

create policy liquiddrop_objects_delete
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'liquiddrop-files'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- No object UPDATE policy:
-- uploads use upsert:false and unique paths.

commit;