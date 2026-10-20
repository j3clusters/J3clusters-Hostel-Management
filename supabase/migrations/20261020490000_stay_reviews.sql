-- Safe to run again. A resident can review a stay after check-out.
-- The review shows a rating and a note. The resident's name and phone are not shown.
-- The phone is not alerted.

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
    'owner-profile',
    'stay-reviews'
  ));

create table if not exists public.stay_reviews (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  note text not null,
  created_at timestamptz not null default now(),
  constraint stay_reviews_note_length check (char_length(btrim(note)) between 10 and 200),
  constraint stay_reviews_one_per_person unique (property_id, user_id)
);

alter table public.stay_reviews enable row level security;

revoke all on public.stay_reviews from anon, authenticated;

create or replace function public.submit_stay_review(
  target_property uuid,
  stay_rating integer,
  stay_note text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  property_owner uuid;
  property_name text;
  created timestamptz;
  notice_body text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if stay_rating is null or stay_rating < 1 or stay_rating > 5 then
    raise exception 'Choose a rating from 1 to 5';
  end if;

  cleaned := btrim(stay_note);
  if char_length(cleaned) < 10 or char_length(cleaned) > 200 then
    raise exception 'Write 10 to 200 characters';
  end if;

  select owner_id, name
  into property_owner, property_name
  from public.properties
  where id = target_property;

  if property_owner is null then
    raise exception 'This stay is not available';
  end if;

  if property_owner = (select auth.uid()) then
    raise exception 'Not allowed';
  end if;

  if not exists (
    select 1
    from public.booking_requests
    where property_id = target_property
      and user_id = (select auth.uid())
      and status = 'checked_out'
  ) then
    raise exception 'Check out of this stay before reviewing it';
  end if;

  insert into public.stay_reviews (property_id, user_id, rating, note)
  values (target_property, (select auth.uid()), stay_rating, cleaned)
  returning created_at into created;

  notice_body := btrim(coalesce(property_name, 'Stay')) || ' · ' || stay_rating::text || ' of 5';
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  insert into public.notifications (user_id, title, body, screen)
  select profiles.id, 'Stay review', notice_body, 'stay-reviews'
  from public.profiles
  where profiles.id = property_owner
    and profiles.id is distinct from auth.uid();

  return created;
exception
  when unique_violation then
    raise exception 'You already reviewed this stay';
end;
$$;

revoke all on function public.submit_stay_review(uuid, integer, text) from public, anon;
grant execute on function public.submit_stay_review(uuid, integer, text) to authenticated;

create or replace function public.property_reviews(target_property uuid)
returns table (
  rating integer,
  note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select stay_reviews.rating, stay_reviews.note, stay_reviews.created_at
  from public.stay_reviews
  join public.properties on properties.id = stay_reviews.property_id
  where stay_reviews.property_id = target_property
    and properties.status = 'approved'
  order by stay_reviews.created_at desc
  limit 20;
$$;

revoke all on function public.property_reviews(uuid) from public;
grant execute on function public.property_reviews(uuid) to anon, authenticated;

create or replace function public.stay_review_choices()
returns table (
  property_id uuid,
  property_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select properties.id, properties.name
  from public.booking_requests
  join public.properties on properties.id = booking_requests.property_id
  where booking_requests.user_id = (select auth.uid())
    and booking_requests.status = 'checked_out'
    and properties.owner_id is distinct from (select auth.uid())
    and not exists (
      select 1
      from public.stay_reviews
      where stay_reviews.property_id = booking_requests.property_id
        and stay_reviews.user_id = (select auth.uid())
    )
  group by properties.id, properties.name
  order by properties.name;
$$;

revoke all on function public.stay_review_choices() from public, anon;
grant execute on function public.stay_review_choices() to authenticated;

create or replace function public.my_stay_reviews()
returns table (
  property_name text,
  rating integer,
  note text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select properties.name, stay_reviews.rating, stay_reviews.note, stay_reviews.created_at
  from public.stay_reviews
  join public.properties on properties.id = stay_reviews.property_id
  where stay_reviews.user_id = (select auth.uid())
  order by stay_reviews.created_at desc;
$$;

revoke all on function public.my_stay_reviews() from public, anon;
grant execute on function public.my_stay_reviews() to authenticated;

create or replace function public.owner_stay_reviews()
returns table (
  property_name text,
  rating integer,
  note text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if (select role from public.user_roles where user_id = (select auth.uid())) is distinct from 'owner' then
    raise exception 'Not allowed';
  end if;

  return query
  select properties.name, stay_reviews.rating, stay_reviews.note, stay_reviews.created_at
  from public.stay_reviews
  join public.properties on properties.id = stay_reviews.property_id
  where properties.owner_id = (select auth.uid())
  order by stay_reviews.created_at desc;
end;
$$;

revoke all on function public.owner_stay_reviews() from public, anon;
grant execute on function public.owner_stay_reviews() to authenticated;
