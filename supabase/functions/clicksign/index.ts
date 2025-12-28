import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLICKSIGN_API_KEY = Deno.env.get('CLICKSIGN_API_KEY');
const CLICKSIGN_BASE_URL = 'https://app.clicksign.com/api/v1';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    console.log(`ClickSign action: ${action}`, params);

    if (!CLICKSIGN_API_KEY) {
      throw new Error('CLICKSIGN_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    switch (action) {
      case 'upload_document': {
        // Upload document to ClickSign
        const { documentBase64, fileName, contractId, signerName, signerEmail, signerPhone } = params;

        if (!documentBase64 || !fileName || !contractId) {
          throw new Error('Missing required parameters: documentBase64, fileName, contractId');
        }

        console.log('Uploading document to ClickSign...');

        // 1. Create document in ClickSign
        const createDocResponse = await fetch(`${CLICKSIGN_BASE_URL}/documents?access_token=${CLICKSIGN_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            document: {
              path: `/${fileName}`,
              content_base64: documentBase64,
              deadline_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
              auto_close: true,
              locale: 'pt-BR',
              sequence_enabled: false
            }
          })
        });

        if (!createDocResponse.ok) {
          const errorText = await createDocResponse.text();
          console.error('ClickSign create document error:', errorText);
          throw new Error(`Failed to create document in ClickSign: ${errorText}`);
        }

        const docData = await createDocResponse.json();
        const documentKey = docData.document.key;
        console.log('Document created with key:', documentKey);

        // 2. Create signer
        // Format phone number to international format (+55...)
        let formattedPhone = signerPhone?.replace(/\D/g, '') || '';
        if (formattedPhone && !formattedPhone.startsWith('55')) {
          formattedPhone = '55' + formattedPhone;
        }
        formattedPhone = '+' + formattedPhone;
        
        console.log('Creating signer with phone:', formattedPhone, 'email:', signerEmail);
        
        const createSignerResponse = await fetch(`${CLICKSIGN_BASE_URL}/signers?access_token=${CLICKSIGN_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            signer: {
              name: signerName,
              email: signerEmail,
              phone_number: formattedPhone,
              auths: ['whatsapp'],
              communicate_by: 'whatsapp'
            }
          })
        });

        if (!createSignerResponse.ok) {
          const errorText = await createSignerResponse.text();
          console.error('ClickSign create signer error:', errorText);
          throw new Error(`Failed to create signer in ClickSign: ${errorText}`);
        }

        const signerData = await createSignerResponse.json();
        const signerKey = signerData.signer.key;
        console.log('Signer created with key:', signerKey);

        // 3. Add signer to document
        const addSignerResponse = await fetch(`${CLICKSIGN_BASE_URL}/lists?access_token=${CLICKSIGN_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            list: {
              document_key: documentKey,
              signer_key: signerKey,
              sign_as: 'sign',
              message: 'Por favor, assine o contrato do evento.'
            }
          })
        });

        if (!addSignerResponse.ok) {
          const errorText = await addSignerResponse.text();
          console.error('ClickSign add signer error:', errorText);
          throw new Error(`Failed to add signer to document: ${errorText}`);
        }

        console.log('Signer added to document');

        // 4. Send notification via WhatsApp
        const notifyResponse = await fetch(`${CLICKSIGN_BASE_URL}/notifications?access_token=${CLICKSIGN_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            request_signature_key: (await addSignerResponse.json()).list.request_signature_key,
            message: 'Você recebeu um contrato para assinatura. Clique no link para assinar.',
          })
        });

        if (!notifyResponse.ok) {
          console.warn('WhatsApp notification might have failed, but continuing...');
        }

        // 5. Update contract in database
        const { error: updateError } = await supabase
          .from('contracts')
          .update({
            clicksign_document_key: documentKey,
            clicksign_signer_key: signerKey,
            status: 'sent',
            whatsapp_sent: true,
            whatsapp_sent_at: new Date().toISOString()
          })
          .eq('id', contractId);

        if (updateError) {
          console.error('Error updating contract:', updateError);
          throw new Error(`Failed to update contract: ${updateError.message}`);
        }

        console.log('Contract updated successfully');

        return new Response(JSON.stringify({
          success: true,
          documentKey,
          signerKey,
          message: 'Documento enviado para assinatura via WhatsApp'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'check_status': {
        // Check document signing status
        const { documentKey, contractId } = params;

        if (!documentKey) {
          throw new Error('Missing documentKey parameter');
        }

        const statusResponse = await fetch(`${CLICKSIGN_BASE_URL}/documents/${documentKey}?access_token=${CLICKSIGN_API_KEY}`);

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          throw new Error(`Failed to get document status: ${errorText}`);
        }

        const statusData = await statusResponse.json();
        const isSigned = statusData.document.status === 'closed';

        // Update contract if signed
        if (isSigned && contractId) {
          await supabase
            .from('contracts')
            .update({
              status: 'signed',
              signed_at: new Date().toISOString()
            })
            .eq('id', contractId);
        }

        return new Response(JSON.stringify({
          success: true,
          status: statusData.document.status,
          isSigned,
          document: statusData.document
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'download_signed': {
        // Download signed document
        const { documentKey } = params;

        if (!documentKey) {
          throw new Error('Missing documentKey parameter');
        }

        const downloadResponse = await fetch(`${CLICKSIGN_BASE_URL}/documents/${documentKey}/download?access_token=${CLICKSIGN_API_KEY}`);

        if (!downloadResponse.ok) {
          const errorText = await downloadResponse.text();
          throw new Error(`Failed to download document: ${errorText}`);
        }

        const downloadData = await downloadResponse.json();

        return new Response(JSON.stringify({
          success: true,
          downloadUrl: downloadData.url
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('ClickSign function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
