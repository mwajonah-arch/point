-- ============================================================
-- Amani Pharmacy POS — M-Pesa add-on setup
-- Paste this into Supabase → SQL Editor → New query → Run.
-- Do this once, after the main supabase-setup.sql.
-- ============================================================

create table if not exists public.mpesa_transactions (
  id                   bigint generated always as identity primary key,
  checkout_request_id  text unique not null,
  merchant_request_id  text,
  phone                text,
  amount               numeric,
  sale_ref             text,
  status               text not null default 'pending', -- pending | success | failed
  result_code          int,
  result_desc          text,
  mpesa_receipt        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.mpesa_transactions enable row level security;

-- The till only ever needs to WATCH a payment's status. It never writes to
-- this table directly — only the Edge Functions do (using the service role
-- key, which bypasses RLS). That way nobody can fake a "successful" payment
-- from the browser.
create policy "Allow anon read" on public.mpesa_transactions
  for select to anon using (true);

alter publication supabase_realtime add table public.mpesa_transactions;
