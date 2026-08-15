-- ============================================================
-- Amani Pharmacy POS — one-time Supabase setup
-- Paste this whole file into Supabase → SQL Editor → New query,
-- then click "Run". You only need to do this once.
--
-- M-Pesa's table (mpesa_transactions) is created separately by
-- mpesa-setup.sql — don't duplicate it here.
-- ============================================================

-- 1. The single table the whole app reads and writes to.
--    It stores several rows (inventory, sales, staff, settings,
--    inventoryLog) — each one holding the entire list as JSON.
create table if not exists public.kv_store (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2. Turn on Row Level Security. The app's public "anon" key may
--    only READ this table — it's used for the initial page load and
--    the realtime "another till just changed something" subscription.
--
--    There is deliberately NO insert/update policy for anon. All
--    writes now go through the save-kv edge function (see
--    staff-pins-setup.sql), which uses the service-role key — which
--    bypasses RLS — and checks a signed session token plus role
--    before writing anything. That's what actually stops someone
--    with the anon key from overwriting 'sales' or 'inventory' with
--    garbage, which a client-side-only policy never could.
alter table public.kv_store enable row level security;

create policy "Allow anon read" on public.kv_store
  for select to anon using (true);

-- 3. Turn on realtime so every till updates instantly when any
--    other till makes a sale or edits inventory.
alter publication supabase_realtime add table public.kv_store;

-- Done. Next: run mpesa-setup.sql for M-Pesa, and the staff_pins
-- migration for locked-down staff logins, if you haven't already.
