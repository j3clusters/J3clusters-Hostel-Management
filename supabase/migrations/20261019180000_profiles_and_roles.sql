-- Run this once in the Supabase SQL Editor.
-- It creates each person's profile and locks their role so the app cannot change it.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now()
);

create table public.user_roles (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  role text not null check (role in ('resident', 'owner', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.user_roles from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;

create policy "Users read their own profile"
  on public.profiles
  for select
  to authenticated
  using (id = (select auth.uid()));

create policy "Users update their own profile"
  on public.profiles
  for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Users read their own role"
  on public.user_roles
  for select
  to authenticated
  using (user_id = (select auth.uid()));

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

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

insert into public.profiles (id)
select id
from auth.users
on conflict (id) do nothing;

insert into public.user_roles (user_id, role)
select id, 'resident'
from auth.users
on conflict (user_id) do nothing;
