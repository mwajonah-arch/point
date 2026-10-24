// Receives the M-Pesa "payment received" SMS that your till phone gets, forwarded
// by an SMS-to-webhook app on that phone, and stores it so the POS can offer it
// at checkout. No Safaricom/Daraja account is involved.
//
// Deploy with Verify JWT OFF and set the secret TILL_PAYMENTS_KEY. The webhook
// URL must end in ?key=<that secret>; anything without it is rejected.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)
const SECRET = Deno.env.get('TILL_PAYMENTS_KEY') || ''

const reply = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } })

// Pulls code, amount and the payer's first name out of the SMS text. Returns
// null for anything that isn't a "money received" message (balance alerts,
// airtime, promos…). Phone numbers in the SMS are read past and never kept.
export function parsePaymentSms(text: string) {
  const t = String(text || '').replace(/\s+/g, ' ').trim()
  const code = (t.match(/^([A-Z0-9]{10})\s+Confirmed/i) || [])[1]
  if (!code) return null
  if (!/received/i.test(t)) return null // e.g. "paid to", "sent to", "withdraw"
  const amt = (t.match(/Ksh\.?\s?([\d,]+(?:\.\d{1,2})?)/i) || [])[1]
  const amount = amt ? Number(amt.replace(/,/g, '')) : NaN
  if (!(amount > 0)) return null
  const from = (t.match(/from\s+(.+?)\s+(?:\+?254|0)?\d{9}\b/i) || [])[1]
  const first = from ? from.trim().split(' ')[0] : ''
  const name = first ? first.charAt(0).toUpperCase() + first.slice(1).toLowerCase() : null
  return { trans_id: code.toUpperCase(), amount, payer_name: name }
}

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const url = new URL(req.url)
  if (!SECRET || url.searchParams.get('key') !== SECRET) {
    return reply({ error: 'Unauthorized' }, 401)
  }

  try {
    // SMS-forwarder apps differ: some send JSON, some form fields, and they
    // name the text field differently. Accept the common shapes.
    const ctype = req.headers.get('content-type') || ''
    let body: Record<string, unknown> = {}
    if (ctype.includes('application/json')) body = await req.json()
    else if (ctype.includes('form')) body = Object.fromEntries((await req.formData()).entries())
    else { try { body = JSON.parse(await req.text()) } catch (_) { body = {} } }

    const text = String(body.message ?? body.text ?? body.body ?? body.content ?? '')
    const sender = String(body.from ?? body.sender ?? body.address ?? '')

    // If the app tells us who sent it, only trust Safaricom's "MPESA" sender.
    if (sender && !/mpesa/i.test(sender)) return reply({ ok: true, ignored: 'other sender' })

    const parsed = parsePaymentSms(text)
    if (!parsed) {
      console.log('Ignored SMS that is not a payment-received message')
      return reply({ ok: true, ignored: 'not a payment' })
    }

    const { error } = await supabase.from('till_payments').upsert(
      { ...parsed, trans_time: new Date().toISOString() },
      { onConflict: 'trans_id', ignoreDuplicates: true },
    )
    if (error) { console.error('Could not store till payment', error); return reply({ error: 'store failed' }, 500) }
    return reply({ ok: true })
  } catch (e) {
    console.error('till-payments error', e)
    return reply({ error: 'bad request' }, 400)
  }
})
