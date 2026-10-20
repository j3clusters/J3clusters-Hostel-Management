-- Safe to run again. Approved stays can show the average of real stay reviews.
-- A stay with no reviews is left out. This does not invent a score.

create or replace function public.property_review_summaries()
returns table (
  property_id uuid,
  review_count integer,
  average_rating numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select stay_reviews.property_id,
         count(*)::integer,
         round(avg(stay_reviews.rating)::numeric, 1)
  from public.stay_reviews
  join public.properties on properties.id = stay_reviews.property_id
  where properties.status = 'approved'
  group by stay_reviews.property_id;
$$;

revoke all on function public.property_review_summaries() from public;
grant execute on function public.property_review_summaries() to anon, authenticated;
