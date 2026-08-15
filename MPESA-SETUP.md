# Setting up M-Pesa payments (Till / Buy Goods)

This lets a cashier pick "M-Pesa" at checkout, enter the customer's phone
number, and have Safaricom pop up a payment prompt on the customer's phone.
The sale completes automatically the moment they enter their M-Pesa PIN.

It needs two small pieces of server-side code ("Edge Functions") because
your Safaricom credentials must never be visible in the browser. Supabase
hosts these for you — no separate server to run, and you can paste the code
straight into Supabase's dashboard (no command line needed).

## Part 1 — Get your Safaricom Daraja credentials

1. Go to [developer.safaricom.co.ke](https://developer.safaricom.co.ke) and create an account / log in.
2. Create a new app (My Apps → Add a new App). Select the **Lipa Na M-Pesa Online** (STK Push) product.
3. This gives you a **Consumer Key** and **Consumer Secret** — copy both.
4. For a **Till Number (Buy Goods)** in production, you'll also need a **Passkey**. Safaricom issues this once your till is registered for Lipa Na M-Pesa Online — this typically comes through your bank / Safaricom business relationship manager, or the Daraja "Go Live" process. For testing first, Safaricom's sandbox provides a test shortcode + passkey you can use immediately (see their sandbox docs / test credentials page) before switching to your real till.

You should end up with five values:
- `MPESA_CONSUMER_KEY`
- `MPESA_CONSUMER_SECRET`
- `MPESA_SHORTCODE` — your Till Number
- `MPESA_PASSKEY`
- `MPESA_ENV` — `sandbox` while testing, `production` once you go live

## Part 2 — Create the transactions table

1. Supabase dashboard → **SQL Editor** → New query.
2. Paste in `mpesa-setup.sql` (included in this folder) and click **Run**.

## Part 3 — Deploy the two Edge Functions

1. Supabase dashboard → **Edge Functions** (left sidebar) → **Deploy a new function**.
2. Name it exactly `mpesa-stk-push`. Paste in the contents of `supabase-functions/mpesa-stk-push/index.ts`. Leave **Verify JWT** turned **ON** (default) — this one is only ever called by your app.
3. Deploy a second function named exactly `mpesa-callback`. Paste in `supabase-functions/mpesa-callback/index.ts`. This time, turn **Verify JWT OFF** — Safaricom calls this directly and won't send a Supabase login token.
4. After deploying `mpesa-callback`, copy its public URL (Supabase shows it on the function's page — looks like `https://xxxx.supabase.co/functions/v1/mpesa-callback`). You'll need this next.

## Part 4 — Add your secrets

1. Supabase dashboard → **Edge Functions → Manage secrets** (or **Project Settings → Edge Functions**).
2. Add each of these as a secret:
   - `MPESA_CONSUMER_KEY`
   - `MPESA_CONSUMER_SECRET`
   - `MPESA_SHORTCODE`
   - `MPESA_PASSKEY`
   - `MPESA_ENV` (`sandbox` or `production`)
   - `MPESA_CALLBACK_URL` — the `mpesa-callback` URL from Part 3, step 4

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already available to your functions automatically — you don't need to set those.)

## Part 5 — Test it

1. Open your app, ring up a sale, choose **M-Pesa**, enter a phone number, tap **Send payment request**.
2. In sandbox mode, use Safaricom's official test phone number (see their sandbox docs) — real phones don't receive prompts from sandbox credentials.
3. Once you're happy, switch `MPESA_ENV` to `production` and use your real till credentials — real customer phones will now receive the prompt.

## If a payment request fails

- **"M-Pesa is not fully configured on the server yet"** — one of the five secrets in Part 4 is missing or misspelled. Check the exact names.
- **"Could not authenticate with Safaricom"** — your Consumer Key/Secret are wrong, or you're mixing sandbox credentials with `MPESA_ENV=production` (or vice versa).
- **The prompt never arrives on the phone** — double-check the phone number format (should end up as `2547XXXXXXXX` internally; typing `07XXXXXXXX` or `+254...` both work), and that `MPESA_SHORTCODE`/`MPESA_PASSKEY` match your actual till's Lipa Na M-Pesa Online setup.
- **Stuck on "waiting" even after the customer pays** — check that `MPESA_CALLBACK_URL` is exactly your `mpesa-callback` function's URL, and that its **Verify JWT** setting is OFF, otherwise Safaricom's callback gets silently rejected.
