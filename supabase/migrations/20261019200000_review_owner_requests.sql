-- Safe to run again. Only an administrator can approve or reject an owner request.

drop policy if exists "Admins read owner requests" on public.owner_verifications;

create policy "Admins read owner requests"
  on public.owner_verifications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.user_roles
      where user_id = (select auth.uid())
        and role = 'admin'
    )
  );

create or replace function public.review_owner_request(request_id uuid, decision text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
  target_user uuid;
begin
  if decision not in ('approved', 'rejected') then
    raise exception 'Invalid decision';
  end if;

  select role
  into caller_role
  from public.user_roles
  where user_id = (select auth.uid());

  if caller_role is distinct from 'admin' then
    raise exception 'Not allowed';
  end if;

  update public.owner_verifications
  set status = decision
  where id = request_id
    and status = 'pending'
  returning user_id into target_user;

  if target_user is null then
    raise exception 'Request was not pending';
  end if;

  if decision = 'approved' then
    update public.user_roles
    set role = 'owner'
    where user_id = target_user;
  end if;
end;
$$;

revoke all on function public.review_owner_request(uuid, text) from public;
revoke all on function public.review_owner_request(uuid, text) from anon;
grant execute on function public.review_owner_request(uuid, text) to authenticated;
