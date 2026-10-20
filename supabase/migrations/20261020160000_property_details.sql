-- Safe to run again. Adds the text shown on a property details page.

alter table public.properties
  add column if not exists description text,
  add column if not exists address text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'properties_description_not_blank'
  ) then
    alter table public.properties
      add constraint properties_description_not_blank
      check (description is null or char_length(btrim(description)) > 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'properties_address_not_blank'
  ) then
    alter table public.properties
      add constraint properties_address_not_blank
      check (address is null or char_length(btrim(address)) > 0);
  end if;
end $$;
