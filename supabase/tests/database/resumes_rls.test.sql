begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

select has_table('public', 'resumes', 'resumes table exists');

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at
)
values
  (
    '40000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'resume-a@example.test',
    'not-a-real-password-hash',
    now(),
    now(),
    now()
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'resume-b@example.test',
    'not-a-real-password-hash',
    now(),
    now(),
    now()
  );

insert into public.resumes (
  id,
  user_id,
  original_filename,
  storage_path,
  file_size_bytes,
  content_sha256
)
values
  (
    '41000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'synthetic-a.pdf',
    '40000000-0000-4000-8000-000000000001/41000000-0000-4000-8000-000000000001/source.pdf',
    1024,
    repeat('a', 64)
  ),
  (
    '51000000-0000-4000-8000-000000000002',
    '50000000-0000-4000-8000-000000000002',
    'synthetic-b.pdf',
    '50000000-0000-4000-8000-000000000002/51000000-0000-4000-8000-000000000002/source.pdf',
    2048,
    repeat('b', 64)
  );

insert into storage.objects (id, bucket_id, name, owner_id, metadata)
values
  (
    '42000000-0000-4000-8000-000000000001',
    'resumes',
    '40000000-0000-4000-8000-000000000001/41000000-0000-4000-8000-000000000001/source.pdf',
    '40000000-0000-4000-8000-000000000001',
    '{"mimetype":"application/pdf","size":1024}'::jsonb
  ),
  (
    '52000000-0000-4000-8000-000000000002',
    'resumes',
    '50000000-0000-4000-8000-000000000002/51000000-0000-4000-8000-000000000002/source.pdf',
    '50000000-0000-4000-8000-000000000002',
    '{"mimetype":"application/pdf","size":2048}'::jsonb
  );

set local role authenticated;
set local request.jwt.claim.sub = '40000000-0000-4000-8000-000000000001';

select results_eq(
  $$select original_filename from public.resumes order by original_filename$$,
  array['synthetic-a.pdf']::text[],
  'user A can select only their resume'
);

select lives_ok(
  $$update public.resumes set status = 'processing' where user_id = '40000000-0000-4000-8000-000000000001'$$,
  'user A can update their resume'
);

select results_eq(
  $$update public.resumes set original_filename = 'compromised.pdf' where user_id = '50000000-0000-4000-8000-000000000002' returning id::text$$,
  array[]::text[],
  'user A cannot update user B resume'
);

select results_eq(
  $$delete from public.resumes where user_id = '50000000-0000-4000-8000-000000000002' returning id::text$$,
  array[]::text[],
  'user A cannot delete user B resume'
);

select results_eq(
  $$select name from storage.objects where bucket_id = 'resumes' order by name$$,
  array['40000000-0000-4000-8000-000000000001/41000000-0000-4000-8000-000000000001/source.pdf']::text[],
  'user A can select only their resume object'
);

select results_eq(
  $$delete from storage.objects where name like '50000000-%' returning name$$,
  array[]::text[],
  'user A cannot delete user B resume object'
);

set local request.jwt.claim.sub = '50000000-0000-4000-8000-000000000002';

select results_eq(
  $$select original_filename from public.resumes order by original_filename$$,
  array['synthetic-b.pdf']::text[],
  'user B can select only their resume'
);

select results_eq(
  $$select name from storage.objects where bucket_id = 'resumes' order by name$$,
  array['50000000-0000-4000-8000-000000000002/51000000-0000-4000-8000-000000000002/source.pdf']::text[],
  'user B can select only their resume object'
);

set local role anon;
set local request.jwt.claim.sub = '';

select is(
  (select count(*) from public.resumes),
  0::bigint,
  'anonymous users cannot select resumes'
);

select is(
  (select count(*) from storage.objects where bucket_id = 'resumes'),
  0::bigint,
  'anonymous users cannot select resume objects'
);

reset role;

select is(
  (select public from storage.buckets where id = 'resumes'),
  false,
  'the resumes bucket is private'
);

select is(
  (select file_size_limit from storage.buckets where id = 'resumes'),
  5242880::bigint,
  'the resumes bucket enforces the five MiB limit'
);

select * from finish();
rollback;
