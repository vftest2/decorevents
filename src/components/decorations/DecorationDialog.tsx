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
import { DecorationItem, DecorationStatus, DECORATION_STATUS_LABELS } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

const decorationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(255),
  description: z.string().max(1000).optional(),
  quantity: z.string().min(1, 'Quantidade é obrigatória'),
  unit_price: z.string().optional(),
  status: z.enum(['pending', 'in_transit', 'delivered', 'installed', 'returned']),
  notes: z.string().max(1000).optional(),
});

type DecorationForm = z.infer<typeof decorationSchema>;

interface DecorationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decoration: DecorationItem | null;
  eventId: string;
  onSuccess: () => void;
}

export function DecorationDialog({ open, onOpenChange, decoration, eventId, onSuccess }: DecorationDialogProps) {
  const { profile } = useAuth();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DecorationForm>({
    resolver: zodResolver(decorationSchema),
    defaultValues: {
      status: 'pending',
      quantity: '1',
    },
  });

  useEffect(() => {
    if (decoration) {
      reset({
        name: decoration.name,
        description: decoration.description || '',
        quantity: decoration.quantity.toString(),
        unit_price: decoration.unit_price?.toString() || '',
        status: decoration.status,
        notes: decoration.notes || '',
      });
    } else {
      reset({
        name: '',
        description: '',
        quantity: '1',
        unit_price: '',
        status: 'pending',
        notes: '',
      });
    }
  }, [decoration, reset]);

  const onSubmit = async (data: DecorationForm) => {
    if (!profile?.entity_id) return;

    try {
      const decorationData = {
        entity_id: profile.entity_id,
        event_id: eventId,
        name: data.name,
        description: data.description || null,
        quantity: parseInt(data.quantity),
        unit_price: data.unit_price ? parseFloat(data.unit_price) : null,
        status: data.status as DecorationStatus,
        notes: data.notes || null,
      };

      if (decoration) {
        const { error } = await supabase
          .from('decoration_items')
          .update(decorationData)
          .eq('id', decoration.id);

        if (error) throw error;

        toast({
          title: 'Item atualizado',
          description: 'As alterações foram salvas com sucesso',
        });
      } else {
        const { error } = await supabase.from('decoration_items').insert(decorationData);

        if (error) throw error;

        toast({
          title: 'Item adicionado',
          description: 'O item foi adicionado com sucesso',
        });
      }

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving decoration:', error);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Não foi possível salvar o item',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">
            {decoration ? 'Editar Item' : 'Novo Item de Decoração'}
          </DialogTitle>
          <DialogDescription>
            {decoration ? 'Atualize as informações do item' : 'Adicione um novo item de decoração ao evento'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Item *</Label>
            <Input
              id="name"
              placeholder="Ex: Arranjo de Flores"
              {...register('name')}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Detalhes do item..."
              rows={2}
              {...register('description')}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantidade *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                {...register('quantity')}
                className={errors.quantity ? 'border-destructive' : ''}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit_price">Preço Unitário (R$)</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                placeholder="0,00"
                {...register('unit_price')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as DecorationStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(DECORATION_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionais..."
              rows={2}
              {...register('notes')}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
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
              {isSubmitting ? 'Salvando...' : decoration ? 'Salvar' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
