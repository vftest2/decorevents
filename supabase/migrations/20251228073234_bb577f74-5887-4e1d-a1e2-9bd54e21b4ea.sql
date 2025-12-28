-- Tabela para armazenar contratos e status de assinatura
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  
  -- Dados do documento
  document_url TEXT,
  document_name TEXT NOT NULL,
  
  -- Dados ClickSign
  clicksign_document_key TEXT,
  clicksign_signer_key TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'signed', 'cancelled')),
  
  -- WhatsApp
  whatsapp_sent BOOLEAN DEFAULT false,
  whatsapp_sent_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  signed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view entity contracts"
ON public.contracts FOR SELECT
USING (entity_id = get_user_entity_id() OR is_super_admin());

CREATE POLICY "Users can insert entity contracts"
ON public.contracts FOR INSERT
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can update entity contracts"
ON public.contracts FOR UPDATE
USING (entity_id = get_user_entity_id())
WITH CHECK (entity_id = get_user_entity_id());

CREATE POLICY "Users can delete entity contracts"
ON public.contracts FOR DELETE
USING (entity_id = get_user_entity_id());

-- Trigger para updated_at
CREATE TRIGGER update_contracts_updated_at
BEFORE UPDATE ON public.contracts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Bucket para armazenar PDFs de contratos
INSERT INTO storage.buckets (id, name, public) VALUES ('contracts', 'contracts', false);

-- Policies para o bucket de contratos
CREATE POLICY "Users can upload contracts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can view contracts"
ON storage.objects FOR SELECT
USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete contracts"
ON storage.objects FOR DELETE
USING (bucket_id = 'contracts' AND auth.uid() IS NOT NULL);