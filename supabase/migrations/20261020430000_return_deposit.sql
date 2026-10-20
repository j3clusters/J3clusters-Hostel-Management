-- Safe to run again. The owner can return a received deposit after check-out.
-- The resident is notified in the app. This does not take payment.

alter table public.deposits drop constraint if exists deposits_status_check;

alter table public.deposits
  add constraint deposits_status_check
  check (status in ('due', 'received', 'returned'));

alter table public.deposits
  add column if not exists returned_at timestamptz;

create or replace function public.return_deposit(target_deposit uuid)
returns table (
  returned_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  deposit_property uuid;
  deposit_resident uuid;
  deposit_booking uuid;
  deposit_status text;
  booking_status text;
  property_name text;
  returned timestamptz;
  notice_body text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, resident_id, booking_request_id, status
  into deposit_property, deposit_resident, deposit_booking, deposit_status
  from public.deposits
  where id = target_deposit
  for update;

  if deposit_property is null or deposit_status is distinct from 'received' then
    raise exception 'This deposit has not been received';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = deposit_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  select status, name
  into booking_status, property_name
  from public.booking_requests
  join public.properties on properties.id = booking_requests.property_id
  where booking_requests.id = deposit_booking;

  if booking_status is distinct from 'checked_out' then
    raise exception 'Check out before returning the deposit';
  end if;

  returned := now();

  update public.deposits
  set status = 'returned',
      returned_at = returned
  where id = target_deposit;

  notice_body := btrim(coalesce(property_name, 'Stay'));
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  if deposit_resident is distinct from auth.uid() then
    insert into public.notifications (user_id, title, body, screen)
    values (deposit_resident, 'Deposit returned', notice_body, 'booking-requests');
  end if;

  return query
  select returned;
end;
$$;

revoke all on function public.return_deposit(uuid) from public, anon;
grant execute on function public.return_deposit(uuid) to authenticated;
