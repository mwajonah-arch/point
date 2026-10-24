# Auto-detecting payments made straight to your till (no Daraja)

Your till phone already gets an M-Pesa SMS for every payment. An SMS-forwarding
app on that phone sends each message to your Supabase project, which reads the
code and amount. At checkout, the payment appears in a list and the cashier
taps it. No Safaricom developer account is needed.

## 1. Create the table
Supabase → SQL Editor → paste `mpesa-c2b-setup.sql` → Run.

## 2. Deploy the function
Supabase → Edge Functions → new function named `till-payments`, paste
`index.ts`, and turn **Verify JWT OFF**.

Add a secret `TILL_PAYMENTS_KEY` with a long random value (30+ characters).

Your webhook URL is:
`https://<project>.supabase.co/functions/v1/till-payments?key=<TILL_PAYMENTS_KEY>`

## 3. Set up the forwarding phone
Use the Android phone that has the till's SIM (or whichever phone receives the
till's M-Pesa SMS). Install any app that forwards incoming SMS to a web address
(search the Play Store for "SMS to webhook" / "SMS forwarder"; SMSSync and
Tasker both work). Set it to:
- POST to the webhook URL above
- only forward messages from `MPESA`
- keep it allowed to run in the background (turn off battery optimisation for it)

The function accepts JSON or form posts and the usual field names (`message`,
`text`, `body`, `from`, `sender`).

## 4. Test it
Send a small real payment to the till (even Ksh 10). Within seconds a row
should appear in the `till_payments` table, and the payment should show up in
checkout → M-Pesa → "They paid the till".

If nothing appears: check the function's logs in Supabase. "Ignored SMS" means
the message wording wasn't recognised. The reader expects the usual form
`CODE Confirmed. … Ksh… received from NAME …`. Send me one real message
(blank out the phone number) and I'll adjust it.

## Limits to know about
- **Phone dependency:** if the phone is off, offline, or the app is killed, no
  payments arrive. The cashier can still type the code. Check it's working
  with a small test payment each morning.
- **SMS can be delayed** by the network. The list simply fills in late.
- **Only SMS content is trusted.** Anyone who gets the webhook key could post
  fake payments, so keep it private and change it if it leaks. Typed codes are
  still best checked against the till's M-Pesa statement now and then.
- Phone numbers are never stored: only the code, amount, first name and time.
- A payment already used on a sale is hidden from the list and can't be reused.
