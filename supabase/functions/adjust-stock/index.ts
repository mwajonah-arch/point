import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifySession, CORS_HEADERS, jsonResponse } from '../_shared/session.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SESSION_SECRET = Deno.env.get('SESSION_SECRET')!

// Called at checkout to decrement stock. Unlike save-kv (which overwrites
// the whole inventory list and lets two concurrent writes clobber each
// other), this updates one product row at a time with a guard clause —
// `stock >= qty` — right in the SQL. If two cashiers try to sell the last
// unit of the same product at the same moment, the database itself only
// lets one of those updates succeed; the second comes back as a clean
// per-item failure instead of silently oversold or lost stock.
// Called both at checkout (direction: 'decrement', guarded against
// overselling) and when a sale is voided (direction: 'increment', to
// restock what it sold — no guard needed, adding stock back can never be
// invalid). Two different Postgres functions back these, but one endpoint
// keeps the client-side retry/offline-queue logic in one place.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { token, items, direction } = await req.json()
    if (!Array.isArray(items) || items.length === 0) {
      return jsonResponse({ error: 'No items to adjust.' }, 400)
    }
    const rpcName = direction === 'increment' ? 'increment_stock' : 'decrement_stock'

    const session = await verifySession(token, SESSION_SECRET)
    if (!session) return jsonResponse({ error: 'Your session has expired. Please log in again.' }, 401)

    const results = []
    for (const { id, qty } of items) {
      const decrement = Number(qty)
      if (!id || !Number.isFinite(decrement) || decrement <= 0) {
        results.push({ id, ok: false, reason: 'Invalid item.' })
        continue
      }

      // Guarded, atomic decrement — this single statement is what
      // actually prevents the oversell: the WHERE clause means the row
      // only updates if there's still enough stock, checked and applied
      // by Postgres in one step, not read-then-write from the client.
      const { data, error } = await supabase.rpc(rpcName, {
        p_id: id,
        p_qty: decrement,
      })

      if (error) {
        console.error('adjust-stock rpc error', id, error)
        results.push({ id, ok: false, reason: 'Could not update stock.' })
      } else if (!data || data.length === 0) {
        // Row didn't match the guard — either not enough stock left, or
        // the product doesn't exist. Either way, nothing was changed.
        results.push({ id, ok: false, reason: 'Not enough stock available.' })
      } else {
        results.push({ id, ok: true, newStock: data[0].stock })
      }
    }

    const anyFailed = results.some((r) => !r.ok)
    return jsonResponse(
      anyFailed
        ? { ok: false, error: 'One or more items are no longer available in the quantity shown. Please refresh and try again.', results }
        : { ok: true, results },
      anyFailed ? 409 : 200
    )
  } catch (e) {
    console.error('adjust-stock error', e)
    return jsonResponse({ error: 'Could not reach the server.' }, 500)
  }
})
