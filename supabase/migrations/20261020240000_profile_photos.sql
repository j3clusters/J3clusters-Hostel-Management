-- Safe to run again. Profile photos stay in a private bucket.
-- Only the signed-in person can read or replace their own photo.

insert into storage.buckets (id, name, public)
values ('profile-photos', 'profile-photos', false)
on conflict (id) do update set public = false;

drop policy if exists "Users read their profile photo" on storage.objects;
drop policy if exists "Users upload their profile photo" on storage.objects;
drop policy if exists "Users replace their profile photo" on storage.objects;
drop policy if exists "Users delete their profile photo" on storage.objects;

create policy "Users read their profile photo"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users upload their profile photo"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users replace their profile photo"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "Users delete their profile photo"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
