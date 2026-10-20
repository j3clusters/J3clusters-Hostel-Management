-- Safe to run again. A checked-in resident can report a problem.
-- Only the property owner can mark it done. This does not take payment.

create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  booking_request_id uuid not null references public.booking_requests (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  resident_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('plumbing', 'electrical', 'furniture', 'cleaning', 'other')),
  note text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint maintenance_note_length check (char_length(btrim(note)) between 10 and 200)
);

alter table public.maintenance_requests enable row level security;

revoke all on public.maintenance_requests from anon, authenticated;
grant select on public.maintenance_requests to authenticated;

drop policy if exists "Residents read their maintenance requests" on public.maintenance_requests;
drop policy if exists "Owners read maintenance requests for their properties" on public.maintenance_requests;

create policy "Residents read their maintenance requests"
  on public.maintenance_requests
  for select
  to authenticated
  using (resident_id = (select auth.uid()));

create policy "Owners read maintenance requests for their properties"
  on public.maintenance_requests
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

create or replace function public.report_maintenance(
  target_booking uuid,
  issue_category text,
  issue_note text
)
returns table (
  request_id uuid,
  reported_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_resident uuid;
  request_status text;
  cleaned_note text;
  new_id uuid;
  reported timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if issue_category not in ('plumbing', 'electrical', 'furniture', 'cleaning', 'other') then
    raise exception 'Choose a problem type';
  end if;

  cleaned_note := btrim(issue_note);
  if char_length(cleaned_note) < 10 or char_length(cleaned_note) > 200 then
    raise exception 'Describe the problem in 10 to 200 characters';
  end if;

  select property_id, user_id, status
  into request_property, request_resident, request_status
  from public.booking_requests
  where id = target_booking
  for update;

  if request_property is null or request_resident is distinct from (select auth.uid()) or request_status is distinct from 'checked_in' then
    raise exception 'Check in before reporting a problem';
  end if;

  reported := now();

  insert into public.maintenance_requests (booking_request_id, property_id, resident_id, category, note, status, created_at)
  values (target_booking, request_property, request_resident, issue_category, cleaned_note, 'open', reported)
  returning id into new_id;

  return query
  select new_id, reported;
end;
$$;

create or replace function public.complete_maintenance(target_request uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_property uuid;
  request_status text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  select property_id, status
  into request_property, request_status
  from public.maintenance_requests
  where id = target_request
  for update;

  if request_property is null or request_status is distinct from 'open' then
    raise exception 'This report is not open';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = request_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  update public.maintenance_requests
  set status = 'done',
      completed_at = now()
  where id = target_request;
end;
$$;

revoke all on function public.report_maintenance(uuid, text, text) from public, anon;
revoke all on function public.complete_maintenance(uuid) from public, anon;
grant execute on function public.report_maintenance(uuid, text, text) to authenticated;
grant execute on function public.complete_maintenance(uuid) to authenticated;
