import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // Daraja only sends POST requests to the callback URL
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    // Parse the callback data from Daraja
    const callbackData = await req.json()
    console.log('Received M-Pesa callback:', JSON.stringify(callbackData, null, 2))

    // Extract relevant information from the callback
    const {
      MerchantRequestID,
      CheckoutRequestID,
      ResultCode,
      ResultDesc,
      Amount,
      MpesaReceiptNumber,
      Balance,
      TransactionDate,
      PhoneNumber
    } = callbackData.Body.stkCallback

    // Determine payment status based on ResultCode
    // 0 means success, anything else is failure
    const isSuccessful = ResultCode === 0
    const status = isSuccessful ? 'completed' : 'failed'

    // Update our stored checkout record with the result
    const checkoutKey = `mpesa_checkout_${CheckoutRequestID}`
    const { data: checkoutData, error: fetchError } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', checkoutKey)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error fetching checkout data:', fetchError)
      // Still acknowledge the callback to Daraja to prevent retries
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Prepare update data
    const updateData = {
      ...(checkoutData?.value || {}),
      resultCode: ResultCode,
      resultDesc: ResultDesc,
      amount: Amount,
      mpesaReceiptNumber: MpesaReceiptNumber,
      balance: Balance,
      transactionDate: TransactionDate,
      phoneNumber: PhoneNumber,
      status: status,
      completedAt: new Date().toISOString()
    }

    // Update the record in our database
    const { error: updateError } = await supabase
      .from('kv_store')
      .upsert({
        key: checkoutKey,
        value: updateData,
        updated_at: new Date().toISOString()
      })

    if (updateError) {
      console.error('Error updating checkout data:', updateError)
      // Still acknowledge the callback to Daraja
      return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // If payment was successful, we might want to create a sale record
    // This would typically be done by your frontend or another process
    // For now, we just update the status

    // Acknowledge receipt of callback to Daraja
    // This is important to prevent Daraja from retrying the callback
    return new Response(JSON.stringify({ ResultCode: 0, ResultDesc: 'Accepted' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error processing M-Pesa callback:', error)
    // Even if we have an error, we should acknowledge to prevent retries
    // unless it's a fundamental issue we can't recover from
    return new Response(JSON.stringify({ ResultCode: 1, ResultDesc: 'Error processing callback' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})