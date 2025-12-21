import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react';
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
  eachHourOfInterval,
  setHours,
  getHours,
  differenceInHours
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<EventStatus, { bg: string; border: string }> = {
  budget: { bg: 'bg-muted-foreground/10', border: 'border-l-muted-foreground' },
  confirmed: { bg: 'bg-success/10', border: 'border-l-success' },
  in_assembly: { bg: 'bg-info/10', border: 'border-l-info' },
  in_transit: { bg: 'bg-warning/10', border: 'border-l-warning' },
  finished: { bg: 'bg-secondary-foreground/10', border: 'border-l-secondary-foreground/50' },
};

const HOUR_HEIGHT = 48; // Height of each hour row in pixels

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
  
  const startHour = 6;
  const endHour = 21;
  
  const hours = eachHourOfInterval({
    start: setHours(selectedDate, startHour),
    end: setHours(selectedDate, endHour)
  });

  const dayEvents = events.filter((event) => isSameDay(new Date(event.startDate), selectedDate));

  // Check if a specific hour is occupied by any event (for spanning events)
  const isHourOccupied = (hourValue: number) => {
    return dayEvents.some(event => {
      const eventStartHour = getHours(new Date(event.startDate));
      const eventEndHour = getHours(new Date(event.endDate));
      return hourValue >= eventStartHour && hourValue < eventEndHour;
    });
  };

  // Get event that starts at this hour
  const getEventStartingAtHour = (hourValue: number) => {
    return dayEvents.find(event => {
      const eventStartHour = getHours(new Date(event.startDate));
      return eventStartHour === hourValue;
    });
  };

  // Check if this hour is part of an event's span (but not the start)
  const isHourPartOfEventSpan = (hourValue: number) => {
    return dayEvents.some(event => {
      const eventStartHour = getHours(new Date(event.startDate));
      const eventEndHour = getHours(new Date(event.endDate));
      return hourValue > eventStartHour && hourValue < eventEndHour;
    });
  };

  const handleHourClick = (hour: Date) => {
    const hourValue = getHours(hour);
    if (!isHourOccupied(hourValue)) {
      onAddEvent?.(selectedDate, hourValue);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground capitalize">
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
      <div className="max-h-[calc(100vh-350px)] overflow-y-auto relative">
        {hours.map((hour) => {
          const hourValue = getHours(hour);
          const isHovered = hoveredHour === hourValue;
          const eventAtHour = getEventStartingAtHour(hourValue);
          const isPartOfSpan = isHourPartOfEventSpan(hourValue);
          const occupied = isHourOccupied(hourValue);
          
          // Calculate event duration in hours for spanning
          const eventDuration = eventAtHour 
            ? Math.max(1, differenceInHours(new Date(eventAtHour.endDate), new Date(eventAtHour.startDate)))
            : 0;
          
          return (
            <div 
              key={hour.toISOString()} 
              className="flex border-b border-border last:border-b-0 group"
              style={{ minHeight: HOUR_HEIGHT }}
              onMouseEnter={() => setHoveredHour(hourValue)}
              onMouseLeave={() => setHoveredHour(null)}
            >
              <div className="w-16 py-3 px-3 text-xs text-muted-foreground flex-shrink-0 text-right">
                {format(hour, 'HH:mm')}
              </div>
              <div 
                className={cn(
                  'flex-1 border-l border-border relative transition-colors',
                  !occupied && 'cursor-pointer hover:bg-muted/30',
                  isPartOfSpan && 'bg-muted/10'
                )}
                onClick={() => handleHourClick(hour)}
              >
                {eventAtHour && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(eventAtHour);
                    }}
                    className={cn(
                      'absolute left-0 right-0 mx-1 rounded-lg border-l-4 cursor-pointer transition-shadow hover:shadow-md z-10',
                      statusColors[eventAtHour.status].bg,
                      statusColors[eventAtHour.status].border
                    )}
                    style={{
                      top: 2,
                      height: eventDuration * HOUR_HEIGHT - 4,
                    }}
                  >
                    <div className="p-2">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <span className="text-base">🎉</span>
                        {eventAtHour.title}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(eventAtHour.startDate), 'HH:mm')} - {format(new Date(eventAtHour.endDate), 'HH:mm')}
                      </div>
                      {eventAtHour.client && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {eventAtHour.client.name}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                {!occupied && (
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
