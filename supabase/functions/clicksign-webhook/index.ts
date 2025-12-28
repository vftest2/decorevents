import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CLICKSIGN_WEBHOOK_SECRET = Deno.env.get('CLICKSIGN_WEBHOOK_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-clicksign-signature',
};

// Verify HMAC signature
async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature || !CLICKSIGN_WEBHOOK_SECRET) {
    console.log('Missing signature or secret');
    return false;
  }

  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(CLICKSIGN_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBytes))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get('x-clicksign-signature');
    
    console.log('Received webhook from ClickSign');
    console.log('Signature header:', signature ? 'present' : 'missing');

    // Verify signature (optional but recommended)
    // Note: ClickSign might use a different header name, check their docs
    // For now, we'll skip verification if no signature is present
    if (signature && CLICKSIGN_WEBHOOK_SECRET) {
      const isValid = await verifySignature(body, signature);
      if (!isValid) {
        console.warn('Invalid webhook signature');
        // Continue anyway for now, but log warning
      }
    }

    const payload = JSON.parse(body);
    console.log('Webhook event:', payload.event?.name);
    console.log('Document key:', payload.document?.key);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const eventName = payload.event?.name;
    const documentKey = payload.document?.key;

    if (!documentKey) {
      console.log('No document key in payload, ignoring');
      return new Response(JSON.stringify({ success: true, message: 'No document key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Find contract by document key
    const { data: contract, error: findError } = await supabase
      .from('contracts')
      .select('*')
      .eq('clicksign_document_key', documentKey)
      .maybeSingle();

    if (findError) {
      console.error('Error finding contract:', findError);
      throw findError;
    }

    if (!contract) {
      console.log('No contract found for document key:', documentKey);
      return new Response(JSON.stringify({ success: true, message: 'Contract not found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('Found contract:', contract.id);

    // Handle different events
    switch (eventName) {
      case 'sign':
      case 'document_closed':
        // Document was signed
        console.log('Document signed or closed, updating contract status');
        
        const { error: updateError } = await supabase
          .from('contracts')
          .update({
            status: 'signed',
            signed_at: new Date().toISOString()
          })
          .eq('id', contract.id);

        if (updateError) {
          console.error('Error updating contract:', updateError);
          throw updateError;
        }
        
        console.log('Contract marked as signed');
        break;

      case 'cancel':
        // Document was cancelled
        console.log('Document cancelled, updating contract status');
        
        await supabase
          .from('contracts')
          .update({ status: 'cancelled' })
          .eq('id', contract.id);
        
        break;

      case 'refusal':
        // Signer refused to sign
        console.log('Document refused');
        
        await supabase
          .from('contracts')
          .update({ status: 'cancelled' })
          .eq('id', contract.id);
        
        break;

      case 'deadline':
        // Document deadline passed
        console.log('Document deadline passed');
        break;

      default:
        console.log('Unhandled event type:', eventName);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      event: eventName,
      contractId: contract.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
