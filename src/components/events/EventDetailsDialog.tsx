import { useState } from 'react';
import { Trash2, Edit, Clock, MapPin, User, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusConfig: Record<EventStatus, { label: string; color: string }> = {
  budget: { label: 'Orçamento', color: 'bg-muted-foreground/60 text-primary-foreground' },
  confirmed: { label: 'Confirmado', color: 'bg-success text-primary-foreground' },
  in_assembly: { label: 'Em Montagem', color: 'bg-info text-primary-foreground' },
  in_transit: { label: 'Em Trânsito', color: 'bg-warning text-primary-foreground' },
  finished: { label: 'Finalizado', color: 'bg-secondary-foreground/30 text-primary-foreground' },
};

interface EventDetailsDialogProps {
  event: Event | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEventDeleted?: () => void;
  onEventEdit?: (event: Event) => void;
}

export function EventDetailsDialog({ 
  event, 
  open, 
  onOpenChange,
  onEventDeleted,
  onEventEdit
}: EventDetailsDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!event) return null;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', event.id);

      if (error) throw error;

      toast.success('Evento excluído com sucesso!');
      onOpenChange(false);
      onEventDeleted?.();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Erro ao excluir evento');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-xl">{event.title}</DialogTitle>
                <DialogDescription className="mt-1">
                  {event.eventType && <span>{event.eventType}</span>}
                </DialogDescription>
              </div>
              <span className={cn('text-xs px-2.5 py-1 rounded-full shrink-0', statusConfig[event.status].color)}>
                {statusConfig[event.status].label}
              </span>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date and Time */}
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium text-foreground">
                  {format(new Date(event.startDate), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
                </p>
              </div>
            </div>

            {/* Client */}
            {event.client && (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">{event.client.name}</p>
                  {event.client.phone && (
                    <p className="text-sm text-muted-foreground">{event.client.phone}</p>
                  )}
                </div>
              </div>
            )}

            {/* Address */}
            {event.address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                <p className="text-foreground">{event.address}</p>
              </div>
            )}

            {/* Description */}
            {event.description && (
              <div className="pt-2 border-t border-border">
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            )}

            {/* Value */}
            {event.totalValue > 0 && (
              <div className="pt-2 border-t border-border">
                <p className="text-lg font-semibold text-foreground">
                  R$ {event.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 sm:gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Excluir
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir evento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o evento "{event.title}"? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
