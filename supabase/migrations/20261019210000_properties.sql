-- Safe to run again. Owners can submit a property. Only an administrator can approve it.
-- Public search can read approved properties only.

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  category text not null check (category in ('pg', 'hostel', 'hotel', 'guest_house')),
  city text not null,
  locality text not null,
  monthly_rent numeric(12, 2) not null check (monthly_rent > 0),
  currency text not null default 'INR' check (currency = 'INR'),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  constraint properties_name_not_blank check (char_length(btrim(name)) > 1),
  constraint properties_city_not_blank check (char_length(btrim(city)) > 1),
  constraint properties_locality_not_blank check (char_length(btrim(locality)) > 1)
);

alter table public.properties enable row level security;

revoke all on public.properties from anon, authenticated;
grant select on public.properties to anon, authenticated;
grant insert on public.properties to authenticated;

drop policy if exists "Anyone can read approved properties" on public.properties;
drop policy if exists "Owners read their own properties" on public.properties;
drop policy if exists "Owners submit their own property" on public.properties;

create policy "Anyone can read approved properties"
  on public.properties
  for select
  to anon, authenticated
  using (status = 'approved');

create policy "Owners read their own properties"
  on public.properties
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Owners submit their own property"
  on public.properties
  for insert
  to authenticated
  with check (
    owner_id = (select auth.uid())
    and status = 'pending'
    and exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = 'owner'
    )
  );

create or replace function public.review_property(property_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  updated_count integer;
begin
  if decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  select role
  into caller_role
  from public.user_roles
  where user_id = (select auth.uid());

  if caller_role is distinct from 'admin' then
    raise exception 'Not allowed';
  end if;

  update public.properties
  set status = decision
  where id = property_id
    and status = 'pending';

  get diagnostics updated_count = row_count;

  if updated_count <> 1 then
    raise exception 'Property was not pending';
  end if;
end;
$$;

revoke all on function public.review_property(uuid, text) from public;
revoke all on function public.review_property(uuid, text) from anon;
grant execute on function public.review_property(uuid, text) to authenticated;
