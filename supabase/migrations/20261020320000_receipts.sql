-- Safe to run again. Marking rent or a deposit received writes a receipt number.
-- The resident can read it. This does not take payment.

alter table public.rent_charges add column if not exists receipt_number text;
alter table public.deposits add column if not exists receipt_number text;

create unique index if not exists rent_charges_receipt_number
  on public.rent_charges (receipt_number)
  where receipt_number is not null;

create unique index if not exists deposits_receipt_number
  on public.deposits (receipt_number)
  where receipt_number is not null;

create sequence if not exists public.receipt_seq;
revoke all on sequence public.receipt_seq from public, anon, authenticated;

drop function if exists public.mark_rent_received(uuid);
drop function if exists public.mark_deposit_received(uuid);

create function public.mark_rent_received(target_charge uuid)
returns table (
  receipt_number text,
  received_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  charge_property uuid;
  charge_status text;
  receipt text;
  received timestamptz;
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

  received := now();
  receipt := 'R' || to_char(timezone('Asia/Kolkata', received), 'YYYYMM') || lpad(nextval('public.receipt_seq')::text, 4, '0');

  update public.rent_charges
  set status = 'received',
      received_at = received,
      receipt_number = receipt
  where id = target_charge;

  return query
  select receipt, received;
end;
$$;

create function public.mark_deposit_received(target_deposit uuid)
returns table (
  receipt_number text,
  received_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  deposit_property uuid;
  deposit_status text;
  receipt text;
  received timestamptz;
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

  received := now();
  receipt := 'R' || to_char(timezone('Asia/Kolkata', received), 'YYYYMM') || lpad(nextval('public.receipt_seq')::text, 4, '0');

  update public.deposits
  set status = 'received',
      received_at = received,
      receipt_number = receipt
  where id = target_deposit;

  return query
  select receipt, received;
end;
$$;

revoke all on function public.mark_rent_received(uuid) from public, anon;
revoke all on function public.mark_deposit_received(uuid) from public, anon;
grant execute on function public.mark_rent_received(uuid) to authenticated;
grant execute on function public.mark_deposit_received(uuid) to authenticated;
