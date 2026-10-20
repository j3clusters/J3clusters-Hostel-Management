-- Safe to run again. An owner can record this month's rent for a checked-in stay.
-- The charge stays due. This does not take payment.

create table if not exists public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  resident_id uuid not null references public.profiles (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  period_month date not null,
  status text not null default 'due' check (status = 'due'),
  created_at timestamptz not null default now(),
  constraint rent_charges_one_month unique (booking_request_id, period_month),
  constraint rent_charges_month_start check (extract(day from period_month) = 1)
);

alter table public.rent_charges enable row level security;

revoke all on public.rent_charges from anon, authenticated;
grant select on public.rent_charges to authenticated;

drop policy if exists "Residents read their rent charges" on public.rent_charges;
drop policy if exists "Owners read rent charges for their properties" on public.rent_charges;

create policy "Residents read their rent charges"
  on public.rent_charges
  for select
  to authenticated
  using (resident_id = (select auth.uid()));

create policy "Owners read rent charges for their properties"
  on public.rent_charges
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

create or replace function public.record_rent_charge(request_id uuid)
returns table (
  charge_id uuid,
  charge_amount numeric,
  charge_month date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_resident uuid;
  request_status text;
  month_start date;
  rent_amount numeric;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, user_id, status
  into request_property, request_resident, request_status
  from public.booking_requests
  where id = request_id
  for update;

  if request_property is null or request_status is distinct from 'checked_in' then
    raise exception 'Check in before recording rent';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = request_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  select monthly_rent
  into rent_amount
  from public.properties
  where id = request_property;

  if rent_amount is null or rent_amount <= 0 then
    raise exception 'This stay has no monthly rent';
  end if;

  month_start := date_trunc('month', timezone('Asia/Kolkata', now()))::date;

  insert into public.rent_charges (booking_request_id, property_id, resident_id, amount, period_month, status)
  values (request_id, request_property, request_resident, rent_amount, month_start, 'due')
  returning id into new_id;

  return query
  select new_id, rent_amount, month_start;
exception
  when unique_violation then
    raise exception 'Rent for this month is already recorded';
end;
$$;

revoke all on function public.record_rent_charge(uuid) from public, anon;
grant execute on function public.record_rent_charge(uuid) to authenticated;
