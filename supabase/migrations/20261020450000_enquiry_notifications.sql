-- Safe to run again. A new enquiry tells the owner. Closing it tells the other person.
-- The phone is not alerted. A person is not notified about their own action.

alter table public.notifications drop constraint if exists notifications_screen_check;

alter table public.notifications
  add constraint notifications_screen_check
  check (screen in ('announcements', 'leave', 'maintenance', 'booking-requests', 'visit-list', 'enquiries'));

create or replace function public.notify_enquiry_change()
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
  select owner_id, name
  into property_owner, property_name
  from public.properties
  where id = new.property_id;

  if tg_op = 'INSERT' and new.status = 'open' then
    recipient := property_owner;
    notice_title := 'New enquiry';
  elsif tg_op = 'UPDATE' and old.status = 'open' and new.status = 'closed' then
    notice_title := 'Enquiry closed';
    if auth.uid() = new.user_id then
      recipient := property_owner;
    else
      recipient := new.user_id;
    end if;
  end if;

  if recipient is null or notice_title is null or recipient is not distinct from auth.uid() then
    return new;
  end if;

  notice_body := btrim(coalesce(property_name, 'Stay'));
  if tg_op = 'INSERT' and new.message is not null then
    notice_body := notice_body || ' · ' || btrim(new.message);
  end if;
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  insert into public.notifications (user_id, title, body, screen)
  values (recipient, notice_title, notice_body, 'enquiries');

  return new;
end;
$$;

revoke all on function public.notify_enquiry_change() from public, anon;
grant execute on function public.notify_enquiry_change() to authenticated;

drop trigger if exists enquiries_notify on public.enquiries;

create trigger enquiries_notify
  after insert or update on public.enquiries
  for each row
  execute function public.notify_enquiry_change();
