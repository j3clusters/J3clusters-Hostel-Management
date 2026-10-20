-- Safe to run again. An owner can save house rules for a waiting or approved property.
-- Visitors see them on an approved stay. Leaving the text blank removes them.

alter table public.properties
  add column if not exists house_rules text;

alter table public.properties drop constraint if exists properties_house_rules_length;

alter table public.properties
  add constraint properties_house_rules_length
  check (house_rules is null or char_length(btrim(house_rules)) between 10 and 500);

create or replace function public.set_house_rules(target_property uuid, rules_text text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  property_owner uuid;
  property_status text;
  cleaned text;
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

  if property_owner is null or property_owner is distinct from (select auth.uid()) then
    raise exception 'Not allowed';
  end if;

  if property_status not in ('pending', 'approved') then
    raise exception 'House rules can be saved while the property is waiting or approved';
  end if;

  cleaned := btrim(coalesce(rules_text, ''));
  if cleaned = '' then
    cleaned := null;
  elsif char_length(cleaned) < 10 or char_length(cleaned) > 500 then
    raise exception 'Write house rules of 10 to 500 characters, or leave them blank';
  end if;

  update public.properties
  set house_rules = cleaned
  where id = target_property
    and owner_id = (select auth.uid())
    and status in ('pending', 'approved');
end;
$$;

revoke all on function public.set_house_rules(uuid, text) from public, anon;
grant execute on function public.set_house_rules(uuid, text) to authenticated;
