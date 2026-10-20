-- Safe to run again. A new booking request includes morning, afternoon, or evening.
-- The time cannot be changed later. The phone is not alerted.

alter table public.booking_requests
  add column if not exists move_in_part text;

alter table public.booking_requests drop constraint if exists booking_requests_move_in_part_check;

alter table public.booking_requests
  add constraint booking_requests_move_in_part_check
  check (move_in_part is null or move_in_part in ('morning', 'afternoon', 'evening'));

create or replace function public.guard_booking_move_in()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  today date := (timezone('Asia/Kolkata', now()))::date;
begin
  if tg_op = 'INSERT' then
    if new.move_in is null or new.move_in < today or new.move_in > today + 30 then
      raise exception 'Choose a move-in date from today through the next 30 days';
    end if;
    if new.move_in_part is null or new.move_in_part not in ('morning', 'afternoon', 'evening') then
      raise exception 'Choose morning, afternoon, or evening';
    end if;
  else
    if new.move_in is distinct from old.move_in or new.move_in_part is distinct from old.move_in_part then
      raise exception 'Not allowed';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_booking_move_in() from public, anon;
grant execute on function public.guard_booking_move_in() to authenticated;

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
  part_label text;
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

  part_label := case new.move_in_part
    when 'morning' then 'Morning'
    when 'afternoon' then 'Afternoon'
    when 'evening' then 'Evening'
    else ''
  end;

  notice_body := btrim(coalesce(property_name, 'Stay'));
  if bed_text is not null and btrim(bed_text) <> '' then
    notice_body := notice_body || ' · ' || btrim(bed_text);
  end if;
  if new.move_in is not null then
    notice_body := notice_body || ' · ' || to_char(new.move_in, 'FMDD Mon YYYY');
  end if;
  if part_label <> '' then
    notice_body := notice_body || ' · ' || part_label;
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
