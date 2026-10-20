-- Safe to run again. An administrator can read counts. Names and phone numbers are not included.

create or replace function public.admin_report()
returns table (
  pending_owner_requests integer,
  pending_properties integer,
  occupied_beds integer,
  open_maintenance integer,
  waiting_leave integer,
  rent_due_count integer,
  rent_due_amount numeric
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
      and role = 'admin'
  ) then
    raise exception 'Not allowed';
  end if;

  return query
  select
    (select count(*)::integer from public.owner_verifications where status = 'pending'),
    (select count(*)::integer from public.properties where status = 'pending'),
    (select count(*)::integer from public.booking_requests where status = 'checked_in' and bed_id is not null),
    (select count(*)::integer from public.maintenance_requests where status = 'open'),
    (select count(*)::integer from public.leave_requests where status = 'requested'),
    (select count(*)::integer from public.rent_charges where status = 'due'),
    (select coalesce(sum(amount), 0) from public.rent_charges where status = 'due');
end;
$$;

revoke all on function public.admin_report() from public, anon;
grant execute on function public.admin_report() to authenticated;
