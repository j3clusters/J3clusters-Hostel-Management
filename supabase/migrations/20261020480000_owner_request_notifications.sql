-- Safe to run again. A new owner request tells each administrator. A decision tells the applicant.
-- The phone number stays off the notice. The phone is not alerted.

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
    'my-properties',
    'admin-owners',
    'owner-profile'
  ));

create or replace function public.notify_owner_request()
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
    notice_title := 'Owner request';
    notice_screen := 'admin-owners';
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'approved' then
    notice_title := 'Owner account approved';
    notice_screen := 'owner-profile';
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'rejected' then
    notice_title := 'Owner account rejected';
    notice_screen := 'owner-profile';
  else
    return new;
  end if;

  notice_body := btrim(new.business_name) || ' · ' || btrim(new.city);
  if new.status = 'approved' then
    notice_body := notice_body || '. Sign out and sign in to use the owner account.';
  end if;
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  if notice_screen = 'admin-owners' then
    insert into public.notifications (user_id, title, body, screen)
    select user_roles.user_id, notice_title, notice_body, notice_screen
    from public.user_roles
    join public.profiles on profiles.id = user_roles.user_id
    where user_roles.role = 'admin'
      and user_roles.user_id is distinct from auth.uid();
  elsif new.user_id is distinct from auth.uid() then
    insert into public.notifications (user_id, title, body, screen)
    select profiles.id, notice_title, notice_body, notice_screen
    from public.profiles
    where profiles.id = new.user_id;
  end if;

  return new;
end;
$$;

revoke all on function public.notify_owner_request() from public, anon;
grant execute on function public.notify_owner_request() to authenticated;

drop trigger if exists owner_verifications_notify on public.owner_verifications;

create trigger owner_verifications_notify
  after insert or update on public.owner_verifications
  for each row
  execute function public.notify_owner_request();
