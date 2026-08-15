import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyPin, signSession, CORS_HEADERS, jsonResponse } from '../_shared/session.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SESSION_SECRET = Deno.env.get('SESSION_SECRET')!
const SESSION_HOURS = 12

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { pin, role } = await req.json()
    if (!pin || !role || !['staff', 'admin'].includes(role)) {
      return jsonResponse({ error: 'PIN and login type are required.' }, 400)
    }

    // The browser never sees the staff/PIN list — every candidate for this
    // login type is checked here, server-side, against its salted hash.
    const { data: candidates, error } = await supabase
      .from('staff_pins')
      .select('id, role, pin_salt, pin_hash')
      .eq('role', role)
      .eq('active', true)

    if (error) {
      console.error('staff-login lookup error', error)
      return jsonResponse({ error: 'Could not reach the login service.' }, 500)
    }

    for (const candidate of candidates ?? []) {
      const match = await verifyPin(pin, candidate.pin_salt, candidate.pin_hash)
      if (match) {
        const exp = Date.now() + SESSION_HOURS * 60 * 60 * 1000
        const token = await signSession({ sub: candidate.id, role: candidate.role, exp }, SESSION_SECRET)
        return jsonResponse({ user: { id: candidate.id, role: candidate.role }, token, expiresAt: exp })
      }
    }

    return jsonResponse({ error: 'Incorrect PIN for this login type.' }, 401)
  } catch (e) {
    console.error('staff-login error', e)
    return jsonResponse({ error: 'Could not reach the login service.' }, 500)
  }
})
