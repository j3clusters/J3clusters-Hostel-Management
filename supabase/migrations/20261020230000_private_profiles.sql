-- Safe to run again. Profile details stay private to the signed-in person.
-- A new account is always a resident. Owner access still requires administrator approval.

create table if not exists public.resident_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  full_name text,
  country_code text,
  phone text,
  city text,
  address text,
  occupation_status text,
  organization_name text,
  job_title text,
  updated_at timestamptz not null default now(),
  constraint resident_profiles_occupation check (
    occupation_status is null
    or occupation_status in ('employed', 'self_employed', 'student', 'other')
  ),
  constraint resident_profiles_phone check (phone is null or char_length(regexp_replace(phone, '\D', '', 'g')) >= 10)
);

create table if not exists public.owner_profiles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  full_name text,
  country_code text,
  phone text,
  city text,
  address text,
  employment_status text,
  company_name text,
  job_title text,
  business_display_name text,
  properties_managed integer,
  business_address text,
  updated_at timestamptz not null default now(),
  constraint owner_profiles_employment check (
    employment_status is null
    or employment_status in ('employed', 'self_employed', 'business_owner', 'unemployed', 'other')
  ),
  constraint owner_profiles_phone check (phone is null or char_length(regexp_replace(phone, '\D', '', 'g')) >= 10),
  constraint owner_profiles_properties check (properties_managed is null or properties_managed >= 0)
);

alter table public.resident_profiles enable row level security;
alter table public.owner_profiles enable row level security;

revoke all on public.resident_profiles from anon, authenticated;
revoke all on public.owner_profiles from anon, authenticated;
grant select, insert, update on public.resident_profiles to authenticated;
grant select, insert, update on public.owner_profiles to authenticated;

drop policy if exists "Users read their resident profile" on public.resident_profiles;
drop policy if exists "Users insert their resident profile" on public.resident_profiles;
drop policy if exists "Users update their resident profile" on public.resident_profiles;
drop policy if exists "Users read their owner profile" on public.owner_profiles;
drop policy if exists "Users insert their owner profile" on public.owner_profiles;
drop policy if exists "Users update their owner profile" on public.owner_profiles;

create policy "Users read their resident profile"
  on public.resident_profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert their resident profile"
  on public.resident_profiles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their resident profile"
  on public.resident_profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Users read their owner profile"
  on public.owner_profiles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users insert their owner profile"
  on public.owner_profiles
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users update their owner profile"
  on public.owner_profiles
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id);

  insert into public.user_roles (user_id, role)
  values (new.id, 'resident');

  return new;
end;
$$;

revoke all on function public.open_owner_account() from public;
revoke all on function public.open_owner_account() from anon;
revoke all on function public.open_owner_account() from authenticated;
