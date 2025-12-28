import { useState, useEffect } from 'react';
import { Loader2, User, Package, Calendar, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import { EventStatus } from '@/types';
import { format } from 'date-fns';
import { cn, formatPhoneToInternational } from '@/lib/utils';
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

const clientTypeOptions = [
  { value: 'standard', label: 'Padrão', description: 'Cliente comum' },
  { value: 'vip', label: 'VIP', description: 'Cliente prioritário com benefícios' },
  { value: 'premium', label: 'Premium', description: 'Cliente com acesso exclusivo' },
];

const clientSchema = z.object({
  name: z.string().trim().min(1, 'Nome é obrigatório').max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: z.string().trim().email('Email inválido').max(255, 'Email deve ter no máximo 255 caracteres').optional().or(z.literal('')),
  phone: z.string().trim().max(20, 'Telefone deve ter no máximo 20 caracteres').optional().or(z.literal('')),
  address: z.string().trim().max(255, 'Endereço deve ter no máximo 255 caracteres').optional().or(z.literal('')),
  notes: z.string().trim().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional().or(z.literal('')),
  client_type: z.enum(['standard', 'vip', 'premium']).default('standard'),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface EntityUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  isAvailable: boolean;
  conflictEvent?: string;
}

interface CreateClientWithEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClientCreated?: () => void;
  onEventCreated?: () => void;
}

export function CreateClientWithEventDialog({
  open,
  onOpenChange,
  onClientCreated,
  onEventCreated,
}: CreateClientWithEventDialogProps) {
  const { currentEntity } = useEntity();
  const [isSaving, setIsSaving] = useState(false);
  const [showEventPanel, setShowEventPanel] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [entityUsers, setEntityUsers] = useState<EntityUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Client form data
  const [clientData, setClientData] = useState<ClientFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
    client_type: 'standard',
  });

  // Event form data
  const [eventData, setEventData] = useState({
    title: '',
    description: '',
    event_type: '',
    start_date: '',
    end_date: '',
    address: '',
    total_value: '',
    status: 'budget' as EventStatus,
    modality: 'event' as 'event' | 'event_rental' | 'rental_only',
  });

  useEffect(() => {
    if (open) {
      const now = new Date();
      const startDate = format(now, "yyyy-MM-dd'T'10:00");
      const endDate = format(now, "yyyy-MM-dd'T'18:00");
      setEventData(prev => ({
        ...prev,
        start_date: startDate,
        end_date: endDate,
      }));
    }
  }, [open]);

  // Fetch users when dates change
  useEffect(() => {
    if (open && currentEntity?.id && eventData.start_date && eventData.end_date && showEventPanel) {
      fetchEntityUsersWithAvailability();
    }
  }, [open, currentEntity?.id, eventData.start_date, eventData.end_date, showEventPanel]);

  const fetchEntityUsersWithAvailability = async () => {
    if (!currentEntity?.id || !eventData.start_date || !eventData.end_date) return;

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

      const startDate = new Date(eventData.start_date).toISOString();
      const endDate = new Date(eventData.end_date).toISOString();

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
    setClientData({ name: '', email: '', phone: '', address: '', notes: '', client_type: 'standard' });
    setEventData({
      title: '',
      description: '',
      event_type: '',
      start_date: '',
      end_date: '',
      address: '',
      total_value: '',
      status: 'budget',
      modality: 'event',
    });
    setSelectedUsers([]);
    setActiveTab('info');
    setShowEventPanel(false);
    setFormErrors({});
  };

  const handleUserToggle = (userId: string, isAvailable: boolean) => {
    if (!isAvailable) return;

    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!currentEntity?.id) {
      toast.error('Entidade não encontrada');
      return;
    }

    // Validate client
    const clientValidation = clientSchema.safeParse(clientData);
    if (!clientValidation.success) {
      const errors: Record<string, string> = {};
      clientValidation.error.errors.forEach((err) => {
        if (err.path[0]) {
          errors[err.path[0] as string] = err.message;
        }
      });
      setFormErrors(errors);
      toast.error('Verifique os dados do cliente');
      return;
    }

    // Validate event if panel is open
    if (showEventPanel) {
      if (!eventData.title.trim() || !eventData.start_date || !eventData.end_date) {
        toast.error('Preencha os campos obrigatórios do evento');
        return;
      }

      if (new Date(eventData.end_date) < new Date(eventData.start_date)) {
        toast.error('A data de término deve ser posterior à data de início');
        return;
      }
    }

    setIsSaving(true);
    try {
      // Create client
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert({
          name: clientData.name.trim(),
          email: clientData.email?.trim() || null,
          phone: clientData.phone ? formatPhoneToInternational(clientData.phone) : null,
          address: clientData.address?.trim() || null,
          notes: clientData.notes?.trim() || null,
          client_type: clientData.client_type,
          entity_id: currentEntity.id,
        })
        .select('id')
        .single();

      if (clientError) throw clientError;

      // Create event if panel is open
      if (showEventPanel && newClient) {
        if (eventData.modality === 'rental_only') {
          const { error: rentalError } = await supabase
            .from('rentals')
            .insert({
              entity_id: currentEntity.id,
              title: eventData.title.trim(),
              description: eventData.description.trim() || null,
              departure_date: eventData.start_date,
              return_date: eventData.end_date,
              client_id: newClient.id,
              total_value: eventData.total_value ? parseFloat(eventData.total_value) : 0,
              status: 'pending',
            });

          if (rentalError) throw rentalError;
          toast.success('Cliente e locação criados com sucesso!');
        } else {
          const { data: newEvent, error: eventError } = await supabase
            .from('events')
            .insert({
              entity_id: currentEntity.id,
              title: eventData.title.trim(),
              description: eventData.description.trim() || null,
              event_type: eventData.event_type || null,
              start_date: eventData.start_date,
              end_date: eventData.end_date,
              address: eventData.address.trim() || null,
              client_id: newClient.id,
              total_value: eventData.total_value ? parseFloat(eventData.total_value) : 0,
              status: eventData.modality === 'event_rental' ? 'confirmed' : eventData.status,
            })
            .select('id')
            .single();

          if (eventError) throw eventError;

          // Assign users
          if (selectedUsers.length > 0 && newEvent) {
            const userAssignments = selectedUsers.map(userId => ({
              event_id: newEvent.id,
              user_id: userId,
            }));

            await supabase.from('event_assigned_users').insert(userAssignments);
          }

          const successMessage = eventData.modality === 'event_rental'
            ? 'Cliente e evento com locação criados com sucesso!'
            : 'Cliente e evento criados com sucesso!';
          toast.success(successMessage);
        }
        onEventCreated?.();
      } else {
        toast.success('Cliente criado com sucesso!');
      }

      onClientCreated?.();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      console.error('Error creating:', error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className={cn(
        "transition-all duration-300 flex flex-col p-0",
        showEventPanel 
          ? "max-w-6xl h-[90vh] lg:max-w-6xl md:max-w-2xl sm:max-w-[95vw]" 
          : "max-w-md h-auto max-h-[90vh]"
      )}>
        {/* Fixed Header */}
        <div className={cn(
          "flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b bg-background",
          showEventPanel ? "flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6" : ""
        )}>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-base sm:text-lg">Novo Cliente</DialogTitle>
            {!showEventPanel && (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowEventPanel(true)}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                evento
              </Button>
            )}
          </div>
          {showEventPanel && (
            <div className="flex items-center justify-between lg:border-l lg:pl-6 pt-3 lg:pt-0 border-t lg:border-t-0">
              <div>
                <h3 className="font-semibold text-sm sm:text-base">Novo Evento</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Preencha os dados do evento. Campos com * são obrigatórios.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowEventPanel(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className={cn(
          "flex-1 overflow-y-auto px-4 sm:px-6 py-4",
          showEventPanel ? "flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:gap-6" : ""
        )}>
          {/* Client Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name">Nome *</Label>
                <Input
                  id="client-name"
                  value={clientData.name}
                  onChange={(e) => setClientData({ ...clientData, name: e.target.value })}
                  placeholder="Nome do cliente"
                  className={formErrors.name ? 'border-destructive' : ''}
                />
                {formErrors.name && <p className="text-sm text-destructive">{formErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="client-type">Tipo de Cliente</Label>
                <Select
                  value={clientData.client_type}
                  onValueChange={(value: 'standard' | 'vip' | 'premium') => 
                    setClientData({ ...clientData, client_type: value })
                  }
                >
                  <SelectTrigger id="client-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "inline-flex items-center justify-center w-2 h-2 rounded-full",
                            option.value === 'vip' && "bg-amber-500",
                            option.value === 'premium' && "bg-purple-500",
                            option.value === 'standard' && "bg-muted-foreground"
                          )} />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-email">Email</Label>
              <Input
                id="client-email"
                type="email"
                value={clientData.email}
                onChange={(e) => setClientData({ ...clientData, email: e.target.value })}
                placeholder="email@exemplo.com"
                className={formErrors.email ? 'border-destructive' : ''}
              />
              {formErrors.email && <p className="text-sm text-destructive">{formErrors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-phone">Telefone (WhatsApp)</Label>
              <PhoneInput
                id="client-phone"
                value={clientData.phone || ''}
                onChange={(value) => setClientData({ ...clientData, phone: value })}
                placeholder="5592999106091"
                className={formErrors.phone ? 'border-destructive' : ''}
              />
              <p className="text-xs text-muted-foreground">Formato: 55 + DDD + número</p>
              {formErrors.phone && <p className="text-sm text-destructive">{formErrors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-address">Endereço</Label>
              <Input
                id="client-address"
                value={clientData.address}
                onChange={(e) => setClientData({ ...clientData, address: e.target.value })}
                placeholder="Rua, número, bairro, cidade"
                className={formErrors.address ? 'border-destructive' : ''}
              />
              {formErrors.address && <p className="text-sm text-destructive">{formErrors.address}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="client-notes">Observações</Label>
              <Textarea
                id="client-notes"
                value={clientData.notes}
                onChange={(e) => setClientData({ ...clientData, notes: e.target.value })}
                placeholder="Notas sobre o cliente..."
                rows={3}
                className={formErrors.notes ? 'border-destructive' : ''}
              />
              {formErrors.notes && <p className="text-sm text-destructive">{formErrors.notes}</p>}
            </div>
          </div>

          {/* Event Form */}
          {showEventPanel && (
            <div className="lg:border-l lg:pl-6 space-y-4 pt-4 lg:pt-0 border-t lg:border-t-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="info" className="flex items-center gap-1 text-xs">
                    <Calendar className="h-3 w-3" />
                    Informações
                  </TabsTrigger>
                  <TabsTrigger value="modality" className="flex items-center gap-1 text-xs">
                    <Package className="h-3 w-3" />
                    Modalidade
                  </TabsTrigger>
                  <TabsTrigger value="team" className="flex items-center gap-1 text-xs">
                    <User className="h-3 w-3" />
                    Equipe
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="info" className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Título do Evento *</Label>
                    <Input
                      value={eventData.title}
                      onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                      placeholder="Ex: Festa de 15 Anos - Maria"
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tipo de Evento</Label>
                      <Select
                        value={eventData.event_type}
                        onValueChange={(value) => setEventData({ ...eventData, event_type: value })}
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
                        value={eventData.status}
                        onValueChange={(value) => setEventData({ ...eventData, status: value as EventStatus })}
                        disabled={eventData.modality === 'event_rental' || eventData.modality === 'rental_only'}
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

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label>Data/Hora Início *</Label>
                      <Input
                        type="datetime-local"
                        value={eventData.start_date}
                        onChange={(e) => setEventData({ ...eventData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Data/Hora Término *</Label>
                      <Input
                        type="datetime-local"
                        value={eventData.end_date}
                        onChange={(e) => setEventData({ ...eventData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                      <Label>Cliente</Label>
                      <Input
                        value={clientData.name || 'Novo cliente'}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        O evento será vinculado ao cliente sendo criado.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Total (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={eventData.total_value}
                        onChange={(e) => setEventData({ ...eventData, total_value: e.target.value })}
                        placeholder="0,00"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Endereço do Evento</Label>
                    <Input
                      value={eventData.address}
                      onChange={(e) => setEventData({ ...eventData, address: e.target.value })}
                      placeholder="Ex: Rua das Flores, 123 - São Paulo, SP"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={eventData.description}
                      onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                      placeholder="Detalhes sobre o evento..."
                      rows={2}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="modality" className="mt-4 space-y-4">
                  <div className="space-y-3">
                    <div
                      className={cn(
                        "border-2 rounded-lg p-3 cursor-pointer transition-all",
                        eventData.modality === 'event'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      )}
                      onClick={() => setEventData({ ...eventData, modality: 'event' })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2",
                          eventData.modality === 'event'
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )} />
                        <div>
                          <h4 className="font-medium text-sm">Evento Normal</h4>
                          <p className="text-xs text-muted-foreground">
                            Apenas registro do evento.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "border-2 rounded-lg p-3 cursor-pointer transition-all",
                        eventData.modality === 'event_rental'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      )}
                      onClick={() => setEventData({ ...eventData, modality: 'event_rental', status: 'confirmed' })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2",
                          eventData.modality === 'event_rental'
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )} />
                        <div>
                          <h4 className="font-medium text-sm">Evento + Locação</h4>
                          <p className="text-xs text-muted-foreground">
                            Locação criada automaticamente.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "border-2 rounded-lg p-3 cursor-pointer transition-all",
                        eventData.modality === 'rental_only'
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-muted-foreground"
                      )}
                      onClick={() => setEventData({ ...eventData, modality: 'rental_only', status: 'confirmed' })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-4 h-4 rounded-full border-2",
                          eventData.modality === 'rental_only'
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        )} />
                        <div>
                          <h4 className="font-medium text-sm">Apenas Locação</h4>
                          <p className="text-xs text-muted-foreground">
                            Sem evento associado.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="team" className="mt-4 space-y-4 flex-1 flex flex-col">
                  <p className="text-xs text-muted-foreground">
                    Selecione os membros da equipe para este evento.
                  </p>

                  {!eventData.start_date || !eventData.end_date ? (
                    <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col items-center justify-center">
                      <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Defina as datas primeiro.</p>
                    </div>
                  ) : entityUsers.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col items-center justify-center">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-xs">Nenhum usuário encontrado.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto border rounded-lg p-3 bg-muted/20">
                      {entityUsers.map((user) => (
                        <div
                          key={user.id}
                          className={cn(
                            "flex items-center justify-between p-2 rounded-lg border transition-all",
                            user.isAvailable
                              ? "hover:bg-muted/50 cursor-pointer"
                              : "opacity-50 cursor-not-allowed bg-muted/30",
                            selectedUsers.includes(user.user_id) && user.isAvailable && "border-primary bg-primary/5"
                          )}
                          onClick={() => handleUserToggle(user.user_id, user.isAvailable)}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedUsers.includes(user.user_id)}
                              disabled={!user.isAvailable}
                            />
                            <div>
                              <p className="font-medium text-sm">{user.name}</p>
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          {!user.isAvailable && user.conflictEvent && (
                            <Badge variant="secondary" className="text-xs">
                              Ocupado
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedUsers.length > 0 && (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      {selectedUsers.length} usuário(s) selecionado(s)
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="flex-shrink-0 flex justify-between px-6 py-4 border-t bg-background">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
