import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileText, Send, Loader2, CheckCircle } from 'lucide-react';

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
  const [step, setStep] = useState<'upload' | 'confirm' | 'sending' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [signerName, setSignerName] = useState(event.clientName || '');
  const [signerEmail, setSignerEmail] = useState(event.clientEmail || '');
  const [signerPhone, setSignerPhone] = useState(event.clientPhone || '');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo PDF.',
          variant: 'destructive'
        });
        return;
      }
      setFile(selectedFile);
      setStep('confirm');
    }
  };

  const handleSendContract = async () => {
    if (!file) return;

    setStep('sending');

    try {
      // Convert file to base64 with MIME type prefix (required by ClickSign)
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Keep the full data URI with MIME type - ClickSign requires it
          resolve(result);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const documentBase64 = await base64Promise;

      // 1. Upload file to Supabase Storage
      const fileName = `${event.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('contracts')
        .upload(fileName, file);

      if (uploadError) {
        throw new Error(`Erro ao fazer upload: ${uploadError.message}`);
      }

      // 2. Create contract record
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          entity_id: event.entityId,
          event_id: event.id,
          client_id: event.clientId,
          document_name: file.name,
          document_url: fileName,
          status: 'pending'
        })
        .select()
        .single();

      if (contractError) {
        throw new Error(`Erro ao criar contrato: ${contractError.message}`);
      }

      // 3. Send to ClickSign via Edge Function
      const { data, error } = await supabase.functions.invoke('clicksign', {
        body: {
          action: 'upload_document',
          documentBase64,
          fileName: file.name,
          contractId: contract.id,
          signerName,
          signerEmail,
          signerPhone
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro ao enviar para ClickSign');
      }

      setStep('success');
      toast({
        title: 'Contrato enviado!',
        description: 'O contrato foi enviado via WhatsApp para assinatura.'
      });

      onContractSent?.();
    } catch (error) {
      console.error('Error sending contract:', error);
      toast({
        title: 'Erro ao enviar contrato',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive'
      });
      setStep('confirm');
    }
  };

  const handleClose = () => {
    setStep('upload');
    setFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Contrato
          </DialogTitle>
          <DialogDescription>
            Evento: {event.title}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Faça upload do PDF do contrato
              </p>
              <Input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="contract-upload"
              />
              <Label htmlFor="contract-upload" className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span>Selecionar PDF</span>
                </Button>
              </Label>
            </div>
          </div>
        )}

        {step === 'confirm' && file && (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
              <FileText className="h-8 w-8 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="signer-name">Nome do Signatário</Label>
                <Input
                  id="signer-name"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <Label htmlFor="signer-email">E-mail</Label>
                <Input
                  id="signer-email"
                  type="email"
                  value={signerEmail}
                  onChange={(e) => setSignerEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="signer-phone">WhatsApp</Label>
                <Input
                  id="signer-phone"
                  value={signerPhone}
                  onChange={(e) => setSignerPhone(e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Voltar
              </Button>
              <Button 
                onClick={handleSendContract}
                disabled={!signerName || !signerPhone}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar via WhatsApp
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 'sending' && (
          <div className="py-8 text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">
              Enviando contrato para assinatura...
            </p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center">
            <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <p className="font-medium mb-2">Contrato enviado com sucesso!</p>
            <p className="text-sm text-muted-foreground mb-4">
              O cliente receberá o contrato via WhatsApp para assinatura.
            </p>
            <Button onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
