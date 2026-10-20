-- Safe to run again. An owner can correct a property while it is still waiting for approval.
-- Approval, rejection, the owner, and the cover photo stay unchanged.

create or replace function public.correct_pending_property(
  target_property uuid,
  property_name text,
  property_category text,
  property_city text,
  property_locality text,
  property_address text,
  property_description text,
  property_rent numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  property_owner uuid;
  property_status text;
  cleaned_name text;
  cleaned_city text;
  cleaned_locality text;
  cleaned_address text;
  cleaned_description text;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if (select role from public.user_roles where user_id = (select auth.uid())) is distinct from 'owner' then
    raise exception 'Not allowed';
  end if;

  select owner_id, status
  into property_owner, property_status
  from public.properties
  where id = target_property
  for update;

  if property_owner is null then
    raise exception 'This property is not available';
  end if;

  if property_owner is distinct from (select auth.uid()) then
    raise exception 'Not allowed';
  end if;

  if property_status is distinct from 'pending' then
    raise exception 'Only a property waiting for approval can be corrected';
  end if;

  cleaned_name := btrim(property_name);
  cleaned_city := btrim(property_city);
  cleaned_locality := btrim(property_locality);
  cleaned_address := btrim(property_address);
  cleaned_description := btrim(property_description);

  if char_length(cleaned_name) < 2 or char_length(cleaned_name) > 80
    or char_length(cleaned_city) < 2 or char_length(cleaned_city) > 60
    or char_length(cleaned_locality) < 2 or char_length(cleaned_locality) > 60
    or char_length(cleaned_address) < 5 or char_length(cleaned_address) > 200
    or char_length(cleaned_description) < 10 or char_length(cleaned_description) > 500
  then
    raise exception 'Enter the name, city, locality, address, and a short description';
  end if;

  if property_category not in ('pg', 'hostel', 'hotel', 'guest_house') then
    raise exception 'Choose a property type';
  end if;

  if property_rent is null or property_rent <= 0 or property_rent > 1000000 then
    raise exception 'Enter a monthly rent greater than 0 and up to 1000000';
  end if;

  update public.properties
  set name = cleaned_name,
      category = property_category,
      city = cleaned_city,
      locality = cleaned_locality,
      address = cleaned_address,
      description = cleaned_description,
      monthly_rent = property_rent
  where id = target_property
    and owner_id = (select auth.uid())
    and status = 'pending';
end;
$$;

revoke all on function public.correct_pending_property(uuid, text, text, text, text, text, text, numeric) from public, anon;
grant execute on function public.correct_pending_property(uuid, text, text, text, text, text, text, numeric) to authenticated;
