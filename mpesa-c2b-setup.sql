-- ============================================================
-- Till payments feed — run once in Supabase → SQL Editor.
-- Every payment SMS your till phone receives lands here automatically,
-- so the cashier can tap it at checkout instead of typing the code.
-- ============================================================

create table if not exists public.till_payments (
  id          bigint generated always as identity primary key,
  trans_id    text unique not null,      -- the M-Pesa confirmation code, e.g. SGH7K2L9QX
  amount      numeric not null,
  payer_name  text,                      -- first name only; phone numbers are deliberately not stored
  trans_time  timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.till_payments enable row level security;

-- The till only READS this list. Only the till-payments Edge Function
-- (service role) can insert, so nobody can fake a payment from the browser.
create policy "Allow anon read" on public.till_payments
  for select to anon using (true);

alter publication supabase_realtime add table public.till_payments;
