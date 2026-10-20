-- Safe to run again. A signed-in person can send one open enquiry for an approved stay.

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  message text not null,
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enquiries_message_length check (char_length(btrim(message)) >= 10)
);

create unique index if not exists enquiries_one_open
  on public.enquiries (user_id, property_id)
  where status = 'open';

create or replace function public.protect_enquiry_content()
returns trigger
language plpgsql
as $$
begin
  if new.user_id is distinct from old.user_id
    or new.property_id is distinct from old.property_id
    or new.message is distinct from old.message then
    raise exception 'Not allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists enquiries_protect_content on public.enquiries;
create trigger enquiries_protect_content
  before update on public.enquiries
  for each row
  execute function public.protect_enquiry_content();

alter table public.enquiries enable row level security;

revoke all on public.enquiries from anon, authenticated;
grant select, insert, update on public.enquiries to authenticated;

drop policy if exists "Users read their enquiries" on public.enquiries;
drop policy if exists "Owners read enquiries for their properties" on public.enquiries;
drop policy if exists "Users send an enquiry" on public.enquiries;
drop policy if exists "Requesters close their enquiry" on public.enquiries;
drop policy if exists "Owners close enquiries for their properties" on public.enquiries;

create policy "Users read their enquiries"
  on public.enquiries
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Owners read enquiries for their properties"
  on public.enquiries
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.properties
      where id = property_id
        and owner_id = (select auth.uid())
    )
  );

create policy "Users send an enquiry"
  on public.enquiries
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and status = 'open'
    and exists (
      select 1
      from public.properties
      where id = property_id
        and status = 'approved'
    )
  );

create policy "Requesters close their enquiry"
  on public.enquiries
  for update
  to authenticated
  using (user_id = (select auth.uid()) and status = 'open')
  with check (user_id = (select auth.uid()) and status = 'closed');

create policy "Owners close enquiries for their properties"
  on public.enquiries
  for update
  to authenticated
  using (
    status = 'open'
    and exists (
      select 1
      from public.properties
      where id = property_id
        and owner_id = (select auth.uid())
    )
  )
  with check (
    status = 'closed'
    and exists (
      select 1
      from public.properties
      where id = property_id
        and owner_id = (select auth.uid())
    )
  );
