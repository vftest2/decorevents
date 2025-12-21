import { useState, useEffect } from 'react';
import { Loader2, User, Package, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import { EventStatus } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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

interface CreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  defaultHour?: number;
  onEventCreated?: () => void;
}

export function CreateEventDialog({ 
  open, 
  onOpenChange, 
  defaultDate,
  defaultHour,
  onEventCreated 
}: CreateEventDialogProps) {
  const { currentEntity } = useEntity();
  const [clients, setClients] = useState<Client[]>([]);
  const [entityUsers, setEntityUsers] = useState<EntityUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
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
    modality: 'event' as 'event' | 'rental',
  });

  useEffect(() => {
    if (open && currentEntity?.id) {
      fetchClients();
      if (defaultDate) {
        const startHour = defaultHour ?? 10;
        const endHour = startHour + 8 > 23 ? 23 : startHour + 8;
        const formattedDate = format(defaultDate, `yyyy-MM-dd'T'${String(startHour).padStart(2, '0')}:00`);
        const formattedEndDate = format(defaultDate, `yyyy-MM-dd'T'${String(endHour).padStart(2, '0')}:00`);
        setFormData(prev => ({
          ...prev,
          start_date: formattedDate,
          end_date: formattedEndDate,
        }));
      }
    }
  }, [open, currentEntity?.id, defaultDate]);

  // Fetch users when dates change
  useEffect(() => {
    if (open && currentEntity?.id && formData.start_date && formData.end_date) {
      fetchEntityUsersWithAvailability();
    }
  }, [open, currentEntity?.id, formData.start_date, formData.end_date]);

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
    if (!currentEntity?.id || !formData.start_date || !formData.end_date) return;

    try {
      // Fetch entity users
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

      // Check for conflicting events for each user
      const startDate = new Date(formData.start_date).toISOString();
      const endDate = new Date(formData.end_date).toISOString();

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

      // Determine availability for each user
      const usersWithAvailability: EntityUser[] = profiles.map(profile => {
        const userConflicts = conflictingAssignments?.filter(assignment => {
          if (assignment.user_id !== profile.user_id) return false;
          
          const event = assignment.events as any;
          if (!event) return false;

          const eventStart = new Date(event.start_date);
          const eventEnd = new Date(event.end_date);
          const newStart = new Date(startDate);
          const newEnd = new Date(endDate);

          // Check for overlap
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
      modality: 'event',
    });
    setSelectedUsers([]);
    setActiveTab('info');
  };

  const handleUserToggle = (userId: string, isAvailable: boolean) => {
    if (!isAvailable) return;

    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
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
      // Create the event
      const { data: newEvent, error } = await supabase
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
          status: formData.modality === 'rental' ? 'confirmed' : formData.status,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Assign selected users to the event
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
          toast.warning('Evento criado, mas houve erro ao atribuir usuários');
        }
      }

      const successMessage = formData.modality === 'rental' 
        ? 'Evento com locação criado com sucesso! A locação será gerada automaticamente.'
        : 'Evento criado com sucesso!';
      
      toast.success(successMessage);
      onOpenChange(false);
      resetForm();
      onEventCreated?.();
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Erro ao criar evento');
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Evento</DialogTitle>
          <DialogDescription>Preencha os dados do evento. Campos com * são obrigatórios.</DialogDescription>
        </DialogHeader>
        
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
                  disabled={formData.modality === 'rental'}
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
                {formData.modality === 'rental' && (
                  <p className="text-xs text-muted-foreground">
                    Status será automaticamente "Confirmado" para gerar a locação.
                  </p>
                )}
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
          </TabsContent>

          <TabsContent value="modality" className="mt-4 space-y-4">
            <div className="space-y-4">
              <Label>Modalidade do Evento</Label>
              <p className="text-sm text-muted-foreground">
                Escolha se este evento terá uma locação de itens vinculada automaticamente.
              </p>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div 
                  className={cn(
                    "border-2 rounded-lg p-4 cursor-pointer transition-all",
                    formData.modality === 'event' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-muted-foreground"
                  )}
                  onClick={() => setFormData({ ...formData, modality: 'event' })}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2",
                      formData.modality === 'event' 
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
                    formData.modality === 'rental' 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-muted-foreground"
                  )}
                  onClick={() => setFormData({ ...formData, modality: 'rental', status: 'confirmed' })}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2",
                      formData.modality === 'rental' 
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
              </div>

              {formData.modality === 'rental' && (
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Importante:</strong> Ao selecionar esta opção, o evento será criado com status 
                    "Confirmado" e uma locação vinculada será gerada automaticamente. Você poderá 
                    adicionar itens à locação depois na página de detalhes do evento.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="team" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label>Atribuir Equipe</Label>
              <p className="text-sm text-muted-foreground">
                Selecione os membros da equipe para este evento. Usuários indisponíveis (em outro evento no mesmo horário) aparecem em cinza.
              </p>
            </div>

            {!formData.start_date || !formData.end_date ? (
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleCreate} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
