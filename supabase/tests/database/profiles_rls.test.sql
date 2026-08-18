begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_table('public', 'profiles', 'profiles table exists');
select col_is_pk('public', 'profiles', 'id', 'profiles.id is the primary key');

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
    '10000000-0000-4000-8000-000000000001',
    'authenticated',
    'authenticated',
    'profile-a@example.test',
    'not-a-real-password-hash',
    now(),
    now(),
    now()
  ),
  (
    '20000000-0000-4000-8000-000000000002',
    'authenticated',
    'authenticated',
    'profile-b@example.test',
    'not-a-real-password-hash',
    now(),
    now(),
    now()
  );

select is(
  (select count(*) from public.profiles where id in (
    '10000000-0000-4000-8000-000000000001',
    '20000000-0000-4000-8000-000000000002'
  )),
  2::bigint,
  'the Auth trigger creates one profile per user'
);

set local role authenticated;
set local request.jwt.claim.sub = '10000000-0000-4000-8000-000000000001';

select results_eq(
  $$select id::text from public.profiles order by id$$,
  array['10000000-0000-4000-8000-000000000001']::text[],
  'user A can select only their profile'
);

select lives_ok(
  $$update public.profiles set display_name = 'User A' where id = '10000000-0000-4000-8000-000000000001'$$,
  'user A can update their profile'
);

select results_eq(
  $$select display_name from public.profiles where id = '10000000-0000-4000-8000-000000000001'$$,
  array['User A']::text[],
  'the owned update is visible'
);

select results_eq(
  $$update public.profiles set display_name = 'Compromised' where id = '20000000-0000-4000-8000-000000000002' returning id::text$$,
  array[]::text[],
  'user A cannot update user B profile'
);

set local request.jwt.claim.sub = '20000000-0000-4000-8000-000000000002';

select results_eq(
  $$select id::text from public.profiles order by id$$,
  array['20000000-0000-4000-8000-000000000002']::text[],
  'user B can select only their profile'
);

select results_eq(
  $$update public.profiles set display_name = 'Compromised' where id = '10000000-0000-4000-8000-000000000001' returning id::text$$,
  array[]::text[],
  'user B cannot update user A profile'
);

select * from finish();
rollback;
