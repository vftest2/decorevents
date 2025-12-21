import { Calendar, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<EventStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  budget: { label: 'Orçamento', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  in_assembly: { label: 'Em Montagem', variant: 'secondary' },
  in_transit: { label: 'Em Trânsito', variant: 'secondary' },
  finished: { label: 'Finalizado', variant: 'outline' },
};

interface RecentEventsProps {
  events: Event[];
}

export function RecentEvents({ events }: RecentEventsProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Calendar className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Nenhum evento ainda</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Comece criando seu primeiro evento!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div
          key={event.id}
          className="group flex items-center gap-4 rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-primary/30 hover:shadow-md animate-slide-up cursor-pointer"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex h-14 w-14 flex-shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
            <span className="text-lg font-bold">
              {format(new Date(event.startDate), 'dd')}
            </span>
            <span className="text-[10px] font-medium uppercase">
              {format(new Date(event.startDate), 'MMM', { locale: ptBR })}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {event.title}
              </h4>
              <Badge variant={statusConfig[event.status].variant} className="flex-shrink-0">
                {statusConfig[event.status].label}
              </Badge>
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1 truncate">
                <User className="h-3 w-3" />
                {event.client?.name || 'Cliente'}
              </span>
              <span className="flex items-center gap-1 truncate">
                <MapPin className="h-3 w-3" />
                {event.address}
              </span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-semibold text-foreground">
              R$ {event.totalValue.toLocaleString('pt-BR')}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(event.startDate), 'HH:mm')}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
