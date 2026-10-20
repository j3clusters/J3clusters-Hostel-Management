-- Safe to run again. A confirmed booking holds one bed. It still does not take payment.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  name text not null,
  sharing_type text not null check (sharing_type in ('single', 'double', 'triple', 'dormitory')),
  created_at timestamptz not null default now(),
  constraint rooms_name_not_blank check (char_length(btrim(name)) > 1)
);

create table if not exists public.beds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  label text not null,
  constraint beds_label_not_blank check (char_length(btrim(label)) > 0)
);

alter table public.booking_requests
  add column if not exists bed_id uuid references public.beds (id) on delete set null;

create unique index if not exists booking_requests_one_confirmed_bed
  on public.booking_requests (bed_id)
  where status = 'confirmed' and bed_id is not null;

alter table public.rooms enable row level security;
alter table public.beds enable row level security;

revoke all on public.rooms from anon, authenticated;
revoke all on public.beds from anon, authenticated;
grant select on public.rooms to anon, authenticated;
grant select on public.beds to anon, authenticated;

drop policy if exists "Anyone reads rooms of approved properties" on public.rooms;
drop policy if exists "Owners read their rooms" on public.rooms;
drop policy if exists "Anyone reads beds of approved properties" on public.beds;
drop policy if exists "Owners read their beds" on public.beds;

create policy "Anyone reads rooms of approved properties"
  on public.rooms
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.properties
      where id = property_id
        and status = 'approved'
    )
  );

create policy "Owners read their rooms"
  on public.rooms
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

create policy "Anyone reads beds of approved properties"
  on public.beds
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.rooms
      join public.properties on properties.id = rooms.property_id
      where rooms.id = room_id
        and properties.status = 'approved'
    )
  );

create policy "Owners read their beds"
  on public.beds
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.rooms
      join public.properties on properties.id = rooms.property_id
      where rooms.id = room_id
        and properties.owner_id = (select auth.uid())
    )
  );

create or replace function public.add_room(
  target_property uuid,
  room_name text,
  sharing text,
  bed_count integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_room uuid;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;
  if sharing not in ('single', 'double', 'triple', 'dormitory') then
    raise exception 'Invalid sharing type';
  end if;
  if bed_count < 1 or bed_count > 12 then
    raise exception 'Choose between 1 and 12 beds';
  end if;
  if char_length(btrim(room_name)) < 2 then
    raise exception 'Enter a room name';
  end if;
  if not exists (
    select 1
    from public.properties
    where id = target_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  insert into public.rooms (property_id, name, sharing_type)
  values (target_property, btrim(room_name), sharing)
  returning id into new_room;

  insert into public.beds (room_id, label)
  select new_room, 'Bed ' || bed_number
  from generate_series(1, bed_count) as bed_number;

  return new_room;
end;
$$;

create or replace function public.confirm_booking_request(request_id uuid, target_bed uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_status text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, status
  into request_property, request_status
  from public.booking_requests
  where id = request_id
  for update;

  if request_property is null or request_status is distinct from 'requested' then
    raise exception 'Booking request was not waiting';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = request_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  if not exists (
    select 1
    from public.beds
    join public.rooms on rooms.id = beds.room_id
    where beds.id = target_bed
      and rooms.property_id = request_property
  ) then
    raise exception 'Choose a bed in this property';
  end if;

  perform 1
  from public.beds
  where id = target_bed
  for update;

  if exists (
    select 1
    from public.booking_requests
    where bed_id = target_bed
      and status = 'confirmed'
  ) then
    raise exception 'This bed is already confirmed';
  end if;

  update public.booking_requests
  set status = 'confirmed',
      bed_id = target_bed,
      updated_at = now()
  where id = request_id;
end;
$$;

create or replace function public.protect_booking_request()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id or new.property_id is distinct from old.property_id then
    raise exception 'Not allowed';
  end if;

  if new.status is distinct from 'confirmed' then
    new.bed_id := null;
  end if;

  return new;
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
          and booking_requests.status = 'confirmed'
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

revoke all on function public.add_room(uuid, text, text, integer) from public, anon;
revoke all on function public.confirm_booking_request(uuid, uuid) from public, anon;
revoke all on function public.property_bed_summary(uuid) from public;
grant execute on function public.add_room(uuid, text, text, integer) to authenticated;
grant execute on function public.confirm_booking_request(uuid, uuid) to authenticated;
grant execute on function public.property_bed_summary(uuid) to anon, authenticated;

drop policy if exists "Owners review booking requests" on public.booking_requests;

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
    status in ('rejected', 'cancelled')
    and exists (
      select 1
      from public.properties
      where id = property_id
        and owner_id = (select auth.uid())
    )
  );
