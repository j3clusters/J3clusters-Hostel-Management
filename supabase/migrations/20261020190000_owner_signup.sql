-- Safe to run again. Accounts created from Owner Login start as owners.
-- An administrator account is left unchanged.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  assigned_role text := 'resident';
begin
  if new.raw_user_meta_data->>'account_type' = 'owner' then
    assigned_role := 'owner';
  end if;

  insert into public.profiles (id)
  values (new.id);

  insert into public.user_roles (user_id, role)
  values (new.id, assigned_role);

  return new;
end;
$$;

create or replace function public.open_owner_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select role
  into caller_role
  from public.user_roles
  where user_id = (select auth.uid());

  if caller_role = 'admin' then
    return;
  end if;

  update public.user_roles
  set role = 'owner'
  where user_id = (select auth.uid());
end;
$$;

revoke all on function public.open_owner_account() from public;
revoke all on function public.open_owner_account() from anon;
grant execute on function public.open_owner_account() to authenticated;
