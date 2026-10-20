-- Safe to run again. A resident can read counts for their own stay.
-- Other residents' numbers are not included. Phone numbers are not included.

create or replace function public.resident_report()
returns table (
  stay_name text,
  bed_label text,
  open_maintenance integer,
  waiting_leave integer,
  rent_due_count integer,
  rent_due_amount numeric,
  deposits_due_count integer,
  deposits_due_amount numeric
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_stay text;
  current_bed text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'resident'
  ) then
    raise exception 'Not allowed';
  end if;

  select properties.name,
    case
      when rooms.name is not null and beds.label is not null then rooms.name || ', ' || beds.label
      else coalesce(beds.label, '')
    end
  into current_stay, current_bed
  from public.booking_requests
  join public.properties on properties.id = booking_requests.property_id
  left join public.beds on beds.id = booking_requests.bed_id
  left join public.rooms on rooms.id = beds.room_id
  where booking_requests.user_id = (select auth.uid())
    and booking_requests.status = 'checked_in'
  order by booking_requests.updated_at desc
  limit 1;

  return query
  select
    coalesce(current_stay, ''),
    coalesce(current_bed, ''),
    (select count(*)::integer from public.maintenance_requests where resident_id = (select auth.uid()) and status = 'open'),
    (select count(*)::integer from public.leave_requests where resident_id = (select auth.uid()) and status = 'requested'),
    (select count(*)::integer from public.rent_charges where resident_id = (select auth.uid()) and status = 'due'),
    (select coalesce(sum(amount), 0) from public.rent_charges where resident_id = (select auth.uid()) and status = 'due'),
    (select count(*)::integer from public.deposits where resident_id = (select auth.uid()) and status = 'due'),
    (select coalesce(sum(amount), 0) from public.deposits where resident_id = (select auth.uid()) and status = 'due');
end;
$$;

revoke all on function public.resident_report() from public, anon;
grant execute on function public.resident_report() to authenticated;
