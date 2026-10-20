-- Safe to run again. A signed-in person can request one active visit for an approved stay.

create table if not exists public.property_visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  status text not null default 'requested' check (
    status in ('requested', 'confirmed', 'rescheduled', 'completed', 'cancelled')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists property_visits_one_active
  on public.property_visits (user_id, property_id)
  where status in ('requested', 'confirmed', 'rescheduled');

create or replace function public.protect_visit_identity()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id or new.property_id is distinct from old.property_id then
    raise exception 'Not allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists property_visits_protect_identity on public.property_visits;
create trigger property_visits_protect_identity
  before update on public.property_visits
  for each row
  execute function public.protect_visit_identity();

alter table public.property_visits enable row level security;

revoke all on public.property_visits from anon, authenticated;
grant select, insert, update on public.property_visits to authenticated;

drop policy if exists "Users read their visit requests" on public.property_visits;
drop policy if exists "Owners read visits for their properties" on public.property_visits;
drop policy if exists "Users request a visit" on public.property_visits;
drop policy if exists "Requesters cancel a requested visit" on public.property_visits;
drop policy if exists "Owners review visits for their properties" on public.property_visits;

create policy "Users read their visit requests"
  on public.property_visits
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Owners read visits for their properties"
  on public.property_visits
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.properties
      where id = property_id
        and owner_id = (select auth.uid())
    )
  );

create policy "Users request a visit"
  on public.property_visits
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'requested'
    and exists (
      select 1
      from public.properties
      where id = property_id
        and status = 'approved'
    )
  );

create policy "Requesters cancel a requested visit"
  on public.property_visits
  for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'requested')
  with check (user_id = (select auth.uid()) and status = 'cancelled');

create policy "Owners review visits for their properties"
  on public.property_visits
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.properties
      where id = property_id
        and owner_id = (select auth.uid())
    )
  )
  with check (
    status in ('confirmed', 'completed', 'cancelled')
    and exists (
      select 1
      from public.properties
      where id = property_id
        and owner_id = (select auth.uid())
    )
  );
