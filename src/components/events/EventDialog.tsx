import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EventStatus, EVENT_STATUS_LABELS } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const eventSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  description: z.string().max(1000).optional(),
  client_name: z.string().max(255).optional(),
  client_phone: z.string().max(20).optional(),
  client_email: z.string().email('Email inválido').max(255).optional().or(z.literal('')),
  event_date: z.string().min(1, 'Data é obrigatória'),
  event_time: z.string().optional(),
  location: z.string().max(500).optional(),
  address: z.string().max(1000).optional(),
  status: z.enum(['planning', 'in_progress', 'assembly', 'completed', 'cancelled']),
  budget: z.string().optional(),
  notes: z.string().max(2000).optional(),
});

type EventForm = z.infer<typeof eventSchema>;

interface EventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event | null;
  onSuccess: () => void;
}

export function EventDialog({ open, onOpenChange, event, onSuccess }: EventDialogProps) {
  const { profile, user } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      status: 'planning',
    },
  });

  useEffect(() => {
    if (event) {
      reset({
        name: event.name,
        description: event.description || '',
        client_name: event.client_name || '',
        client_phone: event.client_phone || '',
        client_email: event.client_email || '',
        event_date: event.event_date,
        event_time: event.event_time || '',
        location: event.location || '',
        address: event.address || '',
        status: event.status,
        budget: event.budget?.toString() || '',
        notes: event.notes || '',
      });
    } else {
      reset({
        name: '',
        description: '',
        client_name: '',
        client_phone: '',
        client_email: '',
        event_date: '',
        event_time: '',
        location: '',
        address: '',
        status: 'planning',
        budget: '',
        notes: '',
      });
    }
  }, [event, reset]);

  const onSubmit = async (data: EventForm) => {
    if (!profile?.entity_id) return;

    try {
      const eventData = {
        entity_id: profile.entity_id,
        name: data.name,
        description: data.description || null,
        client_name: data.client_name || null,
        client_phone: data.client_phone || null,
        client_email: data.client_email || null,
        event_date: data.event_date,
        event_time: data.event_time || null,
        location: data.location || null,
        address: data.address || null,
        status: data.status as EventStatus,
        budget: data.budget ? parseFloat(data.budget) : null,
        notes: data.notes || null,
        created_by: user?.id || null,
      };

      if (event) {
        const { error } = await supabase
          .from('events')
          .update(eventData)
          .eq('id', event.id);

        if (error) throw error;

        toast({
          title: 'Evento atualizado',
          description: 'As alterações foram salvas com sucesso',
        });
      } else {
        const { error } = await supabase.from('events').insert(eventData);

        if (error) throw error;

        toast({
          title: 'Evento criado',
          description: 'O evento foi criado com sucesso',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar o evento',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {event ? 'Editar Evento' : 'Novo Evento'}
          </DialogTitle>
          <DialogDescription>
            {event ? 'Atualize as informações do evento' : 'Preencha as informações para criar um novo evento'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="name">Nome do Evento *</Label>
              <Input
                id="name"
                placeholder="Ex: Casamento João e Maria"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Detalhes sobre o evento..."
                rows={3}
                {...register('description')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_date">Data do Evento *</Label>
              <Input
                id="event_date"
                type="date"
                {...register('event_date')}
                className={errors.event_date ? 'border-destructive' : ''}
              />
              {errors.event_date && (
                <p className="text-sm text-destructive">{errors.event_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="event_time">Horário</Label>
              <Input
                id="event_time"
                type="time"
                {...register('event_time')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                placeholder="Nome do local"
                {...register('location')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={watch('status')}
                onValueChange={(value) => setValue('status', value as EventStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="address">Endereço Completo</Label>
              <Textarea
                id="address"
                placeholder="Rua, número, bairro, cidade..."
                rows={2}
                {...register('address')}
              />
            </div>

            <div className="sm:col-span-2">
              <h4 className="font-medium text-foreground mb-3">Dados do Cliente</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="client_name">Nome</Label>
                  <Input
                    id="client_name"
                    placeholder="Nome do cliente"
                    {...register('client_name')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_phone">Telefone</Label>
                  <Input
                    id="client_phone"
                    placeholder="(11) 99999-9999"
                    {...register('client_phone')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="client_email">Email</Label>
                  <Input
                    id="client_email"
                    type="email"
                    placeholder="email@exemplo.com"
                    {...register('client_email')}
                    className={errors.client_email ? 'border-destructive' : ''}
                  />
                  {errors.client_email && (
                    <p className="text-sm text-destructive">{errors.client_email.message}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Orçamento (R$)</Label>
              <Input
                id="budget"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...register('budget')}
              />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                placeholder="Notas adicionais..."
                rows={3}
                {...register('notes')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-gradient-warm hover:opacity-90"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : event ? 'Salvar Alterações' : 'Criar Evento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
