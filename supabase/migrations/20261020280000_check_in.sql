-- Safe to run again. Check-in keeps the confirmed bed. Check-out frees it. This does not take payment.

alter table public.booking_requests drop constraint if exists booking_requests_status_check;

alter table public.booking_requests
  add constraint booking_requests_status_check
  check (status in ('requested', 'confirmed', 'checked_in', 'checked_out', 'rejected', 'cancelled'));

drop index if exists public.booking_requests_one_active;
create unique index booking_requests_one_active
  on public.booking_requests (user_id, property_id)
  where status in ('requested', 'confirmed', 'checked_in');

drop index if exists public.booking_requests_one_confirmed_bed;
create unique index booking_requests_one_confirmed_bed
  on public.booking_requests (bed_id)
  where status in ('confirmed', 'checked_in') and bed_id is not null;

create or replace function public.protect_booking_request()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id or new.property_id is distinct from old.property_id then
    raise exception 'Not allowed';
  end if;

  if new.status not in ('confirmed', 'checked_in') then
    new.bed_id := null;
  end if;

  return new;
end;
$$;

create or replace function public.check_in_booking(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_status text;
  request_bed uuid;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, status, bed_id
  into request_property, request_status, request_bed
  from public.booking_requests
  where id = request_id
  for update;

  if request_property is null or request_status is distinct from 'confirmed' or request_bed is null then
    raise exception 'Booking is not ready to check in';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = request_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  update public.booking_requests
  set status = 'checked_in',
      updated_at = now()
  where id = request_id;
end;
$$;

create or replace function public.check_out_booking(request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_user uuid;
  request_status text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, user_id, status
  into request_property, request_user, request_status
  from public.booking_requests
  where id = request_id
  for update;

  if request_property is null or request_status is distinct from 'checked_in' then
    raise exception 'Booking is not checked in';
  end if;

  if auth.uid() is distinct from request_user
    and not exists (
      select 1
      from public.properties
      where id = request_property
        and owner_id = (select auth.uid())
    ) then
    raise exception 'Not allowed';
  end if;

  update public.booking_requests
  set status = 'checked_out',
      updated_at = now()
  where id = request_id;
end;
$$;

create or replace function public.property_bed_summary(target_id uuid)
returns table (
  room_name text,
  sharing_type text,
  total_beds integer,
  available_beds integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    rooms.name,
    rooms.sharing_type,
    count(beds.id)::integer,
    count(beds.id) filter (
      where not exists (
        select 1
        from public.booking_requests
        where booking_requests.bed_id = beds.id
          and booking_requests.status in ('confirmed', 'checked_in')
      )
    )::integer
  from public.rooms
  join public.beds on beds.room_id = rooms.id
  join public.properties on properties.id = rooms.property_id
  where rooms.property_id = target_id
    and properties.status = 'approved'
  group by rooms.id, rooms.name, rooms.sharing_type
  order by rooms.name;
$$;

revoke all on function public.check_in_booking(uuid) from public, anon;
revoke all on function public.check_out_booking(uuid) from public, anon;
grant execute on function public.check_in_booking(uuid) to authenticated;
grant execute on function public.check_out_booking(uuid) to authenticated;
