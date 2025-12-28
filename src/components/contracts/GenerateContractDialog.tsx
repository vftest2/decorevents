import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { formatPhoneToInternational, isValidBrazilianPhone } from '@/lib/utils';
import { FileText, Send, Loader2, CheckCircle, MessageCircle } from 'lucide-react';

interface GenerateContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    entityId: string;
    clientId?: string;
    clientName?: string;
    clientEmail?: string;
    clientPhone?: string;
    totalValue?: number;
    startDate?: string;
    address?: string;
  };
  onContractSent?: () => void;
}

export function GenerateContractDialog({
  open,
  onOpenChange,
  event,
  onContractSent
}: GenerateContractDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'form' | 'sending' | 'success'>('form');
  const [signerName, setSignerName] = useState(event.clientName || '');
  const [signerPhone, setSignerPhone] = useState(event.clientPhone || '');
  const [title, setTitle] = useState(`Contrato - ${event.title}`);
  const [message, setMessage] = useState(
    `Eu, ${event.clientName || '[Nome do Cliente]'}, declaro que concordo com os termos do contrato para o evento "${event.title}"${event.totalValue ? `, no valor total de R$ ${event.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}${event.startDate ? `, com data prevista para ${new Date(event.startDate).toLocaleDateString('pt-BR')}` : ''}${event.address ? `, no local: ${event.address}` : ''}.`
  );

  const handleSendWhatsApp = async () => {
    if (!signerName || !signerPhone || !title || !message) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos para enviar o aceite.',
        variant: 'destructive'
      });
      return;
    }

    const formattedPhone = formatPhoneToInternational(signerPhone);
    if (!isValidBrazilianPhone(formattedPhone)) {
      toast({
        title: 'Telefone inválido',
        description: 'O telefone deve estar no formato: 55 + DDD + número (ex: 5592999106091)',
        variant: 'destructive'
      });
      return;
    }

    setStep('sending');

    try {
      // 1. Create contract record
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          entity_id: event.entityId,
          event_id: event.id,
          client_id: event.clientId,
          document_name: title,
          status: 'pending'
        })
        .select()
        .single();

      if (contractError) {
        throw new Error(`Erro ao criar contrato: ${contractError.message}`);
      }

      // 2. Send to ClickSign via WhatsApp Acceptance
      const { data, error } = await supabase.functions.invoke('clicksign', {
        body: {
          action: 'create_whatsapp_acceptance',
          contractId: contract.id,
          signerName,
          signerPhone: formattedPhone,
          title,
          message
        }
      });

      if (error || !data?.success) {
        // Delete the contract record if ClickSign fails
        await supabase.from('contracts').delete().eq('id', contract.id);
        throw new Error(data?.error || error?.message || 'Erro ao enviar para ClickSign');
      }

      setStep('success');
      toast({
        title: 'Aceite enviado!',
        description: 'O aceite foi enviado via WhatsApp para confirmação.'
      });

      onContractSent?.();
    } catch (error) {
      console.error('Error sending WhatsApp acceptance:', error);
      toast({
        title: 'Erro ao enviar aceite',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive'
      });
      setStep('form');
    }
  };

  const handleClose = () => {
    setStep('form');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-500" />
            Enviar Aceite via WhatsApp
          </DialogTitle>
          <DialogDescription>
            Evento: {event.title}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <p className="text-sm text-green-700 dark:text-green-300">
                <strong>ClickSign via WhatsApp:</strong> O cliente receberá uma mensagem no WhatsApp para confirmar o aceite do contrato.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Título do Aceite</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Contrato de Locação"
                  maxLength={255}
                />
              </div>

              <div>
                <Label htmlFor="signer-name">Nome do Cliente</Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome completo"
                  maxLength={200}
                />
              </div>

              <div>
                <Label htmlFor="signer-phone">WhatsApp do Cliente</Label>
                <PhoneInput
                  id="signer-phone"
                  value={signerPhone}
                  onChange={setSignerPhone}
                  placeholder="5592999106091"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Formato obrigatório: 55 + DDD + número (ex: 5592999106091)
                </p>
              </div>

              <div>
                <Label htmlFor="message">Mensagem do Aceite</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Texto que o cliente irá aceitar..."
                  rows={4}
                  maxLength={1500}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {message.length}/1500 caracteres
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSendWhatsApp}
                disabled={!signerName || !signerPhone || !title || !message}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar via WhatsApp
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'sending' && (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-green-500 mb-4" />
            <p className="text-muted-foreground">
              Enviando aceite via WhatsApp...
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="font-medium mb-2">Aceite enviado com sucesso!</p>
            <p className="text-sm text-muted-foreground mb-4">
              O cliente receberá o aceite no WhatsApp para confirmação.
            </p>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
