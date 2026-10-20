-- Safe to run again. Only the property owner can mark a due rent charge received.
-- The resident cannot mark their own rent paid. This is not a payment.

alter table public.rent_charges drop constraint if exists rent_charges_status_check;

alter table public.rent_charges
  add constraint rent_charges_status_check
  check (status in ('due', 'received'));

alter table public.rent_charges
  add column if not exists received_at timestamptz;

create or replace function public.mark_rent_received(target_charge uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  charge_property uuid;
  charge_status text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, status
  into charge_property, charge_status
  from public.rent_charges
  where id = target_charge
  for update;

  if charge_property is null or charge_status is distinct from 'due' then
    raise exception 'This rent is not due';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = charge_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  update public.rent_charges
  set status = 'received',
      received_at = now()
  where id = target_charge;
end;
$$;

revoke all on function public.mark_rent_received(uuid) from public, anon;
grant execute on function public.mark_rent_received(uuid) to authenticated;
