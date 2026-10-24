# Medipoint Point of Sale

A React point-of-sale system for pharmacies and medical stores, backed by Supabase,
with M-Pesa and card payments. It runs in the browser; Netlify builds and hosts it.

## Setup

1. **Supabase.** Create a project, then put its URL and anon key in `config.js`.
2. **Database.** In the Supabase SQL Editor, run (in this order) `supabase-setup.sql`,
   `inventory-migration.sql`, `staff-pins-setup.sql` and, for M-Pesa prompts, `mpesa-setup.sql`.
   For automatic till-payment detection also run `mpesa-c2b-setup.sql`.
3. **Edge Functions.** Deploy everything in `supabase/functions/`
   (`supabase functions deploy <name>`). Set the secrets each one needs; M-Pesa
   prompts are explained in `MPESA-SETUP.md`, till payments in `TILL-PAYMENTS-SETUP.md`.
   `mpesa-callback` and `till-payments` must be deployed with **Verify JWT off**.

## Running and deploying

- **Locally:** `npm run dev`, then open http://localhost:3000 (compiles in the browser; fine for development).
- **Deploying:** `npm run build` compiles and minifies the app into `dist/`. Netlify runs this
  automatically (`netlify.toml`). To test the production build locally: `npm run build && npm run preview`.

## Project layout

- `index.html`, `app.js`: the app (one React file; `index.html` is the development page)
- `config.js`: your Supabase URL and anon key
- `build.js`: production build (esbuild); produces `dist/`
- `supabase/functions/`: server-side code (payments, stock changes, staff login, till payments)
- `*.sql`: database setup scripts

## How it works

- Data lives in your Supabase project; realtime subscriptions keep every device in sync.
- The app keeps the last 90 days of sales in memory, plus any unpaid account sales of any age.
  Older sales load on demand ("Load full history" in the admin Sales tab).
- Staff PINs are checked on the server, never in the browser (`staff-login`, `staff-admin`).
- Card payments use Paystack's popup; M-Pesa prompts use the `mpesa-stk-push` function;
  payments made straight to the till can be picked up automatically (`TILL-PAYMENTS-SETUP.md`).

## Customization

Starting products, staff and settings are `DEFAULT_INVENTORY`, `DEFAULT_STAFF` and
`DEFAULT_SETTINGS` near the top of `app.js`. They only apply the first time the app runs
against an empty database.
