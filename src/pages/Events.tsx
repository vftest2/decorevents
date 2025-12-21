import { useState, useEffect } from 'react';
import { LayoutGrid, Calendar as CalendarIcon, List, Plus, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { EventCard } from '@/components/events/EventCard';
import { EventCalendarView } from '@/components/events/EventCalendarView';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ViewMode = 'grid' | 'calendar' | 'list';

const statusFilters: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'budget', label: 'Orçamentos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'in_assembly', label: 'Em Montagem' },
  { value: 'in_transit', label: 'Em Trânsito' },
  { value: 'finished', label: 'Finalizados' },
];

const eventTypes = [
  'Casamento',
  'Aniversário Infantil',
  'Aniversário Adulto',
  'Festa de 15 Anos',
  'Formatura',
  'Evento Corporativo',
  'Chá de Bebê',
  'Batizado',
  'Outro',
];

interface Client {
  id: string;
  name: string;
}

export default function Events() {
  const { currentEntity } = useEntity();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: '',
    start_date: '',
    end_date: '',
    address: '',
    client_id: '',
    total_value: '',
    status: 'budget' as EventStatus,
  });

  useEffect(() => {
    if (currentEntity?.id) {
      fetchEvents();
      fetchClients();
    }
  }, [currentEntity?.id]);

  const fetchEvents = async () => {
    if (!currentEntity?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          clients (id, name, email, phone, address)
        `)
        .eq('entity_id', currentEntity.id)
        .order('start_date', { ascending: true });

      if (error) throw error;

      const mappedEvents: Event[] = (data || []).map(e => ({
        id: e.id,
        entityId: e.entity_id,
        title: e.title,
        description: e.description || undefined,
        startDate: new Date(e.start_date),
        endDate: new Date(e.end_date),
        status: e.status as EventStatus,
        clientId: e.client_id || '',
        client: e.clients ? {
          id: e.clients.id,
          entityId: e.entity_id,
          name: e.clients.name,
          email: e.clients.email || '',
          phone: e.clients.phone || '',
          address: e.clients.address || undefined,
          createdAt: new Date(),
        } : undefined,
        address: e.address || '',
        eventType: e.event_type || '',
        theme: e.theme || undefined,
        items: [],
        assignedUsers: [],
        totalValue: e.total_value || 0,
        createdAt: new Date(e.created_at || ''),
      }));

      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    if (!currentEntity?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .eq('entity_id', currentEntity.id)
        .order('name');

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      event_type: '',
      start_date: '',
      end_date: '',
      address: '',
      client_id: '',
      total_value: '',
      status: 'budget',
    });
  };

  const handleCreate = async () => {
    if (!currentEntity?.id) {
      toast.error('Entidade não encontrada');
      return;
    }

    if (!formData.title.trim() || !formData.start_date || !formData.end_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    if (new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error('A data de término deve ser posterior à data de início');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('events')
        .insert({
          entity_id: currentEntity.id,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          event_type: formData.event_type || null,
          start_date: formData.start_date,
          end_date: formData.end_date,
          address: formData.address.trim() || null,
          client_id: formData.client_id || null,
          total_value: formData.total_value ? parseFloat(formData.total_value) : 0,
          status: formData.status,
        });

      if (error) throw error;

      toast.success('Evento criado com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEvents = statusFilter === 'all' 
    ? events 
    : events.filter(e => e.status === statusFilter);

  const getStatusCount = (status: EventStatus | 'all') => {
    if (status === 'all') return events.length;
    return events.filter(e => e.status === status).length;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <Header title="Eventos" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Eventos" 
        subtitle={`${events.length} eventos cadastrados`}
        showAddButton
        addButtonLabel="Novo Evento"
        onAddClick={() => { resetForm(); setIsCreateDialogOpen(true); }}
      />

      <div className="p-6 space-y-6">
        {/* Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const count = getStatusCount(filter.value);
              
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                    statusFilter === filter.value
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {filter.label}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'h-5 min-w-[20px] px-1.5',
                      statusFilter === filter.value && 'bg-primary-foreground/20 text-primary-foreground'
                    )}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2',
                viewMode === 'grid' && 'bg-background shadow-sm'
              )}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grade</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2',
                viewMode === 'calendar' && 'bg-background shadow-sm'
              )}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Calendário</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2',
                viewMode === 'list' && 'bg-background shadow-sm'
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="Nenhum evento encontrado"
            description={
              events.length === 0
                ? "Você ainda não tem eventos cadastrados. Comece criando seu primeiro evento."
                : "Não há eventos com os filtros selecionados. Tente ajustar os filtros."
            }
            actionLabel={events.length === 0 ? "Criar Evento" : undefined}
            onAction={events.length === 0 ? () => setIsCreateDialogOpen(true) : undefined}
          />
        ) : viewMode === 'calendar' ? (
          <EventCalendarView 
            events={filteredEvents}
            onEventClick={(event) => console.log('Event clicked:', event)}
          />
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
              : 'space-y-3'
          )}>
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onClick={() => console.log('Event clicked:', event)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Event Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Title */}
            <div className="space-y-2">
              <Label>Título do Evento *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Ex: Festa de 15 Anos - Maria"
              />
            </div>

            {/* Event Type and Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de Evento</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(value) => setFormData({ ...formData, event_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value as EventStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Orçamento</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="in_assembly">Em Montagem</SelectItem>
                    <SelectItem value="in_transit">Em Trânsito</SelectItem>
                    <SelectItem value="finished">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Data/Hora Início *</Label>
                <Input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data/Hora Término *</Label>
                <Input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>

            {/* Client and Value */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {clients.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nenhum cliente cadastrado. Cadastre clientes primeiro.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Valor Total (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.total_value}
                  onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <Label>Endereço do Evento</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Ex: Rua das Flores, 123 - São Paulo, SP"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Detalhes sobre o evento..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Evento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
