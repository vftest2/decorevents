import { Calendar, Clock, MapPin, User, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  budget: { 
    label: 'Orçamento', 
    className: 'bg-muted text-muted-foreground border-muted-foreground/20' 
  },
  confirmed: { 
    label: 'Confirmado', 
    className: 'bg-success/10 text-success border-success/20' 
  },
  in_assembly: { 
    label: 'Em Montagem', 
    className: 'bg-info/10 text-info border-info/20' 
  },
  in_transit: { 
    label: 'Em Trânsito', 
    className: 'bg-warning/10 text-warning border-warning/20' 
  },
  finished: { 
    label: 'Finalizado', 
    className: 'bg-secondary text-secondary-foreground border-border' 
  },
};

interface EventCardProps {
  event: Event;
  onClick?: () => void;
  index?: number;
}

export function EventCard({ event, onClick, index = 0 }: EventCardProps) {
  const status = statusConfig[event.status];

  return (
    <div
      onClick={onClick}
      className="group relative overflow-hidden rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:border-primary/30 hover:shadow-lg cursor-pointer animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Status indicator bar */}
      <div className={cn(
        'absolute left-0 top-0 h-full w-1 transition-all duration-300 group-hover:w-1.5',
        event.status === 'confirmed' && 'bg-success',
        event.status === 'budget' && 'bg-muted-foreground',
        event.status === 'in_assembly' && 'bg-info',
        event.status === 'in_transit' && 'bg-warning',
        event.status === 'finished' && 'bg-secondary-foreground/30',
      )} />

      <div className="ml-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {event.title}
            </h3>
            <p className="text-sm text-muted-foreground truncate">
              {event.eventType} {event.theme && `• ${event.theme}`}
            </p>
          </div>
          <Badge className={cn('flex-shrink-0 border', status.className)}>
            {status.label}
          </Badge>
        </div>

        {/* Details */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>
              {format(new Date(event.startDate), "dd 'de' MMMM", { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <span>
              {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{event.address}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{event.client?.name || 'Cliente não definido'}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Package className="h-4 w-4" />
            <span>{event.items.length} itens</span>
          </div>
          <p className="font-semibold text-foreground">
            R$ {event.totalValue.toLocaleString('pt-BR')}
          </p>
        </div>
      </div>
    </div>
  );
}
