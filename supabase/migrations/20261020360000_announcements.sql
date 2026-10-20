-- Safe to run again. An owner can post a notice for their property.
-- Confirmed and checked-in residents can read it. This does not send a notification.

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now(),
  constraint announcements_message_length check (char_length(btrim(message)) between 10 and 200)
);

alter table public.announcements enable row level security;

revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to authenticated;

drop policy if exists "Owners read their announcements" on public.announcements;
drop policy if exists "Residents read announcements for their stay" on public.announcements;

create policy "Owners read their announcements"
  on public.announcements
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create policy "Residents read announcements for their stay"
  on public.announcements
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.booking_requests
      where booking_requests.property_id = announcements.property_id
        and booking_requests.user_id = (select auth.uid())
        and booking_requests.status in ('confirmed', 'checked_in')
    )
  );

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

  return query
  select new_id, posted;
end;
$$;

create or replace function public.remove_announcement(target_announcement uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  delete from public.announcements
  where id = target_announcement
    and owner_id = (select auth.uid());

  if not found then
    raise exception 'Not allowed';
  end if;
end;
$$;

revoke all on function public.post_announcement(uuid, text) from public, anon;
revoke all on function public.remove_announcement(uuid) from public, anon;
grant execute on function public.post_announcement(uuid, text) to authenticated;
grant execute on function public.remove_announcement(uuid) to authenticated;
