-- Safe to run again. A visit request, confirmation, completion, or cancellation tells the other person.
-- Rescheduling already writes its own notice. The phone is not alerted.

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

  notice_body := btrim(coalesce(property_name, 'Stay'));
  if new.visit_on is not null then
    notice_body := notice_body || ' · ' || to_char(new.visit_on, 'FMDD Mon YYYY');
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

drop trigger if exists property_visits_notify on public.property_visits;

create trigger property_visits_notify
  after insert or update on public.property_visits
  for each row
  execute function public.notify_visit_change();
