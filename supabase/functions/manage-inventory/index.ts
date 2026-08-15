import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifySession, CORS_HEADERS, jsonResponse } from '../_shared/session.ts'

const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const SESSION_SECRET = Deno.env.get('SESSION_SECRET')!

// Admin-side product management (add/edit/delete, price/reorder/expiry
// changes) — as opposed to adjust-stock, which only handles checkout-time
// stock decrements. Kept separate because these two things have very
// different concurrency needs: this is a normal single-writer row
// upsert/delete, while adjust-stock specifically has to survive multiple
// tills hitting the same row at once. Same admin-only gate save-kv already
// used for the 'staff' and 'settings' keys.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  try {
    const { token, action, product, id } = await req.json()

    const session = await verifySession(token, SESSION_SECRET)
    if (!session) return jsonResponse({ error: 'Your session has expired. Please log in again.' }, 401)
    if (session.role !== 'admin') return jsonResponse({ error: 'Only an admin can change inventory.' }, 403)

    if (action === 'upsert') {
      if (!product || !product.id || !product.name) {
        return jsonResponse({ error: 'Missing required product fields.' }, 400)
      }
      const { error } = await supabase.from('inventory').upsert({
        id: product.id,
        name: product.name,
        category: product.category || '',
        sku: product.sku || '',
        price: Number(product.price) || 0,
        stock: Math.max(0, Number(product.stock) || 0),
        reorder_level: Number(product.reorderLevel) || 0,
        expiry: product.expiry || null,
        requires_rx: Boolean(product.requiresRx),
        updated_at: new Date().toISOString(),
      })
      if (error) {
        console.error('manage-inventory upsert error', error)
        return jsonResponse({ error: 'Could not save the product.' }, 500)
      }
      return jsonResponse({ ok: true })
    }

    if (action === 'delete') {
      if (!id) return jsonResponse({ error: 'Missing product id.' }, 400)
      const { error } = await supabase.from('inventory').delete().eq('id', id)
      if (error) {
        console.error('manage-inventory delete error', error)
        return jsonResponse({ error: 'Could not delete the product.' }, 500)
      }
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: 'Unknown action.' }, 400)
  } catch (e) {
    console.error('manage-inventory error', e)
    return jsonResponse({ error: 'Could not reach the server.' }, 500)
  }
})
