-- Safe to run again. A booking request is not a payment and does not reserve a room.

create table if not exists public.booking_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'rejected', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists booking_requests_one_active
  on public.booking_requests (user_id, property_id)
  where status in ('requested', 'confirmed');

create or replace function public.protect_booking_request()
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

drop trigger if exists booking_requests_protect on public.booking_requests;
create trigger booking_requests_protect
  before update on public.booking_requests
  for each row
  execute function public.protect_booking_request();

alter table public.booking_requests enable row level security;

revoke all on public.booking_requests from anon, authenticated;
grant select, insert, update on public.booking_requests to authenticated;

drop policy if exists "Users read their booking requests" on public.booking_requests;
drop policy if exists "Owners read booking requests for their properties" on public.booking_requests;
drop policy if exists "Users request a booking" on public.booking_requests;
drop policy if exists "Requesters cancel a booking request" on public.booking_requests;
drop policy if exists "Owners review booking requests" on public.booking_requests;

create policy "Users read their booking requests"
  on public.booking_requests
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Owners read booking requests for their properties"
  on public.booking_requests
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

create policy "Users request a booking"
  on public.booking_requests
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

create policy "Requesters cancel a booking request"
  on public.booking_requests
  for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'requested')
  with check (user_id = (select auth.uid()) and status = 'cancelled');

create policy "Owners review booking requests"
  on public.booking_requests
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
    status in ('confirmed', 'rejected', 'cancelled')
    and exists (
      select 1
      from public.properties
      where id = property_id
        and owner_id = (select auth.uid())
    )
  );
