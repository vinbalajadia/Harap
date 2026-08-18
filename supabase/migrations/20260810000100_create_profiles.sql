create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  experience_level text,
  target_role text,
  preferred_language text,
  onboarding_completed boolean not null default false,
  interview_goal text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_display_name_check
    check (display_name is null or char_length(btrim(display_name)) between 2 and 80),
  constraint profiles_experience_level_check
    check (experience_level is null or experience_level in ('student', 'fresh_graduate', 'junior', 'career_shifter')),
  constraint profiles_target_role_check
    check (target_role is null or char_length(btrim(target_role)) between 2 and 100),
  constraint profiles_preferred_language_check
    check (preferred_language is null or preferred_language in ('javascript', 'typescript', 'python', 'java', 'csharp', 'cpp', 'go', 'rust', 'other')),
  constraint profiles_interview_goal_check
    check (interview_goal is null or char_length(btrim(interview_goal)) between 10 and 500),
  constraint profiles_completed_fields_check
    check (
      not onboarding_completed
      or (
        display_name is not null
        and experience_level is not null
        and target_role is not null
        and preferred_language is not null
        and interview_goal is not null
      )
    )
);

comment on table public.profiles is 'Harap profile and onboarding preferences owned by one Auth user.';

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant insert (
  id,
  display_name,
  experience_level,
  target_role,
  preferred_language,
  interview_goal,
  onboarding_completed
) on public.profiles to authenticated;
grant update (
  display_name,
  experience_level,
  target_role,
  preferred_language,
  interview_goal,
  onboarding_completed
) on public.profiles to authenticated;

create function public.set_profile_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_profile_updated_at();

revoke execute on function public.set_profile_updated_at() from public, anon, authenticated;

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- Backfill makes the migration safe for projects that already contain Auth users.
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
