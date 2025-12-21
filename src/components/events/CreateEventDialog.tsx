import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import { EventStatus } from '@/types';
import { format } from 'date-fns';

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
