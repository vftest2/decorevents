import { useState, useEffect } from 'react';
import { Loader2, User, Package, Calendar, ChevronRight, ChevronLeft, UserPlus, CalendarPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import { EventStatus } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { z } from 'zod';

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

interface EntityUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  isAvailable: boolean;
  conflictEvent?: string;
}

interface ClientEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'client' | 'event' | 'client_event';
  onSuccess?: () => void;
  preselectedClient?: Client | null;
}

const clientSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().trim().email('Email inválido').max(255, 'Email deve ter no máximo 255 caracteres').optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'Telefone deve ter no máximo 20 caracteres').optional().or(z.literal('')),
  address: z.string().trim().max(255, 'Endereço deve ter no máximo 255 caracteres').optional().or(z.literal('')),
  notes: z.string().trim().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional().or(z.literal('')),
});

type ClientFormData = z.infer<typeof clientSchema>;

export function ClientEventDrawer({ 
  open, 
  onOpenChange, 
  mode,
  onSuccess,
  preselectedClient,
}: ClientEventDrawerProps) {
  const { currentEntity } = useEntity();
  const [currentStep, setCurrentStep] = useState<'client' | 'event'>(mode === 'event' ? 'event' : 'client');
  const [clients, setClients] = useState<Client[]>([]);
  const [entityUsers, setEntityUsers] = useState<EntityUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [createdClient, setCreatedClient] = useState<Client | null>(preselectedClient || null);
  const [activeTab, setActiveTab] = useState('info');
  const [clientFormErrors, setClientFormErrors] = useState<Record<string, string>>({});
  
  const [clientFormData, setClientFormData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const [eventFormData, setEventFormData] = useState({
    title: '',
    description: '',
    event_type: '',
    start_date: '',
    end_date: '',
    address: '',
    client_id: '',
    total_value: '',
    status: 'budget' as EventStatus,
    modality: 'event' as 'event' | 'event_rental' | 'rental_only',
  });

  useEffect(() => {
    if (open && currentEntity?.id) {
      fetchClients();
      if (mode === 'event' && preselectedClient) {
        setCreatedClient(preselectedClient);
        setEventFormData(prev => ({ ...prev, client_id: preselectedClient.id }));
      }
    }
  }, [open, currentEntity?.id, mode, preselectedClient]);

  useEffect(() => {
    if (open && currentEntity?.id && eventFormData.start_date && eventFormData.end_date) {
      fetchEntityUsersWithAvailability();
    }
  }, [open, currentEntity?.id, eventFormData.start_date, eventFormData.end_date]);

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

  const fetchEntityUsersWithAvailability = async () => {
    if (!currentEntity?.id || !eventFormData.start_date || !eventFormData.end_date) return;

    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, user_id, name, email')
        .eq('entity_id', currentEntity.id)
        .eq('is_active', true);

      if (profilesError) throw profilesError;

      if (!profiles || profiles.length === 0) {
        setEntityUsers([]);
        return;
      }

      const startDate = new Date(eventFormData.start_date).toISOString();
      const endDate = new Date(eventFormData.end_date).toISOString();

      const { data: conflictingAssignments, error: conflictError } = await supabase
        .from('event_assigned_users')
        .select(`
          user_id,
          events!inner (
            id,
            title,
            start_date,
            end_date,
            entity_id
          )
        `)
        .eq('events.entity_id', currentEntity.id);

      if (conflictError) throw conflictError;

      const usersWithAvailability: EntityUser[] = profiles.map(profile => {
        const userConflicts = conflictingAssignments?.filter(assignment => {
          if (assignment.user_id !== profile.user_id) return false;
          
          const event = assignment.events as any;
          if (!event) return false;

          const eventStart = new Date(event.start_date);
          const eventEnd = new Date(event.end_date);
          const newStart = new Date(startDate);
          const newEnd = new Date(endDate);

          return (newStart < eventEnd && newEnd > eventStart);
        });

        const hasConflict = userConflicts && userConflicts.length > 0;
        const conflictEvent = hasConflict ? (userConflicts[0].events as any)?.title : undefined;

        return {
          id: profile.id,
          user_id: profile.user_id,
          name: profile.name,
          email: profile.email,
          isAvailable: !hasConflict,
          conflictEvent,
        };
      });

      setEntityUsers(usersWithAvailability);
    } catch (error) {
      console.error('Error fetching entity users:', error);
    }
  };

  const resetForm = () => {
    setClientFormData({ name: '', email: '', phone: '', address: '', notes: '' });
    setClientFormErrors({});
    setEventFormData({
      title: '',
      description: '',
      event_type: '',
      start_date: '',
      end_date: '',
      address: '',
      client_id: '',
      total_value: '',
      status: 'budget',
      modality: 'event',
    });
    setSelectedUsers([]);
    setActiveTab('info');
    setCreatedClient(null);
    setCurrentStep(mode === 'event' ? 'event' : 'client');
  };

  const handleUserToggle = (userId: string, isAvailable: boolean) => {
    if (!isAvailable) return;

    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreateClient = async (): Promise<Client | null> => {
    if (!currentEntity?.id) return null;

    const validation = clientSchema.safeParse(clientFormData);
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setClientFormErrors(errors);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: clientFormData.name.trim(),
          email: clientFormData.email?.trim() || null,
          phone: clientFormData.phone?.trim() || null,
          address: clientFormData.address?.trim() || null,
          notes: clientFormData.notes?.trim() || null,
          entity_id: currentEntity.id,
        })
        .select('id, name')
        .single();

      if (error) throw error;
      
      return data;
    } catch (error: any) {
      toast.error('Erro ao criar cliente: ' + error.message);
      return null;
    }
  };

  const handleCreateEvent = async (clientId?: string) => {
    if (!currentEntity?.id) {
      toast.error('Entidade não encontrada');
      return false;
    }

    if (!eventFormData.title.trim() || !eventFormData.start_date || !eventFormData.end_date) {
      toast.error('Preencha os campos obrigatórios do evento');
      return false;
    }

    if (new Date(eventFormData.end_date) < new Date(eventFormData.start_date)) {
      toast.error('A data de término deve ser posterior à data de início');
      return false;
    }

    try {
      if (eventFormData.modality === 'rental_only') {
        const { error: rentalError } = await supabase
          .from('rentals')
          .insert({
            entity_id: currentEntity.id,
            title: eventFormData.title.trim(),
            description: eventFormData.description.trim() || null,
            departure_date: eventFormData.start_date,
            return_date: eventFormData.end_date,
            client_id: clientId || eventFormData.client_id || null,
            total_value: eventFormData.total_value ? parseFloat(eventFormData.total_value) : 0,
            status: 'pending',
          });

        if (rentalError) throw rentalError;
      } else {
        const { data: newEvent, error } = await supabase
          .from('events')
          .insert({
            entity_id: currentEntity.id,
            title: eventFormData.title.trim(),
            description: eventFormData.description.trim() || null,
            event_type: eventFormData.event_type || null,
            start_date: eventFormData.start_date,
            end_date: eventFormData.end_date,
            address: eventFormData.address.trim() || null,
            client_id: clientId || eventFormData.client_id || null,
            total_value: eventFormData.total_value ? parseFloat(eventFormData.total_value) : 0,
            status: eventFormData.modality === 'event_rental' ? 'confirmed' : eventFormData.status,
          })
          .select('id')
          .single();

        if (error) throw error;

        if (selectedUsers.length > 0 && newEvent) {
          const userAssignments = selectedUsers.map(userId => ({
            event_id: newEvent.id,
            user_id: userId,
          }));

          const { error: assignError } = await supabase
            .from('event_assigned_users')
            .insert(userAssignments);

          if (assignError) {
            console.error('Error assigning users:', assignError);
          }
        }
      }

      return true;
    } catch (error: any) {
      toast.error('Erro ao criar evento: ' + error.message);
      return false;
    }
  };

  const handleSubmit = async () => {
    setIsSaving(true);

    try {
      if (mode === 'client') {
        const client = await handleCreateClient();
        if (client) {
          toast.success('Cliente criado com sucesso!');
          onOpenChange(false);
          resetForm();
          onSuccess?.();
        }
      } else if (mode === 'event') {
        const success = await handleCreateEvent(createdClient?.id);
        if (success) {
          toast.success(eventFormData.modality === 'rental_only' ? 'Locação criada com sucesso!' : 'Evento criado com sucesso!');
          onOpenChange(false);
          resetForm();
          onSuccess?.();
        }
      } else if (mode === 'client_event') {
        if (currentStep === 'client') {
          const client = await handleCreateClient();
          if (client) {
            setCreatedClient(client);
            setEventFormData(prev => ({ ...prev, client_id: client.id }));
            setClients(prev => [...prev, client]);
            toast.success('Cliente criado! Agora preencha os dados do evento.');
            setCurrentStep('event');
          }
        } else {
          const success = await handleCreateEvent(createdClient?.id);
          if (success) {
            const message = eventFormData.modality === 'rental_only' 
              ? 'Cliente e locação criados com sucesso!'
              : 'Cliente e evento criados com sucesso!';
            toast.success(message);
            onOpenChange(false);
            resetForm();
            onSuccess?.();
          }
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const drawerWidth = mode === 'client_event' ? 'sm:max-w-2xl' : 'sm:max-w-xl';

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className={cn("w-full overflow-y-auto", drawerWidth)}>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {mode === 'client_event' ? (
              <>
                <UserPlus className="h-5 w-5" />
                Novo Cliente + Evento
              </>
            ) : mode === 'client' ? (
              <>
                <UserPlus className="h-5 w-5" />
                Novo Cliente
              </>
            ) : (
              <>
                <CalendarPlus className="h-5 w-5" />
                Novo Evento
              </>
            )}
          </SheetTitle>
          <SheetDescription>
            {mode === 'client_event' 
              ? 'Cadastre o cliente e crie o evento em um fluxo contínuo.'
              : mode === 'client' 
                ? 'Preencha os dados do novo cliente.'
                : 'Preencha os dados do evento.'
            }
          </SheetDescription>
        </SheetHeader>

        {/* Progress indicator for client_event mode */}
        {mode === 'client_event' && (
          <div className="flex items-center justify-center gap-4 mt-4 mb-6">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
              currentStep === 'client' 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              <UserPlus className="h-4 w-4" />
              <span className="text-sm font-medium">1. Cliente</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full transition-all",
              currentStep === 'event' 
                ? "bg-primary text-primary-foreground" 
                : "bg-muted text-muted-foreground"
            )}>
              <CalendarPlus className="h-4 w-4" />
              <span className="text-sm font-medium">2. Evento</span>
            </div>
          </div>
        )}

        <div className="py-4">
          {/* Client Form */}
          {(mode === 'client' || (mode === 'client_event' && currentStep === 'client')) && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={clientFormData.name}
                  onChange={(e) => setClientFormData({ ...clientFormData, name: e.target.value })}
                  placeholder="Nome do cliente"
                  className={clientFormErrors.name ? 'border-destructive' : ''}
                />
                {clientFormErrors.name && <p className="text-sm text-destructive">{clientFormErrors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  value={clientFormData.email}
                  onChange={(e) => setClientFormData({ ...clientFormData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                  className={clientFormErrors.email ? 'border-destructive' : ''}
                />
                {clientFormErrors.email && <p className="text-sm text-destructive">{clientFormErrors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone">Telefone</Label>
                <Input
                  id="client-phone"
                  value={clientFormData.phone}
                  onChange={(e) => setClientFormData({ ...clientFormData, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className={clientFormErrors.phone ? 'border-destructive' : ''}
                />
                {clientFormErrors.phone && <p className="text-sm text-destructive">{clientFormErrors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-address">Endereço</Label>
                <Input
                  id="client-address"
                  value={clientFormData.address}
                  onChange={(e) => setClientFormData({ ...clientFormData, address: e.target.value })}
                  placeholder="Rua, número, bairro, cidade"
                  className={clientFormErrors.address ? 'border-destructive' : ''}
                />
                {clientFormErrors.address && <p className="text-sm text-destructive">{clientFormErrors.address}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-notes">Observações</Label>
                <Textarea
                  id="client-notes"
                  value={clientFormData.notes}
                  onChange={(e) => setClientFormData({ ...clientFormData, notes: e.target.value })}
                  placeholder="Notas sobre o cliente..."
                  rows={3}
                  className={clientFormErrors.notes ? 'border-destructive' : ''}
                />
                {clientFormErrors.notes && <p className="text-sm text-destructive">{clientFormErrors.notes}</p>}
              </div>
            </div>
          )}

          {/* Event Form */}
          {(mode === 'event' || (mode === 'client_event' && currentStep === 'event')) && (
            <div>
              {/* Show linked client info */}
              {createdClient && (
                <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Cliente vinculado:</p>
                  <p className="font-medium text-primary">{createdClient.name}</p>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger value="modality" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Modalidade
                  </TabsTrigger>
                  <TabsTrigger value="team" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Equipe
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Título do Evento *</Label>
                    <Input
                      value={eventFormData.title}
                      onChange={(e) => setEventFormData({ ...eventFormData, title: e.target.value })}
                      placeholder="Ex: Festa de 15 Anos - Maria"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tipo de Evento</Label>
                      <Select
                        value={eventFormData.event_type}
                        onValueChange={(value) => setEventFormData({ ...eventFormData, event_type: value })}
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
                        value={eventFormData.status}
                        onValueChange={(value) => setEventFormData({ ...eventFormData, status: value as EventStatus })}
                        disabled={eventFormData.modality === 'event_rental' || eventFormData.modality === 'rental_only'}
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Data/Hora Início *</Label>
                      <Input
                        type="datetime-local"
                        value={eventFormData.start_date}
                        onChange={(e) => setEventFormData({ ...eventFormData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data/Hora Término *</Label>
                      <Input
                        type="datetime-local"
                        value={eventFormData.end_date}
                        onChange={(e) => setEventFormData({ ...eventFormData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Select
                        value={eventFormData.client_id}
                        onValueChange={(value) => setEventFormData({ ...eventFormData, client_id: value })}
                        disabled={!!createdClient}
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
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Total (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={eventFormData.total_value}
                        onChange={(e) => setEventFormData({ ...eventFormData, total_value: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Endereço do Evento</Label>
                    <Input
                      value={eventFormData.address}
                      onChange={(e) => setEventFormData({ ...eventFormData, address: e.target.value })}
                      placeholder="Ex: Rua das Flores, 123 - São Paulo, SP"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={eventFormData.description}
                      onChange={(e) => setEventFormData({ ...eventFormData, description: e.target.value })}
                      placeholder="Detalhes sobre o evento..."
                      rows={3}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="modality" className="mt-4 space-y-4">
                  <div className="space-y-4">
                    <Label>Modalidade do Evento</Label>
                    <p className="text-sm text-muted-foreground">
                      Escolha se este evento terá uma locação de itens vinculada automaticamente.
                    </p>
                    
                    <div className="grid gap-4">
                      <div 
                        className={cn(
                          "border-2 rounded-lg p-4 cursor-pointer transition-all",
                          eventFormData.modality === 'event' 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-muted-foreground"
                        )}
                        onClick={() => setEventFormData({ ...eventFormData, modality: 'event' })}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2",
                            eventFormData.modality === 'event' 
                              ? "border-primary bg-primary" 
                              : "border-muted-foreground"
                          )} />
                          <div>
                            <h4 className="font-medium">Evento Normal</h4>
                            <p className="text-sm text-muted-foreground">
                              Apenas registro do evento, sem locação automática de itens.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div 
                        className={cn(
                          "border-2 rounded-lg p-4 cursor-pointer transition-all",
                          eventFormData.modality === 'event_rental' 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-muted-foreground"
                        )}
                        onClick={() => setEventFormData({ ...eventFormData, modality: 'event_rental', status: 'confirmed' })}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2",
                            eventFormData.modality === 'event_rental' 
                              ? "border-primary bg-primary" 
                              : "border-muted-foreground"
                          )} />
                          <div>
                            <h4 className="font-medium">Evento + Locação</h4>
                            <p className="text-sm text-muted-foreground">
                              O evento será confirmado e uma locação será criada automaticamente.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div 
                        className={cn(
                          "border-2 rounded-lg p-4 cursor-pointer transition-all",
                          eventFormData.modality === 'rental_only' 
                            ? "border-primary bg-primary/5" 
                            : "border-border hover:border-muted-foreground"
                        )}
                        onClick={() => setEventFormData({ ...eventFormData, modality: 'rental_only', status: 'confirmed' })}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-2",
                            eventFormData.modality === 'rental_only' 
                              ? "border-primary bg-primary" 
                              : "border-muted-foreground"
                          )} />
                          <div>
                            <h4 className="font-medium">Apenas Locação</h4>
                            <p className="text-sm text-muted-foreground">
                              Cria apenas uma locação de itens, sem evento associado.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="team" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Atribuir Equipe</Label>
                    <p className="text-sm text-muted-foreground">
                      Selecione os membros da equipe para este evento.
                    </p>
                  </div>

                  {!eventFormData.start_date || !eventFormData.end_date ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Defina as datas do evento para ver a disponibilidade da equipe.</p>
                    </div>
                  ) : entityUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Nenhum usuário encontrado nesta entidade.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {entityUsers.map((user) => (
                        <div 
                          key={user.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-all",
                            user.isAvailable 
                              ? "hover:bg-muted/50 cursor-pointer" 
                              : "opacity-50 cursor-not-allowed bg-muted/30",
                            selectedUsers.includes(user.user_id) && user.isAvailable && "border-primary bg-primary/5"
                          )}
                          onClick={() => handleUserToggle(user.user_id, user.isAvailable)}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox 
                              checked={selectedUsers.includes(user.user_id)}
                              disabled={!user.isAvailable}
                              onCheckedChange={() => handleUserToggle(user.user_id, user.isAvailable)}
                            />
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          {!user.isAvailable && user.conflictEvent && (
                            <Badge variant="secondary" className="text-xs">
                              Em: {user.conflictEvent}
                            </Badge>
                          )}
                          {user.isAvailable && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                              Disponível
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedUsers.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground">
                        {selectedUsers.length} usuário(s) selecionado(s)
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2 pt-4 border-t">
          {mode === 'client_event' && currentStep === 'event' && (
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('client')}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving} className="flex-1">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : mode === 'client' ? (
              'Criar Cliente'
            ) : mode === 'event' ? (
              eventFormData.modality === 'rental_only' ? 'Criar Locação' : 'Criar Evento'
            ) : currentStep === 'client' ? (
              <>
                Próximo
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            ) : (
              eventFormData.modality === 'rental_only' ? 'Criar Locação' : 'Criar Evento'
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
