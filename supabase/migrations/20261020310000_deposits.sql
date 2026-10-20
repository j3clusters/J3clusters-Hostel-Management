-- Safe to run again. An owner can record one deposit for a checked-in stay.
-- Only that owner can mark it received. This does not take payment.

create table if not exists public.deposits (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null unique references public.booking_requests (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  resident_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0 and amount <= 1000000),
  status text not null default 'due' check (status in ('due', 'received')),
  received_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.deposits enable row level security;

revoke all on public.deposits from anon, authenticated;
grant select on public.deposits to authenticated;

drop policy if exists "Residents read their deposits" on public.deposits;
drop policy if exists "Owners read deposits for their properties" on public.deposits;

create policy "Residents read their deposits"
  on public.deposits
  for select
  to authenticated
  using (resident_id = (select auth.uid()));

create policy "Owners read deposits for their properties"
  on public.deposits
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

create or replace function public.record_deposit(request_id uuid, deposit_amount numeric)
returns table (
  deposit_id uuid,
  saved_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_resident uuid;
  request_status text;
  new_id uuid;
  saved numeric;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if deposit_amount is null or deposit_amount <= 0 or deposit_amount > 1000000 then
    raise exception 'Enter a deposit from 1 to 1000000';
  end if;

  select property_id, user_id, status
  into request_property, request_resident, request_status
  from public.booking_requests
  where id = request_id
  for update;

  if request_property is null or request_status is distinct from 'checked_in' then
    raise exception 'Check in before recording a deposit';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = request_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  saved := round(deposit_amount, 2);

  insert into public.deposits (booking_request_id, property_id, resident_id, amount, status)
  values (request_id, request_property, request_resident, saved, 'due')
  returning id into new_id;

  return query
  select new_id, saved;
exception
  when unique_violation then
    raise exception 'A deposit is already recorded for this stay';
end;
$$;

create or replace function public.mark_deposit_received(target_deposit uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  deposit_property uuid;
  deposit_status text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, status
  into deposit_property, deposit_status
  from public.deposits
  where id = target_deposit
  for update;

  if deposit_property is null or deposit_status is distinct from 'due' then
    raise exception 'This deposit is not due';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = deposit_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  update public.deposits
  set status = 'received',
      received_at = now()
  where id = target_deposit;
end;
$$;

revoke all on function public.record_deposit(uuid, numeric) from public, anon;
revoke all on function public.mark_deposit_received(uuid) from public, anon;
grant execute on function public.record_deposit(uuid, numeric) to authenticated;
grant execute on function public.mark_deposit_received(uuid) to authenticated;
