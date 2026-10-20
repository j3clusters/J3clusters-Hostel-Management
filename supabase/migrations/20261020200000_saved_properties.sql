-- Safe to run again. A signed-in person can save an approved stay for themselves.

create table if not exists public.saved_properties (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint saved_properties_one_save unique (user_id, property_id)
);

alter table public.saved_properties enable row level security;

revoke all on public.saved_properties from anon, authenticated;
grant select, insert, delete on public.saved_properties to authenticated;

drop policy if exists "Users read their saved stays" on public.saved_properties;
drop policy if exists "Users save an approved stay" on public.saved_properties;
drop policy if exists "Users remove their saved stays" on public.saved_properties;

create policy "Users read their saved stays"
  on public.saved_properties
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users save an approved stay"
  on public.saved_properties
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.properties
      where id = property_id
        and status = 'approved'
    )
  );

create policy "Users remove their saved stays"
  on public.saved_properties
  for delete
  to authenticated
  using (user_id = (select auth.uid()));
