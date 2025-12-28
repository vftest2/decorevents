import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FileSignature, Search, Filter, Loader2, CheckCircle, Clock, Send, XCircle, Eye, RefreshCw, Download } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

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
  events: {
    id: string;
    title: string;
    start_date: string;
  } | null;
  clients: {
    id: string;
    name: string;
  } | null;
}

const statusConfig: Record<ContractStatus, { label: string; icon: React.ElementType; color: string; bgColor: string }> = {
  pending: { label: 'Pendente', icon: Clock, color: 'text-muted-foreground', bgColor: 'bg-muted' },
  sent: { label: 'Enviado', icon: Send, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  signed: { label: 'Assinado', icon: CheckCircle, color: 'text-green-600', bgColor: 'bg-green-100' },
  cancelled: { label: 'Cancelado', icon: XCircle, color: 'text-red-600', bgColor: 'bg-red-100' },
};

const statusFilters: { value: ContractStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'sent', label: 'Enviados' },
  { value: 'signed', label: 'Assinados' },
  { value: 'cancelled', label: 'Cancelados' },
];

export default function Contracts() {
  const navigate = useNavigate();
  const { currentEntity } = useEntity();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'all'>('all');
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

  useEffect(() => {
    if (currentEntity?.id) {
      fetchContracts();
    }
  }, [currentEntity?.id]);

  const fetchContracts = async () => {
    if (!currentEntity?.id) return;

    try {
      const { data, error } = await supabase
        .from('contracts')
        .select(`
          *,
          events (id, title, start_date),
          clients (id, name)
        `)
        .eq('entity_id', currentEntity.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContracts((data || []) as Contract[]);
    } catch (error) {
      console.error('Error fetching contracts:', error);
      toast.error('Erro ao carregar contratos');
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
      const { data, error } = await supabase.functions.invoke('clicksign', {
        body: {
          action: 'check_status',
          documentKey: contract.clicksign_document_key,
          contractId: contract.id
        }
      });

      if (error) throw error;

      if (data.isSigned) {
        toast.success('Contrato foi assinado!');
        fetchContracts();
      } else {
        toast.info(`Status do documento: ${data.status}`);
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

  const filteredContracts = contracts.filter(contract => {
    const matchesSearch = 
      contract.document_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.events?.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.clients?.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || contract.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusCount = (status: ContractStatus | 'all') => {
    if (status === 'all') return contracts.length;
    return contracts.filter(c => c.status === status).length;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Header title="Contratos" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header
        title="Contratos"
        subtitle={`${contracts.length} contratos cadastrados`}
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(['pending', 'sent', 'signed', 'cancelled'] as ContractStatus[]).map((status) => {
            const config = statusConfig[status];
            const count = getStatusCount(status);
            const Icon = config.icon;
            
            return (
              <Card 
                key={status} 
                className={cn(
                  "cursor-pointer transition-all hover:shadow-md",
                  statusFilter === status && "ring-2 ring-primary"
                )}
                onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg", config.bgColor)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por documento, evento ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map((filter) => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
                <Badge variant="secondary" className="ml-2">
                  {getStatusCount(filter.value)}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Contracts Table */}
        {filteredContracts.length === 0 ? (
          <EmptyState
            icon={FileSignature}
            title="Nenhum contrato encontrado"
            description={
              contracts.length === 0
                ? "Você ainda não tem contratos. Gere contratos a partir dos detalhes do evento."
                : "Não há contratos com os filtros selecionados."
            }
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContracts.map((contract) => {
                  const config = statusConfig[contract.status];
                  const StatusIcon = config.icon;
                  
                  return (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileSignature className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{contract.document_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {contract.events ? (
                          <Link 
                            to={`/events/${contract.events.id}`}
                            className="text-primary hover:underline"
                          >
                            {contract.events.title}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contract.clients?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", config.bgColor, config.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(contract.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
                          {contract.signed_at && (
                            <p className="text-xs text-green-600">
                              Assinado em {format(new Date(contract.signed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
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
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/events/${contract.events?.id}`)}
                            title="Ver evento"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
