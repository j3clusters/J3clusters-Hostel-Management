-- Safe to run again. An owner can withdraw a property while it is still waiting for approval.
-- Each administrator is told. The phone is not alerted.

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.properties'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%pending%approved%rejected%';

  if constraint_name is not null then
    execute format('alter table public.properties drop constraint %I', constraint_name);
  end if;
end $$;

alter table public.properties
  add constraint properties_status_check
  check (status in ('pending', 'approved', 'rejected', 'withdrawn'));

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
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'withdrawn' then
    notice_title := 'Property withdrawn';
    notice_screen := 'admin-properties';
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

create or replace function public.withdraw_pending_property(target_property uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if (select role from public.user_roles where user_id = (select auth.uid())) is distinct from 'owner' then
    raise exception 'Not allowed';
  end if;

  update public.properties
  set status = 'withdrawn'
  where id = target_property
    and owner_id = (select auth.uid())
    and status = 'pending';

  get diagnostics updated_count = row_count;

  if updated_count <> 1 then
    raise exception 'Only a property waiting for approval can be withdrawn';
  end if;
end;
$$;

revoke all on function public.withdraw_pending_property(uuid) from public, anon;
grant execute on function public.withdraw_pending_property(uuid) to authenticated;
