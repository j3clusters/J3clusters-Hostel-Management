-- Safe to run again. An owner can record money spent on their own property.
-- Residents cannot read these rows. This does not take payment.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('repairs', 'supplies', 'utilities', 'other')),
  note text not null,
  amount numeric(12, 2) not null check (amount > 0 and amount <= 1000000),
  spent_on date not null,
  created_at timestamptz not null default now(),
  constraint expenses_note_length check (char_length(btrim(note)) between 3 and 120)
);

alter table public.expenses enable row level security;

revoke all on public.expenses from anon, authenticated;
grant select on public.expenses to authenticated;

drop policy if exists "Owners read their expenses" on public.expenses;

create policy "Owners read their expenses"
  on public.expenses
  for select
  to authenticated
  using (owner_id = (select auth.uid()));

create or replace function public.record_expense(
  target_property uuid,
  expense_category text,
  expense_note text,
  expense_amount numeric
)
returns table (
  expense_id uuid,
  spent_on date
)
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_note text;
  saved_amount numeric;
  spent date;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Not allowed';
  end if;

  if expense_category not in ('repairs', 'supplies', 'utilities', 'other') then
    raise exception 'Choose an expense type';
  end if;

  cleaned_note := btrim(expense_note);
  if char_length(cleaned_note) < 3 or char_length(cleaned_note) > 120 then
    raise exception 'Enter a note of 3 to 120 characters';
  end if;

  if expense_amount is null or expense_amount <= 0 or expense_amount > 1000000 then
    raise exception 'Enter an amount from 1 to 1000000';
  end if;

  if not exists (
    select 1
    from public.properties
    where id = target_property
      and owner_id = (select auth.uid())
  ) then
    raise exception 'Not allowed';
  end if;

  saved_amount := round(expense_amount, 2);
  spent := timezone('Asia/Kolkata', now())::date;

  insert into public.expenses (property_id, owner_id, category, note, amount, spent_on)
  values (target_property, (select auth.uid()), expense_category, cleaned_note, saved_amount, spent)
  returning id into new_id;

  return query
  select new_id, spent;
end;
$$;

revoke all on function public.record_expense(uuid, text, text, numeric) from public, anon;
grant execute on function public.record_expense(uuid, text, text, numeric) to authenticated;
