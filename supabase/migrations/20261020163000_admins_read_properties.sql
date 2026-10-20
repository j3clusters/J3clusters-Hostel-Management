-- Safe to run again. An administrator must be able to see a property before approving it.

drop policy if exists "Admins read properties" on public.properties;

create policy "Admins read properties"
  on public.properties
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
