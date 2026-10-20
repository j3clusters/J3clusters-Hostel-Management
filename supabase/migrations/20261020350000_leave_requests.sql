-- Safe to run again. A checked-in resident can request leave.
-- Only the property owner can approve or decline it. Leave does not check the resident out.

create table if not exists public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  resident_id uuid not null references public.profiles (id) on delete cascade,
  starts_on date not null,
  ends_on date not null,
  note text not null,
  status text not null default 'requested' check (status in ('requested', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  constraint leave_requests_dates check (ends_on >= starts_on and ends_on <= starts_on + 30),
  constraint leave_requests_note_length check (char_length(btrim(note)) between 10 and 200)
);

create unique index if not exists leave_requests_one_waiting
  on public.leave_requests (booking_request_id)
  where status = 'requested';

alter table public.leave_requests enable row level security;

revoke all on public.leave_requests from anon, authenticated;
grant select on public.leave_requests to authenticated;

drop policy if exists "Residents read their leave requests" on public.leave_requests;
drop policy if exists "Owners read leave requests for their properties" on public.leave_requests;

create policy "Residents read their leave requests"
  on public.leave_requests
  for select
  to authenticated
  using (resident_id = (select auth.uid()));

create policy "Owners read leave requests for their properties"
  on public.leave_requests
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

create or replace function public.request_leave(
  target_booking uuid,
  leave_start date,
  leave_end date,
  leave_note text
)
returns table (
  leave_id uuid,
  requested_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_resident uuid;
  request_status text;
  cleaned_note text;
  today date;
  new_id uuid;
  requested timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  cleaned_note := btrim(leave_note);
  if char_length(cleaned_note) < 10 or char_length(cleaned_note) > 200 then
    raise exception 'Describe the leave in 10 to 200 characters';
  end if;

  today := timezone('Asia/Kolkata', now())::date;
  if leave_start is null or leave_end is null or leave_start < today then
    raise exception 'Choose a start date from today';
  end if;
  if leave_end < leave_start or leave_end > leave_start + 30 then
    raise exception 'Leave can be at most 30 days';
  end if;

  select property_id, user_id, status
  into request_property, request_resident, request_status
  from public.booking_requests
  where id = target_booking
  for update;

  if request_property is null or request_resident is distinct from (select auth.uid()) or request_status is distinct from 'checked_in' then
    raise exception 'Check in before requesting leave';
  end if;

  if exists (
    select 1
    from public.leave_requests
    where booking_request_id = target_booking
      and status in ('requested', 'approved')
      and starts_on <= leave_end
      and ends_on >= leave_start
  ) then
    raise exception 'Those dates already have a leave request';
  end if;

  requested := now();

  insert into public.leave_requests (
    booking_request_id,
    property_id,
    resident_id,
    starts_on,
    ends_on,
    note,
    status,
    created_at
  )
  values (target_booking, request_property, request_resident, leave_start, leave_end, cleaned_note, 'requested', requested)
  returning id into new_id;

  return query
  select new_id, requested;
exception
  when unique_violation then
    raise exception 'You already have a leave request waiting';
end;
$$;

create or replace function public.review_leave(target_leave uuid, decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  leave_property uuid;
  leave_status text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if decision not in ('approved', 'declined') then
    raise exception 'Not allowed';
  end if;

  select property_id, status
  into leave_property, leave_status
  from public.leave_requests
  where id = target_leave
  for update;

  if leave_property is null or leave_status is distinct from 'requested' then
    raise exception 'This leave request is not waiting';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = leave_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  update public.leave_requests
  set status = decision,
      reviewed_at = now()
  where id = target_leave;
end;
$$;

revoke all on function public.request_leave(uuid, date, date, text) from public, anon;
revoke all on function public.review_leave(uuid, text) from public, anon;
grant execute on function public.request_leave(uuid, date, date, text) to authenticated;
grant execute on function public.review_leave(uuid, text) to authenticated;
