import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateRentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

interface Client {
  id: string;
  name: string;
}

export function CreateRentalDialog({ open, onOpenChange, onSuccess }: CreateRentalDialogProps) {
  const { currentEntity } = useEntity();
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_id: '',
    client_id: '',
    departure_date: '',
    return_date: '',
    notes: '',
  });

  useEffect(() => {
    if (open && currentEntity?.id) {
      fetchData();
    }
  }, [open, currentEntity?.id]);

  const fetchData = async () => {
    try {
      const [eventsRes, clientsRes] = await Promise.all([
        supabase
          .from('events')
          .select('id, title, start_date, end_date')
          .eq('entity_id', currentEntity!.id)
          .order('start_date', { ascending: false }),
        supabase
          .from('clients')
          .select('id, name')
          .eq('entity_id', currentEntity!.id)
          .order('name'),
      ]);

      if (eventsRes.data) setEvents(eventsRes.data);
      if (clientsRes.data) setClients(clientsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const handleEventSelect = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (event) {
      setFormData(prev => ({
        ...prev,
        event_id: eventId,
        title: prev.title || event.title,
        departure_date: event.start_date.split('T')[0],
        return_date: event.end_date.split('T')[0],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('rentals').insert({
        entity_id: currentEntity!.id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        event_id: formData.event_id || null,
        client_id: formData.client_id || null,
        departure_date: formData.departure_date || null,
        return_date: formData.return_date || null,
        notes: formData.notes.trim() || null,
        status: 'draft',
      });

      if (error) throw error;

      toast.success('Locação criada com sucesso');
      setFormData({
        title: '',
        description: '',
        event_id: '',
        client_id: '',
        departure_date: '',
        return_date: '',
        notes: '',
      });
      onSuccess();
    } catch (error) {
      console.error('Error creating rental:', error);
      toast.error('Erro ao criar locação');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Locação</DialogTitle>
          <DialogDescription>
            Crie uma nova locação para gerenciar o aluguel de itens
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Nome da locação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event">Evento (opcional)</Label>
            <Select
              value={formData.event_id}
              onValueChange={handleEventSelect}
            >
              <SelectTrigger>
                <SelectValue placeholder="Vincular a um evento" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="client">Cliente (opcional)</Label>
            <Select
              value={formData.client_id}
              onValueChange={(value) => setFormData({ ...formData, client_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar cliente" />
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure_date">Data de Saída</Label>
              <Input
                id="departure_date"
                type="date"
                value={formData.departure_date}
                onChange={(e) => setFormData({ ...formData, departure_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="return_date">Data de Retorno</Label>
              <Input
                id="return_date"
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição da locação"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações adicionais"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="gradient-primary border-0">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Locação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
