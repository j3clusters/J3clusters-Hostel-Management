-- Safe to run again. In-app notices for leave, maintenance, and property notices.
-- The phone is not alerted. A user can read only their own rows.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  body text not null,
  screen text not null check (screen in ('announcements', 'leave', 'maintenance')),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint notifications_title_length check (char_length(btrim(title)) between 1 and 80),
  constraint notifications_body_length check (char_length(btrim(body)) between 1 and 200)
);

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

drop policy if exists "Users read their notifications" on public.notifications;

create policy "Users read their notifications"
  on public.notifications
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create or replace function public.mark_notification_read(target_notification uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  update public.notifications
  set read_at = coalesce(read_at, now())
  where id = target_notification
    and user_id = (select auth.uid());

  if not found then
    raise exception 'Not allowed';
  end if;
end;
$$;

revoke all on function public.mark_notification_read(uuid) from public, anon;
grant execute on function public.mark_notification_read(uuid) to authenticated;

create or replace function public.post_announcement(target_property uuid, announcement_message text)
returns table (
  announcement_id uuid,
  posted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  new_id uuid;
  posted timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  cleaned := btrim(announcement_message);
  if char_length(cleaned) < 10 or char_length(cleaned) > 200 then
    raise exception 'Write a notice of 10 to 200 characters';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = target_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  posted := now();

  insert into public.announcements (property_id, owner_id, message, created_at)
  values (target_property, (select auth.uid()), cleaned, posted)
  returning id into new_id;

  insert into public.notifications (user_id, title, body, screen)
  select distinct booking_requests.user_id, 'New notice', cleaned, 'announcements'
  from public.booking_requests
  where booking_requests.property_id = target_property
    and booking_requests.status in ('confirmed', 'checked_in')
    and booking_requests.user_id is distinct from (select auth.uid());

  return query
  select new_id, posted;
end;
$$;

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
  property_owner uuid;
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

  select owner_id into property_owner from public.properties where id = request_property;
  if property_owner is not null then
    insert into public.notifications (user_id, title, body, screen)
    values (property_owner, 'Leave request', cleaned_note, 'leave');
  end if;

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
  leave_resident uuid;
  leave_note text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if decision not in ('approved', 'declined') then
    raise exception 'Not allowed';
  end if;

  select property_id, status, resident_id, note
  into leave_property, leave_status, leave_resident, leave_note
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

  insert into public.notifications (user_id, title, body, screen)
  values (
    leave_resident,
    case when decision = 'approved' then 'Leave approved' else 'Leave declined' end,
    leave_note,
    'leave'
  );
end;
$$;

create or replace function public.report_maintenance(
  target_booking uuid,
  issue_category text,
  issue_note text
)
returns table (
  request_id uuid,
  reported_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_resident uuid;
  request_status text;
  property_owner uuid;
  cleaned_note text;
  new_id uuid;
  reported timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if issue_category not in ('plumbing', 'electrical', 'furniture', 'cleaning', 'other') then
    raise exception 'Choose a problem type';
  end if;

  cleaned_note := btrim(issue_note);
  if char_length(cleaned_note) < 10 or char_length(cleaned_note) > 200 then
    raise exception 'Describe the problem in 10 to 200 characters';
  end if;

  select property_id, user_id, status
  into request_property, request_resident, request_status
  from public.booking_requests
  where id = target_booking
  for update;

  if request_property is null or request_resident is distinct from (select auth.uid()) or request_status is distinct from 'checked_in' then
    raise exception 'Check in before reporting a problem';
  end if;

  reported := now();

  insert into public.maintenance_requests (booking_request_id, property_id, resident_id, category, note, status, created_at)
  values (target_booking, request_property, request_resident, issue_category, cleaned_note, 'open', reported)
  returning id into new_id;

  select owner_id into property_owner from public.properties where id = request_property;
  if property_owner is not null then
    insert into public.notifications (user_id, title, body, screen)
    values (property_owner, 'Maintenance report', cleaned_note, 'maintenance');
  end if;

  return query
  select new_id, reported;
end;
$$;

create or replace function public.complete_maintenance(target_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_status text;
  request_resident uuid;
  request_note text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, status, resident_id, note
  into request_property, request_status, request_resident, request_note
  from public.maintenance_requests
  where id = target_request
  for update;

  if request_property is null or request_status is distinct from 'open' then
    raise exception 'This report is not open';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = request_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  update public.maintenance_requests
  set status = 'done',
      completed_at = now()
  where id = target_request;

  insert into public.notifications (user_id, title, body, screen)
  values (request_resident, 'Maintenance done', request_note, 'maintenance');
end;
$$;
