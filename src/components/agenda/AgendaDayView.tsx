import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { 
  format, 
  isSameDay,
  addDays,
  subDays,
  addMonths,
  subMonths,
  isToday,
  eachHourOfInterval,
  setHours,
  getHours
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<EventStatus, string> = {
  budget: 'bg-muted-foreground/60',
  confirmed: 'bg-success',
  in_assembly: 'bg-info',
  in_transit: 'bg-warning',
  finished: 'bg-secondary-foreground/30',
};

interface AgendaDayViewProps {
  events: Event[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onEventClick?: (event: Event) => void;
  onAddEvent?: (date: Date, hour: number) => void;
}

export function AgendaDayView({ 
  events, 
  selectedDate,
  onDateChange,
  onEventClick,
  onAddEvent
}: AgendaDayViewProps) {
  const [hoveredHour, setHoveredHour] = useState<number | null>(null);
  
  const hours = eachHourOfInterval({
    start: setHours(selectedDate, 6),
    end: setHours(selectedDate, 21)
  });

  const dayEvents = events.filter((event) => isSameDay(new Date(event.startDate), selectedDate));

  const getEventsForHour = (hour: Date) => {
    return dayEvents.filter(event => {
      const eventHour = getHours(new Date(event.startDate));
      return eventHour === getHours(hour);
    });
  };

  const handleHourClick = (hour: Date) => {
    onAddEvent?.(selectedDate, getHours(hour));
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDateChange(subMonths(selectedDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDateChange(addMonths(selectedDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Day subheader */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="text-foreground font-medium capitalize">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </span>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDateChange(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onDateChange(addDays(selectedDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => onAddEvent?.(selectedDate, 10)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo Evento
        </Button>
      </div>

      {/* Time grid */}
      <div className="max-h-[calc(100vh-350px)] overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          const hourValue = getHours(hour);
          const isHovered = hoveredHour === hourValue;
          
          return (
            <div 
              key={hour.toISOString()} 
              className="flex border-b border-border last:border-b-0 group"
              onMouseEnter={() => setHoveredHour(hourValue)}
              onMouseLeave={() => setHoveredHour(null)}
            >
              <div className="w-16 py-3 px-3 text-xs text-muted-foreground flex-shrink-0 text-right">
                {format(hour, 'HH:mm')}
              </div>
              <div 
                className={cn(
                  'flex-1 min-h-[48px] border-l border-border relative cursor-pointer transition-colors',
                  hourEvents.length === 0 && 'hover:bg-muted/30'
                )}
                onClick={() => hourEvents.length === 0 && handleHourClick(hour)}
              >
                {hourEvents.length > 0 ? (
                  <div className="p-1.5">
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(event);
                        }}
                        className={cn(
                          'rounded-lg px-3 py-2 mb-1 last:mb-0 cursor-pointer transition-transform hover:scale-[1.01]',
                          statusColors[event.status]
                        )}
                      >
                        <div className="text-sm font-medium text-primary-foreground">
                          {event.title}
                        </div>
                        <div className="text-xs text-primary-foreground/80 mt-0.5">
                          {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
                        </div>
                        {event.client && (
                          <div className="text-xs text-primary-foreground/70 mt-0.5">
                            {event.client.name}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cn(
                    'absolute inset-0 flex items-center justify-center transition-opacity',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      Clique para adicionar
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
