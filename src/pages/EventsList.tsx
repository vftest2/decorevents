import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar as CalendarIcon, Loader2, FileSignature, MapPin, Clock, User } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EventStatus } from '@/types';
import { GenerateContractDialog } from '@/components/contracts/GenerateContractDialog';

interface EventRow {
  id: string;
  title: string;
  event_type: string | null;
  start_date: string;
  end_date: string;
  address: string | null;
  status: EventStatus;
  total_value: number | null;
  entity_id: string;
  client_id: string | null;
  clients: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  } | null;
}

const statusConfig: Record<EventStatus, { label: string; color: string; bgColor: string }> = {
  budget: { label: 'Orçamento', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  confirmed: { label: 'Confirmado', color: 'text-green-600', bgColor: 'bg-green-100' },
  in_assembly: { label: 'Em Montagem', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  in_transit: { label: 'Em Trânsito', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  finished: { label: 'Finalizado', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

const statusFilters: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'budget', label: 'Orçamentos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'in_assembly', label: 'Em Montagem' },
  { value: 'in_transit', label: 'Em Trânsito' },
  { value: 'finished', label: 'Finalizados' },
];

export default function EventsList() {
  const navigate = useNavigate();
  const { currentEntity } = useEntity();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [contractDialogEvent, setContractDialogEvent] = useState<EventRow | null>(null);

  useEffect(() => {
    if (currentEntity?.id) {
      fetchEvents();
    }
  }, [currentEntity?.id]);

  const fetchEvents = async () => {
    if (!currentEntity?.id) return;

    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          id, title, event_type, start_date, end_date, address, status, total_value, entity_id, client_id,
          clients (id, name, email, phone)
        `)
        .eq('entity_id', currentEntity.id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setEvents((data || []) as EventRow[]);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = statusFilter === 'all'
    ? events
    : events.filter(e => e.status === statusFilter);

  const getStatusCount = (status: EventStatus | 'all') => {
    if (status === 'all') return events.length;
    return events.filter(e => e.status === status).length;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Header title="Lista de Eventos" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header
        title="Lista de Eventos"
        subtitle={`${events.length} eventos cadastrados`}
        showAddButton
        addButtonLabel="Novo Evento"
        onAddClick={() => navigate('/events')}
      />

      <div className="p-6 space-y-6">
        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {statusFilters.map((filter) => {
            const count = getStatusCount(filter.value);
            return (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
                <Badge variant="secondary" className="ml-2">
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Events Table */}
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="Nenhum evento encontrado"
            description={
              events.length === 0
                ? "Você ainda não tem eventos cadastrados."
                : "Não há eventos com os filtros selecionados."
            }
            actionLabel={events.length === 0 ? "Ir para Eventos" : undefined}
            onAction={events.length === 0 ? () => navigate('/events') : undefined}
          />
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.map((event) => {
                  const config = statusConfig[event.status];
                  const showContractButton = event.status !== 'budget';

                  return (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div>
                          <p 
                            className="font-medium cursor-pointer hover:text-primary hover:underline"
                            onClick={() => navigate(`/events/${event.id}`)}
                          >
                            {event.title}
                          </p>
                          {event.event_type && (
                            <p className="text-sm text-muted-foreground">{event.event_type}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p>{format(new Date(event.start_date), "dd/MM/yyyy", { locale: ptBR })}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.start_date), "HH:mm")} - {format(new Date(event.end_date), "HH:mm")}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {event.clients ? (
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{event.clients.name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", config.bgColor, config.color)}>
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.total_value ? formatCurrency(event.total_value) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {showContractButton && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setContractDialogEvent(event)}
                            >
                              <FileSignature className="h-4 w-4 mr-1" />
                              Contrato
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/events/${event.id}`)}
                          >
                            Ver Detalhes
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

      {/* Contract Dialog */}
      {contractDialogEvent && (
        <GenerateContractDialog
          open={!!contractDialogEvent}
          onOpenChange={(open) => !open && setContractDialogEvent(null)}
          event={{
            id: contractDialogEvent.id,
            title: contractDialogEvent.title,
            entityId: contractDialogEvent.entity_id,
            clientId: contractDialogEvent.client_id || undefined,
            clientName: contractDialogEvent.clients?.name,
            clientEmail: contractDialogEvent.clients?.email || undefined,
            clientPhone: contractDialogEvent.clients?.phone || undefined
          }}
          onContractSent={() => {
            toast.success('Contrato enviado com sucesso!');
            setContractDialogEvent(null);
          }}
        />
      )}
    </MainLayout>
  );
}
