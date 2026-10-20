-- Safe to run again. Booking changes are added to the in-app list.
-- The phone is not alerted. A person is not notified about their own action.

alter table public.notifications drop constraint if exists notifications_screen_check;

alter table public.notifications
  add constraint notifications_screen_check
  check (screen in ('announcements', 'leave', 'maintenance', 'booking-requests'));

create or replace function public.notify_booking_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  property_owner uuid;
  property_name text;
  bed_text text;
  recipient uuid;
  notice_title text;
  notice_body text;
begin
  select owner_id, name
  into property_owner, property_name
  from public.properties
  where id = new.property_id;

  if new.bed_id is not null then
    select case
      when rooms.name is not null and beds.label is not null then rooms.name || ', ' || beds.label
      else beds.label
    end
    into bed_text
    from public.beds
    left join public.rooms on rooms.id = beds.room_id
    where beds.id = new.bed_id;
  end if;

  if tg_op = 'INSERT' and new.status = 'requested' then
    recipient := property_owner;
    notice_title := 'Booking request';
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    if old.status = 'requested' and new.status = 'confirmed' then
      recipient := new.user_id;
      notice_title := 'Booking confirmed';
    elsif old.status = 'requested' and new.status = 'rejected' then
      recipient := new.user_id;
      notice_title := 'Booking rejected';
    elsif old.status = 'requested' and new.status = 'cancelled' then
      recipient := property_owner;
      notice_title := 'Booking cancelled';
    elsif old.status = 'confirmed' and new.status = 'cancelled' then
      recipient := new.user_id;
      notice_title := 'Booking cancelled';
    elsif old.status = 'confirmed' and new.status = 'checked_in' then
      recipient := new.user_id;
      notice_title := 'Checked in';
    elsif old.status = 'checked_in' and new.status = 'checked_out' then
      if auth.uid() = new.user_id then
        recipient := property_owner;
      else
        recipient := new.user_id;
      end if;
      notice_title := 'Checked out';
    end if;
  end if;

  if recipient is null or notice_title is null or recipient is not distinct from auth.uid() then
    return new;
  end if;

  notice_body := btrim(coalesce(property_name, 'Stay'));
  if bed_text is not null and btrim(bed_text) <> '' then
    notice_body := notice_body || ' · ' || btrim(bed_text);
  end if;
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  insert into public.notifications (user_id, title, body, screen)
  values (recipient, notice_title, notice_body, 'booking-requests');

  return new;
end;
$$;

revoke all on function public.notify_booking_change() from public, anon;
grant execute on function public.notify_booking_change() to authenticated;

drop trigger if exists booking_requests_notify on public.booking_requests;

create trigger booking_requests_notify
  after insert or update on public.booking_requests
  for each row
  execute function public.notify_booking_change();
