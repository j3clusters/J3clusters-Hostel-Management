-- Safe to run again. A new visit request includes a date in India time.
-- Rescheduling can still move that date. The phone is not alerted.

create or replace function public.guard_visit_date()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  today date := (timezone('Asia/Kolkata', now()))::date;
begin
  if tg_op = 'INSERT' then
    if new.visit_on is null or new.visit_on < today or new.visit_on > today + 30 then
      raise exception 'Choose a visit date from today through the next 30 days';
    end if;
  elsif new.visit_on is distinct from old.visit_on then
    if new.status is distinct from 'rescheduled'
      or new.visit_on is null
      or new.visit_on < today
      or new.visit_on > today + 30
    then
      raise exception 'Choose a visit date from today through the next 30 days';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.guard_visit_date() from public, anon;
grant execute on function public.guard_visit_date() to authenticated;

drop trigger if exists property_visits_guard_date on public.property_visits;

create trigger property_visits_guard_date
  before insert or update on public.property_visits
  for each row
  execute function public.guard_visit_date();
