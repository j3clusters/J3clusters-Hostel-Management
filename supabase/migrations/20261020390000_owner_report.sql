-- Safe to run again. An owner can read counts for their own properties.
-- Other owners' numbers are not included. Names and phone numbers are not included.

create or replace function public.owner_report()
returns table (
  pending_properties integer,
  occupied_beds integer,
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
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles
    where user_id = (select auth.uid())
      and role = 'owner'
  ) then
    raise exception 'Not allowed';
  end if;

  return query
  select
    (select count(*)::integer from public.properties where owner_id = (select auth.uid()) and status = 'pending'),
    (
      select count(*)::integer
      from public.booking_requests
      join public.properties on properties.id = booking_requests.property_id
      where properties.owner_id = (select auth.uid())
        and booking_requests.status = 'checked_in'
        and booking_requests.bed_id is not null
    ),
    (
      select count(*)::integer
      from public.maintenance_requests
      join public.properties on properties.id = maintenance_requests.property_id
      where properties.owner_id = (select auth.uid())
        and maintenance_requests.status = 'open'
    ),
    (
      select count(*)::integer
      from public.leave_requests
      join public.properties on properties.id = leave_requests.property_id
      where properties.owner_id = (select auth.uid())
        and leave_requests.status = 'requested'
    ),
    (
      select count(*)::integer
      from public.rent_charges
      join public.properties on properties.id = rent_charges.property_id
      where properties.owner_id = (select auth.uid())
        and rent_charges.status = 'due'
    ),
    (
      select coalesce(sum(rent_charges.amount), 0)
      from public.rent_charges
      join public.properties on properties.id = rent_charges.property_id
      where properties.owner_id = (select auth.uid())
        and rent_charges.status = 'due'
    ),
    (
      select count(*)::integer
      from public.deposits
      join public.properties on properties.id = deposits.property_id
      where properties.owner_id = (select auth.uid())
        and deposits.status = 'due'
    ),
    (
      select coalesce(sum(deposits.amount), 0)
      from public.deposits
      join public.properties on properties.id = deposits.property_id
      where properties.owner_id = (select auth.uid())
        and deposits.status = 'due'
    );
end;
$$;

revoke all on function public.owner_report() from public, anon;
grant execute on function public.owner_report() to authenticated;
