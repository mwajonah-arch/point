import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifySession, CORS_HEADERS, jsonResponse } from '../_shared/session.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SESSION_SECRET = Deno.env.get('SESSION_SECRET')!

// Must match STORE_KEYS in app.js exactly. 'inventory' used to live here
// too, before it moved to its own table with atomic per-row updates (see
// adjust-stock and manage-inventory) — deliberately excluded now so
// nothing can accidentally write inventory back into this blob and
// reintroduce the whole-array overwrite race that caused the oversell bug.
const STORE_KEYS = ['sales', 'staff', 'settings', 'inventoryLog']
// Only an admin session may write these two — everyone else is limited to
// the day-to-day operational keys (inventory, sales, inventoryLog).
const ADMIN_ONLY_KEYS = ['staff', 'settings']

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { token, key, value } = await req.json()
    if (!STORE_KEYS.includes(key)) return jsonResponse({ error: 'Unknown data key.' }, 400)

    // First write ever for this key creates it — this is how a brand-new
    // pharmacy seeds its own defaults on first launch, before anyone has
    // logged in. It can only ever CREATE a missing row, never overwrite an
    // existing one, so it can't be used to reset real data later.
    const { error: insertError } = await supabase
      .from('kv_store')
      .insert({ key, value, updated_at: new Date().toISOString() })

    if (!insertError) return jsonResponse({ ok: true })
    if (insertError.code !== '23505') {
      console.error('save-kv insert error', insertError)
      return jsonResponse({ error: 'Could not save.' }, 500)
    }

    // The row already exists, so this is a real change to live data — it
    // needs a valid, unexpired session from here on.
    const session = await verifySession(token, SESSION_SECRET)
    if (!session) return jsonResponse({ error: 'Your session has expired. Please log in again.' }, 401)
    if (ADMIN_ONLY_KEYS.includes(key) && session.role !== 'admin') {
      return jsonResponse({ error: 'Only an admin can change this.' }, 403)
    }

    const { error: updateError } = await supabase
      .from('kv_store')
      .update({ value, updated_at: new Date().toISOString() })
      .eq('key', key)

    if (updateError) {
      console.error('save-kv update error', updateError)
      return jsonResponse({ error: 'Could not save.' }, 500)
    }
    return jsonResponse({ ok: true })
  } catch (e) {
    console.error('save-kv error', e)
    return jsonResponse({ error: 'Could not reach the server.' }, 500)
  }
})
