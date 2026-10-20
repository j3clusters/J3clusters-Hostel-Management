-- Safe to run again. An administrator can list today's visits and arrivals.
-- The rows do not include a resident name, phone number, or user id.

create or replace function public.admin_today()
returns table (
  kind text,
  item_id uuid,
  property_id uuid,
  property_name text,
  locality text,
  city text,
  part text,
  status text,
  bed_label text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  today date := (timezone('Asia/Kolkata', now()))::date;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'admin'
  ) then
    raise exception 'Not allowed';
  end if;

  return query
  select
    'visit'::text,
    property_visits.id,
    properties.id,
    properties.name,
    properties.locality,
    properties.city,
    property_visits.visit_part,
    property_visits.status,
    null::text
  from public.property_visits
  join public.properties on properties.id = property_visits.property_id
  where property_visits.visit_on = today
    and property_visits.status in ('requested', 'confirmed', 'rescheduled')
  union all
  select
    'arrival'::text,
    booking_requests.id,
    properties.id,
    properties.name,
    properties.locality,
    properties.city,
    booking_requests.move_in_part,
    booking_requests.status,
    beds.label
  from public.booking_requests
  join public.properties on properties.id = booking_requests.property_id
  left join public.beds on beds.id = booking_requests.bed_id
  where booking_requests.move_in = today
    and booking_requests.status in ('requested', 'confirmed');
end;
$$;

revoke all on function public.admin_today() from public, anon;
grant execute on function public.admin_today() to authenticated;
