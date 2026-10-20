-- Safe to run again. Recording rent writes an invoice number and tells the resident.
-- Marking it received still writes a receipt. This does not take payment.

alter table public.rent_charges add column if not exists invoice_number text;

create unique index if not exists rent_charges_invoice_number
  on public.rent_charges (invoice_number)
  where invoice_number is not null;

drop function if exists public.record_rent_charge(uuid);

create function public.record_rent_charge(request_id uuid)
returns table (
  charge_id uuid,
  charge_amount numeric,
  charge_month date,
  invoice_number text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_resident uuid;
  request_status text;
  property_name text;
  month_start date;
  rent_amount numeric;
  new_id uuid;
  invoice text;
  notice_body text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select booking_requests.property_id, booking_requests.user_id, booking_requests.status, properties.name
  into request_property, request_resident, request_status, property_name
  from public.booking_requests
  join public.properties on properties.id = booking_requests.property_id
  where booking_requests.id = request_id
  for update of booking_requests;

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
  invoice := 'I' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMM') || lpad(nextval('public.receipt_seq')::text, 4, '0');

  insert into public.rent_charges (booking_request_id, property_id, resident_id, amount, period_month, status, invoice_number)
  values (request_id, request_property, request_resident, rent_amount, month_start, 'due', invoice)
  returning id into new_id;

  if request_resident is distinct from auth.uid() then
    notice_body := btrim(coalesce(property_name, 'Stay') || ' · ' || invoice);
    if char_length(notice_body) > 200 then
      notice_body := left(notice_body, 200);
    end if;
    insert into public.notifications (user_id, title, body, screen)
    values (request_resident, 'Rent due', notice_body, 'booking-requests');
  end if;

  return query
  select new_id, rent_amount, month_start, invoice;
exception
  when unique_violation then
    raise exception 'Rent for this month is already recorded';
end;
$$;

create or replace function public.mark_rent_received(target_charge uuid)
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
  charge_resident uuid;
  charge_status text;
  property_name text;
  receipt text;
  received timestamptz;
  notice_body text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, resident_id, status
  into charge_property, charge_resident, charge_status
  from public.rent_charges
  where id = target_charge
  for update;

  if charge_property is null or charge_status is distinct from 'due' then
    raise exception 'This rent is not due';
  end if;

  select name
  into property_name
  from public.properties
  where id = charge_property
    and owner_id = (select auth.uid());

  if property_name is null then
    raise exception 'Not allowed';
  end if;

  received := now();
  receipt := 'R' || to_char(timezone('Asia/Kolkata', received), 'YYYYMM') || lpad(nextval('public.receipt_seq')::text, 4, '0');

  update public.rent_charges
  set status = 'received',
      received_at = received,
      receipt_number = receipt
  where id = target_charge;

  if charge_resident is distinct from auth.uid() then
    notice_body := btrim(coalesce(property_name, 'Stay') || ' · ' || receipt);
    if char_length(notice_body) > 200 then
      notice_body := left(notice_body, 200);
    end if;
    insert into public.notifications (user_id, title, body, screen)
    values (charge_resident, 'Rent received', notice_body, 'booking-requests');
  end if;

  return query
  select receipt, received;
end;
$$;

revoke all on function public.record_rent_charge(uuid) from public, anon;
grant execute on function public.record_rent_charge(uuid) to authenticated;
