-- Safe to run again. A new visit request includes morning, afternoon, or evening.
-- The time stays when the date changes. The phone is not alerted.

alter table public.property_visits
  add column if not exists visit_part text;

alter table public.property_visits drop constraint if exists property_visits_part_check;

alter table public.property_visits
  add constraint property_visits_part_check
  check (visit_part is null or visit_part in ('morning', 'afternoon', 'evening'));

create or replace function public.guard_visit_date()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  today date := (timezone('Asia/Kolkata', now()))::date;
begin
  if tg_op = 'INSERT' then
    if new.visit_on is null or new.visit_on < today or new.visit_on > today + 30 then
      raise exception 'Choose a visit date from today through the next 30 days';
    end if;
    if new.visit_part is null or new.visit_part not in ('morning', 'afternoon', 'evening') then
      raise exception 'Choose morning, afternoon, or evening';
    end if;
  else
    if new.visit_part is distinct from old.visit_part then
      raise exception 'Not allowed';
    end if;
    if new.visit_on is distinct from old.visit_on then
      if new.status is distinct from 'rescheduled'
        or new.visit_on is null
        or new.visit_on < today
        or new.visit_on > today + 30
      then
        raise exception 'Choose a visit date from today through the next 30 days';
      end if;
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_visit_date() from public, anon;
grant execute on function public.guard_visit_date() to authenticated;

create or replace function public.notify_visit_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  property_owner uuid;
  property_name text;
  recipient uuid;
  notice_title text;
  notice_body text;
  part_label text;
begin
  if tg_op = 'UPDATE' and new.status = 'rescheduled' then
    return new;
  end if;

  select owner_id, name
  into property_owner, property_name
  from public.properties
  where id = new.property_id;

  if tg_op = 'INSERT' and new.status = 'requested' then
    recipient := property_owner;
    notice_title := 'Visit request';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    if new.status = 'confirmed' then
      recipient := new.user_id;
      notice_title := 'Visit confirmed';
    elsif new.status = 'completed' then
      recipient := new.user_id;
      notice_title := 'Visit completed';
    elsif new.status = 'cancelled' then
      notice_title := 'Visit cancelled';
      if auth.uid() = new.user_id then
        recipient := property_owner;
      else
        recipient := new.user_id;
      end if;
    end if;
  end if;

  if recipient is null or notice_title is null or recipient is not distinct from auth.uid() then
    return new;
  end if;

  part_label := case new.visit_part
    when 'morning' then 'Morning'
    when 'afternoon' then 'Afternoon'
    when 'evening' then 'Evening'
    else ''
  end;

  notice_body := btrim(coalesce(property_name, 'Stay'));
  if new.visit_on is not null then
    notice_body := notice_body || ' · ' || to_char(new.visit_on, 'FMDD Mon YYYY');
  end if;
  if part_label <> '' then
    notice_body := notice_body || ' · ' || part_label;
  end if;
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  insert into public.notifications (user_id, title, body, screen)
  values (recipient, notice_title, notice_body, 'visit-list');

  return new;
end;
$$;

revoke all on function public.notify_visit_change() from public, anon;
grant execute on function public.notify_visit_change() to authenticated;

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
  saved_part text;
  property_owner uuid;
  property_name text;
  saved_date date;
  recipient uuid;
  notice_body text;
  part_label text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if next_date is null or next_date < timezone('Asia/Kolkata', now())::date or next_date > timezone('Asia/Kolkata', now())::date + 30 then
    raise exception 'Choose a date from today through the next 30 days';
  end if;

  select user_id, property_id, status, property_visits.visit_part
  into visit_user, visit_property, visit_status, saved_part
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
    part_label := case saved_part
      when 'morning' then 'Morning'
      when 'afternoon' then 'Afternoon'
      when 'evening' then 'Evening'
      else ''
    end;
    notice_body := btrim(coalesce(property_name, 'Stay') || ' · ' || to_char(saved_date, 'FMDD Mon YYYY'));
    if part_label <> '' then
      notice_body := notice_body || ' · ' || part_label;
    end if;
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
