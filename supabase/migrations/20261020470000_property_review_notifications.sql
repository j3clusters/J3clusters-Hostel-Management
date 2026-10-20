-- Safe to run again. A new property tells each administrator. A decision tells the owner.
-- The phone is not alerted. A person is not notified about their own action.

alter table public.notifications drop constraint if exists notifications_screen_check;

alter table public.notifications
  add constraint notifications_screen_check
  check (screen in (
    'announcements',
    'leave',
    'maintenance',
    'booking-requests',
    'visit-list',
    'enquiries',
    'admin-properties',
    'my-properties'
  ));

create or replace function public.notify_property_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  notice_title text;
  notice_body text;
  notice_screen text;
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    notice_title := 'Property to review';
    notice_screen := 'admin-properties';
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'approved' then
    notice_title := 'Property approved';
    notice_screen := 'my-properties';
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'rejected' then
    notice_title := 'Property rejected';
    notice_screen := 'my-properties';
  else
    return new;
  end if;

  notice_body := btrim(new.name) || ' · ' || btrim(new.city);
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  if notice_screen = 'admin-properties' then
    insert into public.notifications (user_id, title, body, screen)
    select user_roles.user_id, notice_title, notice_body, notice_screen
    from public.user_roles
    join public.profiles on profiles.id = user_roles.user_id
    where user_roles.role = 'admin'
      and user_roles.user_id is distinct from auth.uid();
  elsif new.owner_id is distinct from auth.uid() then
    insert into public.notifications (user_id, title, body, screen)
    select profiles.id, notice_title, notice_body, notice_screen
    from public.profiles
    where profiles.id = new.owner_id;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_property_review() from public, anon;
grant execute on function public.notify_property_review() to authenticated;

drop trigger if exists properties_notify_review on public.properties;

create trigger properties_notify_review
  after insert or update on public.properties
  for each row
  execute function public.notify_property_review();
