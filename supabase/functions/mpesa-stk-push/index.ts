import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Supabase client with service role key for backend operations
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// M-Pesa Daraja API credentials (should be stored as secrets in Supabase)
const MPESA_CONSUMER_KEY = Deno.env.get('MPESA_CONSUMER_KEY')!
const MPESA_CONSUMER_SECRET = Deno.env.get('MPESA_CONSUMER_SECRET')!
const MPESA_SHORTCODE = Deno.env.get('MPESA_SHORTCODE')! // Your Till Number or Paybill
const MPESA_PASSKEY = Deno.env.get('MPESA_PASSKEY')!
const MPESA_INITIATOR_NAME = Deno.env.get('MPESA_INITIATOR_NAME')! // For B2C, not used in STK
const MPESA_CALLBACK_URL = Deno.env.get('MPESA_CALLBACK_URL')! // Your callback endpoint

// Daraja API endpoints
const MPESA_AUTH_URL = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
// For production: 'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials'
const MPESA_STK_PUSH_URL = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest'
// For production: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest'

// Helper function to get access token from Daraja
async function getMpesaAccessToken(): Promise<string> {
  const auth = btoa(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`)

  const response = await fetch(MPESA_AUTH_URL, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to get M-Pesa access token: ${response.statusText}`)
  }

  const data = await response.json()
  return data.access_token
}

// Helper function to generate password for STK push
function generatePassword(timestamp: string): string {
  const dataToEncode = `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
  return btoa(dataToEncode)
}

// Helper function to format phone number for Kenyan format
function formatPhoneNumber(phone: string): string {
  // Remove any spaces, +, or -
  let cleaned = phone.replace(/[\s\+-]/g, '')

  // If starts with 0, convert to +254
  if (cleaned.startsWith('0')) {
    cleaned = '254' + cleaned.substring(1)
  }
  // If starts with +, remove +
  else if (cleaned.startsWith('+254')) {
    cleaned = cleaned.substring(1)
  }

  // Ensure it starts with 254
  if (!cleaned.startsWith('254')) {
    cleaned = '254' + cleaned
  }

  return cleaned
}

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

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = await req.json()

    // Validate required fields
    if (!phoneNumber || !amount) {
      return new Response(
        JSON.stringify({ error: 'Phone number and amount are required' }),
        { status: 400 }
      )
    }

    // Format phone number
    const formattedPhone = formatPhoneNumber(phoneNumber)

    // Get access token
    const accessToken = await getMpesaAccessToken()

    // Generate password and timestamp
    const timestamp = new Date().toISOString().replace(/[-T:.Z]/g, '').slice(0, -4)
    const password = generatePassword(timestamp)

    // Prepare STK push request
    const stkPayload = {
      BusinessShortCode: MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount), // Amount must be integer
      PartyA: formattedPhone, // Customer's phone number
      PartyB: MPESA_SHORTCODE, // Business short code
      PhoneNumber: formattedPhone, // Customer's phone number
      CallBackURL: MPESA_CALLBACK_URL,
      AccountReference: accountReference || 'MedipointPOS',
      TransactionDesc: transactionDesc || 'Payment for medicines',
    }

    // Make STK push request to Daraja
    const stkResponse = await fetch(MPESA_STK_PUSH_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stkPayload),
    })

    if (!stkResponse.ok) {
      const errorData = await stkResponse.json()
      return new Response(
        JSON.stringify({
          error: 'Failed to initiate STK push',
          details: errorData
        }),
        { status: stkResponse.status }
      )
    }

    const stkData = await stkResponse.json()

    // Check if the request was accepted by Daraja
    if (stkData.ResponseCode === '0') {
      // Request accepted, store as pending in mpesa_checkouts table
      const { error: insertError } = await supabase
        .from('mpesa_checkouts')
        .insert({
          checkout_request_id: stkData.CheckoutRequestID,
          merchant_request_id: stkData.MerchantRequestID,
          phone_number: formattedPhone,
          amount: Number(amount),
          account_relation: accountReference || 'MedipointPOS',
          transaction_description: transactionDesc || 'Payment for medicines',
          status: 'pending',
        })

      if (insertError) {
        console.error('Error inserting MPesa checkout:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to store checkout request', details: insertError.message }),
          { status: 500 }
        )
      }

      // Return the STK push response to the frontend
      return new Response(JSON.stringify(stkData), {
        headers: { 'Content-Type': 'application/json' },
      })
    } else {
      // Request not accepted by Daraja, store as failed
      const { error: insertError } = await supabase
        .from('mpesa_checkouts')
        .insert({
          checkout_request_id: stkData.CheckoutRequestID || `rejected_${Date.now()}`,
          merchant_request_id: stkData.MerchantRequestID || '',
          phone_number: formattedPhone,
          amount: Number(amount),
          account_relation: accountReference || 'MedipointPOS',
          transaction_description: transactionDesc || 'Payment for medicines',
          result_code: parseInt(stkData.ResponseCode),
          result_description: stkData.ResponseDescription,
          status: 'failed',
        })

      if (insertError) {
        console.error('Error inserting failed MPesa checkout:', insertError)
        return new Response(
          JSON.stringify({ error: 'Failed to store checkout request', details: insertError.message }),
          { status: 500 }
        )
      }

      // Return the error response from Daraja
      return new Response(JSON.stringify(stkData), {
        headers: { 'Content-Type': 'application/json' },
        status: 400, // Bad request since the initiation failed
      })
    }
  } catch (error) {
    console.error('M-Pesa STK push error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500 }
    )
  }
})