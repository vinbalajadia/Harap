create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  original_filename text not null,
  storage_path text not null unique,
  file_size_bytes integer not null,
  content_sha256 text not null,
  status text not null default 'uploaded',
  candidate_data jsonb,
  failure_code text,
  confirmed_at timestamptz,
  last_analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint resumes_original_filename_check
    check (char_length(btrim(original_filename)) between 1 and 255),
  constraint resumes_storage_path_check
    check (
      storage_path = user_id::text || '/' || id::text || '/source.pdf'
      and storage_path !~ '(^|/)\.\.(/|$)'
    ),
  constraint resumes_file_size_check
    check (file_size_bytes between 1 and 5242880),
  constraint resumes_content_sha256_check
    check (content_sha256 ~ '^[0-9a-f]{64}$'),
  constraint resumes_status_check
    check (status in ('uploaded', 'processing', 'review_required', 'ready', 'failed')),
  constraint resumes_candidate_data_check
    check (candidate_data is null or jsonb_typeof(candidate_data) = 'object'),
  constraint resumes_failure_code_check
    check (
      failure_code is null
      or failure_code in (
        'empty_pdf',
        'unsupported_pdf',
        'extraction_failed',
        'analysis_failed',
        'analysis_unavailable'
      )
    ),
  constraint resumes_lifecycle_check
    check (
      (status in ('uploaded', 'processing') and candidate_data is null and failure_code is null and confirmed_at is null)
      or (status = 'review_required' and candidate_data is not null and failure_code is null and confirmed_at is null)
      or (status = 'ready' and candidate_data is not null and failure_code is null and confirmed_at is not null)
      or (status = 'failed' and failure_code is not null and confirmed_at is null)
    )
);

comment on table public.resumes is 'One private resume and reviewed candidate context per Auth user.';
comment on column public.resumes.storage_path is 'Server-generated path in the private resumes Storage bucket; never returned by the API.';
comment on column public.resumes.candidate_data is 'Bounded, validated professional context. Extracted PDF text is never persisted.';

alter table public.resumes enable row level security;

create policy "resumes_select_own"
  on public.resumes
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "resumes_insert_own"
  on public.resumes
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "resumes_update_own"
  on public.resumes
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "resumes_delete_own"
  on public.resumes
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

revoke all on table public.resumes from anon, authenticated;
grant select on table public.resumes to authenticated;
grant insert (
  id,
  user_id,
  original_filename,
  storage_path,
  file_size_bytes,
  content_sha256,
  status
) on public.resumes to authenticated;
grant update (
  id,
  user_id,
  original_filename,
  storage_path,
  file_size_bytes,
  content_sha256,
  status,
  candidate_data,
  failure_code,
  confirmed_at,
  last_analyzed_at
) on public.resumes to authenticated;
grant delete on table public.resumes to authenticated;

create function public.set_resume_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger resumes_set_updated_at
  before update on public.resumes
  for each row execute procedure public.set_resume_updated_at();

revoke execute on function public.set_resume_updated_at() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "resume_files_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and owner_id = (select auth.uid())::text
  );

create policy "resume_files_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and storage.extension(name) = 'pdf'
  );

create policy "resume_files_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and owner_id = (select auth.uid())::text
  )
  with check (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and owner_id = (select auth.uid())::text
    and storage.extension(name) = 'pdf'
  );

create policy "resume_files_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'resumes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and owner_id = (select auth.uid())::text
  );
