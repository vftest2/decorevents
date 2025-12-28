import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CLICKSIGN_API_KEY = Deno.env.get('CLICKSIGN_API_KEY');
const CLICKSIGN_BASE_URL = 'https://app.clicksign.com/api/v3';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Helper to ensure phone number is in correct format for ClickSign (DDD + number)
// IMPORTANT: ClickSign expects ONLY DDD+number. Do NOT prefix country code (55), otherwise it becomes the DDD.
function formatPhoneNumber(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, '');

  // If a country code was provided (55), strip it.
  if (digits.startsWith('55') && digits.length > 11) {
    digits = digits.slice(2);
  }

  console.log(`Phone normalized: ${phone} -> ${digits}`);
  return digits;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    console.log(`ClickSign API v3 action: ${action}`, params);

    if (!CLICKSIGN_API_KEY) {
      throw new Error('CLICKSIGN_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    switch (action) {
      // =====================================================
      // FLUXO DE ENVELOPE (Documentos com Assinatura)
      // =====================================================
      case 'upload_document': {
        const { documentBase64, fileName, contractId, signerName, signerEmail, signerPhone } = params;

        if (!documentBase64 || !fileName || !contractId) {
          throw new Error('Missing required parameters: documentBase64, fileName, contractId');
        }

        console.log('Creating envelope in ClickSign API v3...');

        // 1. Criar envelope
        const createEnvelopeResponse = await fetch(`${CLICKSIGN_BASE_URL}/envelopes`, {
          method: 'POST',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              type: 'envelopes',
              attributes: {
                name: fileName.replace('.pdf', '')
              }
            }
          })
        });

        if (!createEnvelopeResponse.ok) {
          const errorText = await createEnvelopeResponse.text();
          console.error('ClickSign create envelope error:', errorText);
          throw new Error(`Failed to create envelope: ${errorText}`);
        }

        const envelopeData = await createEnvelopeResponse.json();
        const envelopeId = envelopeData.data.id;
        console.log('Envelope created with id:', envelopeId);

        // 2. Adicionar documento ao envelope
        console.log('Adding document to envelope...');
        const addDocumentResponse = await fetch(`${CLICKSIGN_BASE_URL}/envelopes/${envelopeId}/documents`, {
          method: 'POST',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              type: 'documents',
              attributes: {
                filename: fileName,
                content_base64: documentBase64
              }
            }
          })
        });

        if (!addDocumentResponse.ok) {
          const errorText = await addDocumentResponse.text();
          console.error('ClickSign add document error:', errorText);
          throw new Error(`Failed to add document: ${errorText}`);
        }

        const documentData = await addDocumentResponse.json();
        const documentId = documentData.data.id;
        console.log('Document added with id:', documentId);

        // 3. Adicionar signatário ao envelope
        console.log('Adding signer to envelope...');
        const addSignerResponse = await fetch(`${CLICKSIGN_BASE_URL}/envelopes/${envelopeId}/signers`, {
          method: 'POST',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              type: 'signers',
              attributes: {
                name: signerName,
                email: signerEmail
              }
            }
          })
        });

        if (!addSignerResponse.ok) {
          const errorText = await addSignerResponse.text();
          console.error('ClickSign add signer error:', errorText);
          throw new Error(`Failed to add signer: ${errorText}`);
        }

        const signerData = await addSignerResponse.json();
        const signerId = signerData.data.id;
        console.log('Signer added with id:', signerId);

        // 4. Configurar requisitos de assinatura
        console.log('Configuring signature requirements...');
        
        // Requisito de ação: assinar
        const requirementAgreeResponse = await fetch(`${CLICKSIGN_BASE_URL}/envelopes/${envelopeId}/requirements`, {
          method: 'POST',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              type: 'requirements',
              attributes: {
                action: 'agree',
                role: 'sign'
              },
              relationships: {
                document: {
                  data: { type: 'documents', id: documentId }
                },
                signer: {
                  data: { type: 'signers', id: signerId }
                }
              }
            }
          })
        });

        if (!requirementAgreeResponse.ok) {
          const errorText = await requirementAgreeResponse.text();
          console.error('ClickSign requirement agree error:', errorText);
          throw new Error(`Failed to add agree requirement: ${errorText}`);
        }

        // Requisito de evidência: email
        const requirementEvidenceResponse = await fetch(`${CLICKSIGN_BASE_URL}/envelopes/${envelopeId}/requirements`, {
          method: 'POST',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              type: 'requirements',
              attributes: {
                action: 'provide_evidence',
                auth: 'email'
              },
              relationships: {
                document: {
                  data: { type: 'documents', id: documentId }
                },
                signer: {
                  data: { type: 'signers', id: signerId }
                }
              }
            }
          })
        });

        if (!requirementEvidenceResponse.ok) {
          const errorText = await requirementEvidenceResponse.text();
          console.error('ClickSign requirement evidence error:', errorText);
          throw new Error(`Failed to add evidence requirement: ${errorText}`);
        }

        console.log('Requirements configured');

        // 5. Ativar o envelope (status: running)
        console.log('Activating envelope...');
        const activateEnvelopeResponse = await fetch(`${CLICKSIGN_BASE_URL}/envelopes/${envelopeId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              id: envelopeId,
              type: 'envelopes',
              attributes: {
                status: 'running'
              }
            }
          })
        });

        if (!activateEnvelopeResponse.ok) {
          const errorText = await activateEnvelopeResponse.text();
          console.error('ClickSign activate envelope error:', errorText);
          throw new Error(`Failed to activate envelope: ${errorText}`);
        }

        console.log('Envelope activated');

        // 6. Disparar notificação por email
        console.log('Sending email notification...');
        const notifyResponse = await fetch(`${CLICKSIGN_BASE_URL}/envelopes/${envelopeId}/notifications`, {
          method: 'POST',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              type: 'notifications',
              attributes: {}
            }
          })
        });

        if (!notifyResponse.ok) {
          console.warn('Email notification might have failed, but envelope is active');
        } else {
          console.log('Email notification sent');
        }

        // 7. Atualizar contrato no banco de dados
        const { error: updateError } = await supabase
          .from('contracts')
          .update({
            clicksign_document_key: envelopeId,
            clicksign_signer_key: signerId,
            status: 'sent'
          })
          .eq('id', contractId);

        if (updateError) {
          console.error('Error updating contract:', updateError);
          throw new Error(`Failed to update contract: ${updateError.message}`);
        }

        console.log('Contract updated successfully');

        return new Response(JSON.stringify({
          success: true,
          envelopeId,
          documentId,
          signerId,
          message: 'Documento enviado para assinatura via ClickSign (API v3)'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // =====================================================
      // FLUXO DE ACEITE VIA WHATSAPP (Sem documento PDF)
      // =====================================================
      case 'create_whatsapp_acceptance': {
        const { contractId, signerName, signerPhone, title, message: acceptanceMessage } = params;

        if (!signerName || !signerPhone || !title || !acceptanceMessage) {
          throw new Error('Missing required parameters: signerName, signerPhone, title, message');
        }

        const formattedPhone = formatPhoneNumber(signerPhone);
        console.log('Creating WhatsApp acceptance term...', { signerName, formattedPhone });

        const createAcceptanceResponse = await fetch(`${CLICKSIGN_BASE_URL}/acceptance_term/whatsapps`, {
          method: 'POST',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              type: 'acceptance_term_whatsapps',
              attributes: {
                title: title,
                sender_name_option: 'account_name',
                message: acceptanceMessage,
                signer_phone: formattedPhone,
                signer_name: signerName
              }
            }
          })
        });

        if (!createAcceptanceResponse.ok) {
          const errorText = await createAcceptanceResponse.text();
          console.error('ClickSign create WhatsApp acceptance error:', errorText);
          throw new Error(`Failed to create WhatsApp acceptance: ${errorText}`);
        }

        const acceptanceData = await createAcceptanceResponse.json();
        const acceptanceId = acceptanceData.data.id;
        const acceptanceStatus = acceptanceData.data.attributes.status;
        console.log('WhatsApp acceptance created:', { acceptanceId, status: acceptanceStatus });

        // Atualizar contrato se fornecido
        if (contractId) {
          const { error: updateError } = await supabase
            .from('contracts')
            .update({
              clicksign_document_key: acceptanceId,
              status: 'sent',
              whatsapp_sent: true,
              whatsapp_sent_at: new Date().toISOString()
            })
            .eq('id', contractId);

          if (updateError) {
            console.error('Error updating contract:', updateError);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          acceptanceId,
          status: acceptanceStatus,
          message: 'Aceite enviado via WhatsApp'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'check_whatsapp_acceptance': {
        const { acceptanceId } = params;

        if (!acceptanceId) {
          throw new Error('Missing acceptanceId parameter');
        }

        const statusResponse = await fetch(`${CLICKSIGN_BASE_URL}/acceptance_term/whatsapps/${acceptanceId}`, {
          method: 'GET',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          }
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          throw new Error(`Failed to get acceptance status: ${errorText}`);
        }

        const statusData = await statusResponse.json();
        const status = statusData.data.attributes.status;

        return new Response(JSON.stringify({
          success: true,
          acceptanceId,
          status,
          data: statusData.data.attributes
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'cancel_whatsapp_acceptance': {
        const { acceptanceId } = params;

        if (!acceptanceId) {
          throw new Error('Missing acceptanceId parameter');
        }

        const cancelResponse = await fetch(`${CLICKSIGN_BASE_URL}/acceptance_term/whatsapps/${acceptanceId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          },
          body: JSON.stringify({
            data: {
              id: acceptanceId,
              type: 'acceptance_term_whatsapps',
              attributes: {
                status: 'canceled'
              }
            }
          })
        });

        if (!cancelResponse.ok) {
          const errorText = await cancelResponse.text();
          throw new Error(`Failed to cancel acceptance: ${errorText}`);
        }

        const cancelData = await cancelResponse.json();

        return new Response(JSON.stringify({
          success: true,
          acceptanceId,
          status: 'canceled',
          message: 'Aceite cancelado com sucesso'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // =====================================================
      // VERIFICAR STATUS DO ENVELOPE
      // =====================================================
      case 'check_status': {
        const { documentKey, contractId } = params;

        if (!documentKey) {
          throw new Error('Missing documentKey parameter');
        }

        // API v3: buscar envelope por ID
        const statusResponse = await fetch(`${CLICKSIGN_BASE_URL}/envelopes/${documentKey}`, {
          method: 'GET',
          headers: {
            'Authorization': CLICKSIGN_API_KEY,
            'Content-Type': 'application/vnd.api+json',
            'Accept': 'application/vnd.api+json'
          }
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          throw new Error(`Failed to get envelope status: ${errorText}`);
        }

        const statusData = await statusResponse.json();
        const envelopeStatus = statusData.data.attributes.status;
        const isSigned = envelopeStatus === 'finished';

        // Atualizar contrato se assinado
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
          status: envelopeStatus,
          isSigned,
          envelope: statusData.data.attributes
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
