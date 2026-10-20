-- Safe to run again. The property owner can write one reply while an enquiry is open.
-- The original message stays. The phone is not alerted.

alter table public.enquiries
  add column if not exists owner_reply text,
  add column if not exists replied_at timestamptz;

alter table public.enquiries drop constraint if exists enquiries_reply_length;

alter table public.enquiries
  add constraint enquiries_reply_length
  check (owner_reply is null or char_length(btrim(owner_reply)) between 10 and 200);

revoke update on public.enquiries from authenticated;
grant update (status, updated_at) on public.enquiries to authenticated;

create or replace function public.reply_to_enquiry(target_enquiry uuid, reply_note text)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned text;
  enquirer uuid;
  enquiry_status text;
  existing_reply text;
  property_owner uuid;
  property_name text;
  replied timestamptz;
  notice_body text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  cleaned := btrim(reply_note);
  if char_length(cleaned) < 10 or char_length(cleaned) > 200 then
    raise exception 'Write 10 to 200 characters';
  end if;

  select enquiries.user_id, enquiries.status, enquiries.owner_reply, properties.owner_id, properties.name
  into enquirer, enquiry_status, existing_reply, property_owner, property_name
  from public.enquiries
  join public.properties on properties.id = enquiries.property_id
  where enquiries.id = target_enquiry
  for update of enquiries;

  if property_owner is null or property_owner is distinct from (select auth.uid()) then
    raise exception 'Not allowed';
  end if;

  if enquiry_status is distinct from 'open' then
    raise exception 'This enquiry is closed';
  end if;

  if existing_reply is not null then
    raise exception 'You already replied to this enquiry';
  end if;

  update public.enquiries
  set owner_reply = cleaned,
      replied_at = now()
  where id = target_enquiry
    and status = 'open'
    and owner_reply is null
  returning replied_at into replied;

  if replied is null then
    raise exception 'You already replied to this enquiry';
  end if;

  notice_body := btrim(coalesce(property_name, 'Stay')) || ' · ' || cleaned;
  if char_length(notice_body) > 200 then
    notice_body := left(notice_body, 200);
  end if;

  insert into public.notifications (user_id, title, body, screen)
  select profiles.id, 'Enquiry reply', notice_body, 'enquiries'
  from public.profiles
  where profiles.id = enquirer
    and profiles.id is distinct from auth.uid();

  return replied;
end;
$$;

revoke all on function public.reply_to_enquiry(uuid, text) from public, anon;
grant execute on function public.reply_to_enquiry(uuid, text) to authenticated;
