import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyPin, hashPin, CORS_HEADERS, jsonResponse } from '../_shared/session.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const PIN_RE = /^\d{4}$/

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { adminPin, action, staffId, pin, role } = await req.json()

    const { data: admins, error: adminErr } = await supabase
      .from('staff_pins')
      .select('id, pin_salt, pin_hash')
      .eq('role', 'admin')
      .eq('active', true)

    if (adminErr) {
      console.error('staff-admin lookup error', adminErr)
      return jsonResponse({ error: 'Could not reach the server.' }, 500)
    }

    const activeAdmins = admins ?? []

    // One-time bootstrap: the very first admin account can be created with
    // no existing admin PIN to check against, since none exists yet. The
    // moment one active admin row exists, this path is closed for good.
    const bootstrapping = activeAdmins.length === 0 && action === 'set' && role === 'admin'

    let authorized = bootstrapping
    if (!authorized) {
      if (!adminPin) return jsonResponse({ error: 'Enter your admin PIN above to make staff changes.' }, 401)
      for (const admin of activeAdmins) {
        if (await verifyPin(adminPin, admin.pin_salt, admin.pin_hash)) {
          authorized = true
          break
        }
      }
    }
    if (!authorized) return jsonResponse({ error: 'Incorrect admin PIN.' }, 401)

    if (action === 'set') {
      if (!staffId || !pin || !PIN_RE.test(pin) || !['staff', 'admin'].includes(role)) {
        return jsonResponse({ error: 'Missing or invalid fields.' }, 400)
      }
      const { salt, hash } = await hashPin(pin)
      const { error } = await supabase.from('staff_pins').upsert({
        id: staffId,
        role,
        pin_salt: salt,
        pin_hash: hash,
        active: true,
        updated_at: new Date().toISOString(),
      })
      if (error) {
        console.error('staff-admin set error', error)
        return jsonResponse({ error: 'Could not save.' }, 500)
      }
      return jsonResponse({ ok: true })
    }

    if (action === 'delete') {
      if (!staffId) return jsonResponse({ error: 'Missing staff id.' }, 400)
      const { error } = await supabase
        .from('staff_pins')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', staffId)
      if (error) {
        console.error('staff-admin delete error', error)
        return jsonResponse({ error: 'Could not remove.' }, 500)
      }
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'Unknown action.' }, 400)
  } catch (e) {
    console.error('staff-admin error', e)
    return jsonResponse({ error: 'Could not reach the server.' }, 500)
  }
})
