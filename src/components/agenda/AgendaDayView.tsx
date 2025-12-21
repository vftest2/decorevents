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
  startOfDay,
  endOfDay,
  isWithinInterval,
  isBefore,
  isAfter,
  differenceInMinutes
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<EventStatus, { bg: string; border: string }> = {
  budget: { bg: 'bg-muted-foreground/10', border: 'border-l-muted-foreground' },
  confirmed: { bg: 'bg-success/10', border: 'border-l-success' },
  in_assembly: { bg: 'bg-info/10', border: 'border-l-info' },
  in_transit: { bg: 'bg-warning/10', border: 'border-l-warning' },
  finished: { bg: 'bg-secondary-foreground/10', border: 'border-l-secondary-foreground/50' },
};

const HOUR_HEIGHT = 40; // Height of each hour row in pixels

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
  
  // Full 24 hours (00:00 to 23:00)
  const hours = eachHourOfInterval({
    start: setHours(startOfDay(selectedDate), 0),
    end: setHours(startOfDay(selectedDate), 23)
  });

  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);

  // Get all events that occur on this day (including multi-day events)
  const dayEvents = events.filter((event) => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);
    
    // Event starts on this day
    if (isSameDay(eventStart, selectedDate)) return true;
    
    // Event ends on this day
    if (isSameDay(eventEnd, selectedDate)) return true;
    
    // Event spans across this day (starts before, ends after)
    if (isBefore(eventStart, dayStart) && isAfter(eventEnd, dayEnd)) return true;
    
    // Event is within this day's range
    return isWithinInterval(dayStart, { start: eventStart, end: eventEnd }) ||
           isWithinInterval(dayEnd, { start: eventStart, end: eventEnd });
  });

  // Get the effective start hour for an event on this day
  const getEffectiveStartHour = (event: Event): number => {
    const eventStart = new Date(event.startDate);
    if (isSameDay(eventStart, selectedDate)) {
      return getHours(eventStart);
    }
    // Event started on a previous day, so it starts at 00:00 on this day
    return 0;
  };

  // Get the effective end hour for an event on this day
  const getEffectiveEndHour = (event: Event): number => {
    const eventEnd = new Date(event.endDate);
    if (isSameDay(eventEnd, selectedDate)) {
      return getHours(eventEnd);
    }
    // Event ends on a future day, so it ends at 23:59 on this day
    return 24;
  };

  // Check if a specific hour is occupied by any event
  const isHourOccupied = (hourValue: number) => {
    return dayEvents.some(event => {
      const startHour = getEffectiveStartHour(event);
      const endHour = getEffectiveEndHour(event);
      return hourValue >= startHour && hourValue < endHour;
    });
  };

  // Get event that starts at this hour (or continues from previous day at hour 0)
  const getEventStartingAtHour = (hourValue: number): Event | undefined => {
    return dayEvents.find(event => {
      const effectiveStart = getEffectiveStartHour(event);
      return effectiveStart === hourValue;
    });
  };

  // Calculate the height of an event block in pixels
  const getEventHeight = (event: Event): number => {
    const startHour = getEffectiveStartHour(event);
    const endHour = getEffectiveEndHour(event);
    const duration = endHour - startHour;
    return Math.max(1, duration) * HOUR_HEIGHT - 4;
  };

  // Check if event is a continuation from previous day
  const isContinuationFromPreviousDay = (event: Event): boolean => {
    const eventStart = new Date(event.startDate);
    return isBefore(eventStart, dayStart);
  };

  // Check if event continues to next day
  const continuesNextDay = (event: Event): boolean => {
    const eventEnd = new Date(event.endDate);
    return isAfter(eventEnd, dayEnd);
  };

  const handleHourClick = (hourValue: number) => {
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
          const occupied = isHourOccupied(hourValue);
          
          return (
            <div 
              key={hour.toISOString()} 
              className="flex border-b border-border last:border-b-0 group"
              style={{ minHeight: HOUR_HEIGHT }}
              onMouseEnter={() => setHoveredHour(hourValue)}
              onMouseLeave={() => setHoveredHour(null)}
            >
              <div className="w-16 py-2 px-3 text-xs text-muted-foreground flex-shrink-0 text-right">
                {format(hour, 'HH:mm')}
              </div>
              <div 
                className={cn(
                  'flex-1 border-l border-border relative transition-colors',
                  !occupied && 'cursor-pointer hover:bg-muted/30'
                )}
                onClick={() => handleHourClick(hourValue)}
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
                      statusColors[eventAtHour.status].border,
                      isContinuationFromPreviousDay(eventAtHour) && 'rounded-t-none',
                      continuesNextDay(eventAtHour) && 'rounded-b-none'
                    )}
                    style={{
                      top: 2,
                      height: getEventHeight(eventAtHour),
                    }}
                  >
                    <div className="p-2">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                        <span className="text-base">🎉</span>
                        {eventAtHour.title}
                        {(isContinuationFromPreviousDay(eventAtHour) || continuesNextDay(eventAtHour)) && (
                          <span className="text-xs text-muted-foreground ml-1">
                            {isContinuationFromPreviousDay(eventAtHour) && '(cont.)'}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <Clock className="h-3 w-3" />
                        {format(new Date(eventAtHour.startDate), "dd/MM HH:mm")} - {format(new Date(eventAtHour.endDate), "dd/MM HH:mm")}
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
