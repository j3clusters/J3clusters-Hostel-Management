-- Safe to run again. Owners can add one cover photo. Visitors can see it only after approval.

alter table public.properties
  add column if not exists cover_path text;

create or replace function public.set_property_cover(target_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  cover text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = target_id
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  cover := target_id::text || '/cover';

  update public.properties
  set cover_path = cover
  where id = target_id;

  return cover;
end;
$$;

revoke all on function public.set_property_cover(uuid) from public;
revoke all on function public.set_property_cover(uuid) from anon;
grant execute on function public.set_property_cover(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "Anyone reads approved property photos" on storage.objects;
drop policy if exists "Owners read their property photos" on storage.objects;
drop policy if exists "Owners upload their property photos" on storage.objects;
drop policy if exists "Owners replace their property photos" on storage.objects;

create policy "Anyone reads approved property photos"
  on storage.objects
  for select
  to anon, authenticated
  using (
    bucket_id = 'property-photos'
    and exists (
      select 1
      from public.properties
      where id::text = (storage.foldername(name))[1]
        and status = 'approved'
        and cover_path = name
    )
  );

create policy "Owners read their property photos"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'property-photos'
    and exists (
      select 1
      from public.properties
      where id::text = (storage.foldername(name))[1]
        and owner_id = (select auth.uid())
    )
  );

create policy "Owners upload their property photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-photos'
    and name = (storage.foldername(name))[1] || '/cover'
    and exists (
      select 1
      from public.properties
      where id::text = (storage.foldername(name))[1]
        and owner_id = (select auth.uid())
    )
  );

create policy "Owners replace their property photos"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'property-photos'
    and exists (
      select 1
      from public.properties
      where id::text = (storage.foldername(name))[1]
        and owner_id = (select auth.uid())
    )
  )
  with check (
    bucket_id = 'property-photos'
    and name = (storage.foldername(name))[1] || '/cover'
    and exists (
      select 1
      from public.properties
      where id::text = (storage.foldername(name))[1]
        and owner_id = (select auth.uid())
    )
  );
