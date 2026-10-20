-- Safe to run again. A visit can be moved to a new date.
-- It stays a visit. This does not take payment or confirm a bed.

alter table public.property_visits
  add column if not exists visit_on date;

alter table public.notifications drop constraint if exists notifications_screen_check;

alter table public.notifications
  add constraint notifications_screen_check
  check (screen in ('announcements', 'leave', 'maintenance', 'booking-requests', 'visit-list'));

drop policy if exists "Requesters cancel a requested visit" on public.property_visits;

create policy "Requesters cancel a requested visit"
  on public.property_visits
  for update
  to authenticated
  using (user_id = (select auth.uid()) and status in ('requested', 'rescheduled'))
  with check (user_id = (select auth.uid()) and status = 'cancelled');

create or replace function public.reschedule_visit(target_visit uuid, next_date date)
returns table (
  visit_on date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  visit_user uuid;
  visit_property uuid;
  visit_status text;
  property_owner uuid;
  property_name text;
  saved_date date;
  recipient uuid;
  notice_body text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if next_date is null or next_date < timezone('Asia/Kolkata', now())::date or next_date > timezone('Asia/Kolkata', now())::date + 30 then
    raise exception 'Choose a date from today through the next 30 days';
  end if;

  select user_id, property_id, status
  into visit_user, visit_property, visit_status
  from public.property_visits
  where id = target_visit
  for update;

  if visit_property is null or visit_status not in ('requested', 'confirmed', 'rescheduled') then
    raise exception 'This visit cannot be rescheduled';
  end if;

  select owner_id, name
  into property_owner, property_name
  from public.properties
  where id = visit_property;

  if auth.uid() is distinct from visit_user and auth.uid() is distinct from property_owner then
    raise exception 'Not allowed';
  end if;

  saved_date := next_date;

  update public.property_visits
  set status = 'rescheduled',
      visit_on = saved_date,
      updated_at = now()
  where id = target_visit;

  if auth.uid() = visit_user then
    recipient := property_owner;
  else
    recipient := visit_user;
  end if;

  if recipient is not null and recipient is distinct from auth.uid() then
    notice_body := btrim(coalesce(property_name, 'Stay') || ' · ' || to_char(saved_date, 'FMDD Mon YYYY'));
    if char_length(notice_body) > 200 then
      notice_body := left(notice_body, 200);
    end if;
    insert into public.notifications (user_id, title, body, screen)
    values (recipient, 'Visit rescheduled', notice_body, 'visit-list');
  end if;

  return query
  select saved_date;
end;
$$;

revoke all on function public.reschedule_visit(uuid, date) from public, anon;
grant execute on function public.reschedule_visit(uuid, date) to authenticated;
