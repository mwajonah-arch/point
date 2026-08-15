import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    // Accept either key so old callers/tests don't break.
    const productName = body.drugName || body.productName

    if (!productName) {
      return new Response(
        JSON.stringify({ error: 'Product name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY')
    if (!GEMINI_API_KEY) {
      throw new Error('AI drug lookup is not configured yet (missing GEMINI_API_KEY)')
    }

    const prompt = `You are a reference tool for pharmacy/retail staff. For the product "${productName}", return ONLY a JSON object (no markdown, no code fences) with exactly these keys:
{
  "drugClass": "pharmacological/therapeutic class, concise",
  "dosage": "typical dosage, concise",
  "sideEffects": "common side effects, concise",
  "contraindications": "conditions or situations where this should NOT be used, concise",
  "interactions": "notable interactions, concise",
  "considerations": "other considerations, concise",
  "notARealDrug": false
}
If "${productName}" does not look like a real pharmaceutical product, set "notARealDrug" to true and fill the other fields with whatever general information is findable (or "Not applicable" if none). Keep each field to 1-3 short sentences. Return raw JSON only.`

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: 'application/json' },
          safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
          ],
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Gemini API error:', errorText)
      throw new Error('Could not reach the AI lookup service')
    }

    const data = await response.json()

    // Surface *why* nothing came back instead of a generic message —
    // this is the difference between "safety filter blocked it" and
    // "actually broken", which need different fixes.
    if (data.promptFeedback?.blockReason) {
      console.error('Gemini blocked the prompt:', JSON.stringify(data.promptFeedback))
      throw new Error(
        `AI declined to generate a reference for "${productName}" (safety filter: ${data.promptFeedback.blockReason}). Please use the package insert or ask the pharmacist-in-charge.`
      )
    }

    const candidate = data.candidates?.[0]
    if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
      console.error('Gemini candidate not complete:', JSON.stringify(candidate))
      throw new Error(
        `AI could not complete a reference for "${productName}" (reason: ${candidate.finishReason}). Please use the package insert or ask the pharmacist-in-charge.`
      )
    }

    const rawText = candidate?.content?.parts?.[0]?.text

    if (!rawText) {
      console.error('Unexpected Gemini response shape:', JSON.stringify(data))
      throw new Error('No reference information generated.')
    }

    let parsed
    try {
      parsed = JSON.parse(rawText)
    } catch {
      // Fallback if Gemini ever ignores responseMimeType and wraps in prose/fences.
      const match = rawText.match(/\{[\s\S]*\}/)
      parsed = match ? JSON.parse(match[0]) : null
    }

    if (!parsed) {
      throw new Error('Could not parse AI response.')
    }

    return new Response(
      JSON.stringify({
        drugClass: parsed.drugClass || 'Not available.',
        dosage: parsed.dosage || 'Not available.',
        sideEffects: parsed.sideEffects || 'Not available.',
        contraindications: parsed.contraindications || 'Not available.',
        interactions: parsed.interactions || 'Not available.',
        considerations: parsed.considerations || 'Not available.',
        notARealDrug: Boolean(parsed.notARealDrug),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in drug-info function:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
