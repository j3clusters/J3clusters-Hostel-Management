-- Safe to run again. A person can ask to become an owner. They cannot approve themselves.

create table if not exists public.owner_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  full_name text not null,
  phone text not null,
  business_name text not null,
  city text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint owner_verifications_full_name_not_blank check (char_length(btrim(full_name)) > 0),
  constraint owner_verifications_phone_not_blank check (char_length(btrim(phone)) >= 10),
  constraint owner_verifications_business_name_not_blank check (char_length(btrim(business_name)) > 0),
  constraint owner_verifications_city_not_blank check (char_length(btrim(city)) > 0)
);

alter table public.owner_verifications enable row level security;

revoke all on public.owner_verifications from anon, authenticated;
grant select, insert on public.owner_verifications to authenticated;

drop policy if exists "Users read their own owner request" on public.owner_verifications;
drop policy if exists "Users submit their own pending owner request" on public.owner_verifications;

create policy "Users read their own owner request"
  on public.owner_verifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users submit their own pending owner request"
  on public.owner_verifications
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'pending'
  );
