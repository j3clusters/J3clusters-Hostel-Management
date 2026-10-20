-- Safe to run again. The property owner can write one reply to a stay review.
-- The reply shows on the stay. It does not change the rating or the resident's note.
-- The phone is not alerted.

alter table public.stay_reviews
  add column if not exists owner_reply text,
  add column if not exists replied_at timestamptz;

alter table public.stay_reviews drop constraint if exists stay_reviews_reply_length;

alter table public.stay_reviews
  add constraint stay_reviews_reply_length
  check (owner_reply is null or char_length(btrim(owner_reply)) between 10 and 200);

create or replace function public.reply_to_stay_review(target_review uuid, reply_note text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  reviewer uuid;
  existing_reply text;
  property_owner uuid;
  property_name text;
  replied timestamptz;
  notice_body text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  cleaned := btrim(reply_note);
  if char_length(cleaned) < 10 or char_length(cleaned) > 200 then
    raise exception 'Write 10 to 200 characters';
  end if;

  select stay_reviews.user_id, stay_reviews.owner_reply, properties.owner_id, properties.name
  into reviewer, existing_reply, property_owner, property_name
  from public.stay_reviews
  join public.properties on properties.id = stay_reviews.property_id
  where stay_reviews.id = target_review
  for update of stay_reviews;

  if property_owner is null then
    raise exception 'This review is not available';
  end if;

  if property_owner is distinct from (select auth.uid()) then
    raise exception 'Not allowed';
  end if;

  if existing_reply is not null then
    raise exception 'You already replied to this review';
  end if;

  update public.stay_reviews
  set owner_reply = cleaned,
      replied_at = now()
  where id = target_review
    and owner_reply is null
  returning replied_at into replied;

  if replied is null then
    raise exception 'You already replied to this review';
  end if;

  notice_body := btrim(coalesce(property_name, 'Stay'));
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  insert into public.notifications (user_id, title, body, screen)
  select profiles.id, 'Review reply', notice_body, 'stay-reviews'
  from public.profiles
  where profiles.id = reviewer
    and profiles.id is distinct from auth.uid();

  return replied;
end;
$$;

revoke all on function public.reply_to_stay_review(uuid, text) from public, anon;
grant execute on function public.reply_to_stay_review(uuid, text) to authenticated;

drop function if exists public.property_reviews(uuid);

create function public.property_reviews(target_property uuid)
returns table (
  rating integer,
  note text,
  created_at timestamptz,
  owner_reply text,
  replied_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select stay_reviews.rating, stay_reviews.note, stay_reviews.created_at, stay_reviews.owner_reply, stay_reviews.replied_at
  from public.stay_reviews
  join public.properties on properties.id = stay_reviews.property_id
  where stay_reviews.property_id = target_property
    and properties.status = 'approved'
  order by stay_reviews.created_at desc
  limit 20;
$$;

revoke all on function public.property_reviews(uuid) from public;
grant execute on function public.property_reviews(uuid) to anon, authenticated;

drop function if exists public.my_stay_reviews();

create function public.my_stay_reviews()
returns table (
  property_name text,
  rating integer,
  note text,
  created_at timestamptz,
  owner_reply text,
  replied_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select properties.name, stay_reviews.rating, stay_reviews.note, stay_reviews.created_at, stay_reviews.owner_reply, stay_reviews.replied_at
  from public.stay_reviews
  join public.properties on properties.id = stay_reviews.property_id
  where stay_reviews.user_id = (select auth.uid())
  order by stay_reviews.created_at desc;
$$;

revoke all on function public.my_stay_reviews() from public, anon;
grant execute on function public.my_stay_reviews() to authenticated;

drop function if exists public.owner_stay_reviews();

create function public.owner_stay_reviews()
returns table (
  review_id uuid,
  property_name text,
  rating integer,
  note text,
  created_at timestamptz,
  owner_reply text,
  replied_at timestamptz
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
  select stay_reviews.id, properties.name, stay_reviews.rating, stay_reviews.note, stay_reviews.created_at, stay_reviews.owner_reply, stay_reviews.replied_at
  from public.stay_reviews
  join public.properties on properties.id = stay_reviews.property_id
  where properties.owner_id = (select auth.uid())
  order by stay_reviews.created_at desc;
end;
$$;

revoke all on function public.owner_stay_reviews() from public, anon;
grant execute on function public.owner_stay_reviews() to authenticated;
