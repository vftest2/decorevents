import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileSignature, CheckCircle, Clock, Send, XCircle, RefreshCw, Download, Loader2, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { GenerateContractDialog } from './GenerateContractDialog';

type ContractStatus = 'pending' | 'sent' | 'signed' | 'cancelled';

interface Contract {
  id: string;
  document_name: string;
  status: ContractStatus;
  whatsapp_sent: boolean;
  whatsapp_sent_at: string | null;
  signed_at: string | null;
  created_at: string;
  clicksign_document_key: string | null;
}

interface EventContractSectionProps {
  eventId: string;
  entityId: string;
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  eventTitle: string;
  eventStatus: string;
  totalValue?: number;
  startDate?: string;
  address?: string;
}

const statusConfig: Record<ContractStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  sent: { label: 'Enviado', icon: Send, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  signed: { label: 'Assinado', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

export function EventContractSection({
  eventId,
  entityId,
  clientId,
  clientName,
  clientEmail,
  clientPhone,
  eventTitle,
  eventStatus,
  totalValue,
  startDate,
  address
}: EventContractSectionProps) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    fetchContracts();
  }, [eventId]);

  const fetchContracts = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts((data || []) as Contract[]);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckStatus = async (contract: Contract) => {
    if (!contract.clicksign_document_key) {
      toast.error('Contrato não possui documento no ClickSign');
      return;
    }

    setCheckingStatus(contract.id);
    try {
      // Check if it's a WhatsApp acceptance (no PDF) or envelope
      const action = contract.whatsapp_sent ? 'check_whatsapp_acceptance' : 'check_status';
      const body = contract.whatsapp_sent 
        ? { action, acceptanceId: contract.clicksign_document_key }
        : { action, documentKey: contract.clicksign_document_key, contractId: contract.id };

      const { data, error } = await supabase.functions.invoke('clicksign', { body });

      if (error) throw error;

      // Handle WhatsApp acceptance status
      if (contract.whatsapp_sent) {
        const status = data.status;
        if (status === 'completed') {
          // Update contract to signed
          await supabase
            .from('contracts')
            .update({ status: 'signed', signed_at: new Date().toISOString() })
            .eq('id', contract.id);
          toast.success('Aceite confirmado pelo cliente!');
          fetchContracts();
        } else if (status === 'refused' || status === 'canceled' || status === 'expired') {
          await supabase
            .from('contracts')
            .update({ status: 'cancelled' })
            .eq('id', contract.id);
          toast.info(`Status do aceite: ${status}`);
          fetchContracts();
        } else {
          toast.info(`Status do aceite: ${status}`);
        }
      } else {
        // Handle envelope status
        if (data.isSigned) {
          toast.success('Contrato foi assinado!');
          fetchContracts();
        } else {
          toast.info(`Status do documento: ${data.status}`);
        }
      }
    } catch (error) {
      console.error('Error checking status:', error);
      toast.error('Erro ao verificar status');
    } finally {
      setCheckingStatus(null);
    }
  };

  const handleDownload = async (contract: Contract) => {
    if (!contract.clicksign_document_key) {
      toast.error('Contrato não possui documento no ClickSign');
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('clicksign', {
        body: {
          action: 'download_signed',
          documentKey: contract.clicksign_document_key
        }
      });

      if (error) throw error;

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Error downloading:', error);
      toast.error('Erro ao baixar documento');
    }
  };

  // Don't show section for budget events
  if (eventStatus === 'budget') {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-4 flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-primary/30">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSignature className="h-5 w-5 text-primary" />
            Contratos Digitais
          </CardTitle>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Novo Contrato
          </Button>
        </CardHeader>
        <CardContent>
          {contracts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileSignature className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum contrato enviado</p>
              <Button 
                variant="link" 
                size="sm"
                onClick={() => setIsDialogOpen(true)}
              >
                Enviar primeiro contrato
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {contracts.map((contract) => {
                const config = statusConfig[contract.status];
                const StatusIcon = config.icon;

                return (
                  <div 
                    key={contract.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded-lg", config.bgColor)}>
                        <StatusIcon className={cn("h-4 w-4", config.color)} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{contract.document_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(contract.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </p>
                        {contract.signed_at && (
                          <p className="text-xs text-green-600">
                            Assinado em {format(new Date(contract.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("gap-1", config.bgColor, config.color)}>
                        {config.label}
                      </Badge>
                      
                      {contract.status === 'sent' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCheckStatus(contract)}
                          disabled={checkingStatus === contract.id}
                          title="Verificar assinatura"
                        >
                          {checkingStatus === contract.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      
                      {contract.status === 'signed' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownload(contract)}
                          title="Baixar documento assinado"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <GenerateContractDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        event={{
          id: eventId,
          title: eventTitle,
          entityId,
          clientId,
          clientName,
          clientEmail,
          clientPhone,
          totalValue,
          startDate,
          address
        }}
        onContractSent={() => {
          fetchContracts();
        }}
      />
    </>
  );
}
