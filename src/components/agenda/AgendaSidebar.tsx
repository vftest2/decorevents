import { Plus, User, Clock, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig: Record<EventStatus, { label: string; color: string }> = {
  budget: { label: 'Orçamento', color: 'bg-muted-foreground/60 text-primary-foreground' },
  confirmed: { label: 'Confirmado', color: 'bg-success text-primary-foreground' },
  in_assembly: { label: 'Em Montagem', color: 'bg-info text-primary-foreground' },
  in_transit: { label: 'Em Trânsito', color: 'bg-warning text-primary-foreground' },
  finished: { label: 'Finalizado', color: 'bg-secondary-foreground/30 text-primary-foreground' },
};

interface AgendaSidebarProps {
  selectedDate: Date;
  events: Event[];
  onAddEvent?: () => void;
  onEventClick?: (event: Event) => void;
}

export function AgendaSidebar({ selectedDate, events, onAddEvent, onEventClick }: AgendaSidebarProps) {
  const dayEvents = events.filter((event) => isSameDay(new Date(event.startDate), selectedDate));

  return (
    <div className="w-full lg:w-80 space-y-4">
      {/* Selected Day Header */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">
            {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
          </h3>
          <Button size="sm" onClick={onAddEvent}>
            <Plus className="h-4 w-4 mr-1" />
            Evento
          </Button>
        </div>

        {/* Day Events */}
        {dayEvents.length > 0 ? (
          <div className="space-y-3">
            {dayEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className="p-3 rounded-lg border border-border bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-foreground text-sm">{event.title}</h4>
                  <Badge className={cn('text-xs shrink-0', statusConfig[event.status].color)}>
                    {statusConfig[event.status].label}
                  </Badge>
                </div>
                
                {event.client && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span>{event.client.name}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>{format(new Date(event.startDate), 'HH:mm')}</span>
                </div>
                
                {event.address && (
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{event.address}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground text-sm">
            Nenhum evento neste dia
          </div>
        )}
      </div>

      {/* Status Legend */}
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="font-semibold text-foreground mb-3">Legenda de Status</h3>
        <div className="space-y-2">
          {Object.entries(statusConfig).map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded', config.color.split(' ')[0])} />
              <span className="text-sm text-muted-foreground">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
