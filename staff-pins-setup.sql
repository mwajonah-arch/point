-- ============================================================
-- Amani Pharmacy POS — staff login/session setup
-- Paste this into Supabase → SQL Editor → New query → Run,
-- after supabase-setup.sql.
--
-- This table holds ONLY what's needed to check a PIN and know a
-- role — never anything the browser reads directly.
-- ============================================================

create table if not exists public.staff_pins (
  id         text primary key,
  role       text not null check (role in ('staff', 'admin')),
  pin_salt   text not null,
  pin_hash   text not null,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_pins enable row level security;
-- Deliberately zero policies here. With RLS on and no policies, even the
-- anon and authenticated roles are denied by default — only the
-- service-role key (used inside staff-login/staff-admin/save-kv, never
-- shipped to the browser) can read or write this table at all.

-- ------------------------------------------------------------
-- One-time setup you still need to do (can't be done from SQL,
-- since PINs are salted + hashed inside the edge function, not
-- in the database):
--
-- 1. Add two Edge Function secrets in your Supabase project:
--      SESSION_SECRET   — a long random string, e.g. output of:
--                          openssl rand -hex 32
--                          (this is what signs/verifies session
--                          tokens — treat it like a password)
--
-- 2. Deploy the three new functions:
--      supabase functions deploy staff-login
--      supabase functions deploy staff-admin
--      supabase functions deploy save-kv
--
-- 3. Create your first admin PIN. This ONE call is allowed to run
--    with no existing admin PIN to check against, since none
--    exists yet — the moment it succeeds, that door closes for
--    good and every future change needs a real admin PIN.
--    Replace YOUR_PROJECT and YOUR_ANON_KEY, then run:
--
--    curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/staff-admin \
--      -H "Content-Type: application/json" \
--      -H "apikey: YOUR_ANON_KEY" \
--      -d '{"action":"set","staffId":"s1","pin":"1234","role":"admin"}'
--
--    (YOUR_ANON_KEY is the same anon key already in your config.js.
--    Use whatever staffId your `staff` list already uses for the
--    admin row — 's1' if you're using the app's defaults.)
--
-- 4. Log into the app with that PIN as Admin. From there, add or
--    edit cashiers from Settings → Staff as usual — that screen
--    already goes through this same authenticated, hashed path.
-- ------------------------------------------------------------
