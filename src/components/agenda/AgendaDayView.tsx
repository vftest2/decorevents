import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { 
  format, 
  isSameDay,
  addDays,
  subDays,
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
}

export function AgendaDayView({ 
  events, 
  selectedDate,
  onDateChange,
  onEventClick 
}: AgendaDayViewProps) {
  const hours = eachHourOfInterval({
    start: setHours(selectedDate, 6),
    end: setHours(selectedDate, 22)
  });

  const dayEvents = events.filter((event) => isSameDay(new Date(event.startDate), selectedDate));
  const isCurrentDay = isToday(selectedDate);

  const getEventsForHour = (hour: Date) => {
    return dayEvents.filter(event => {
      const eventHour = getHours(new Date(event.startDate));
      return eventHour === getHours(hour);
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            <span className={cn(isCurrentDay && 'text-primary')}>
              {format(selectedDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}
            </span>
          </h2>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDateChange(subDays(selectedDate, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onDateChange(addDays(selectedDate, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateChange(new Date())}
        >
          Hoje
        </Button>
      </div>

      {/* Time grid */}
      <div className="max-h-[600px] overflow-y-auto">
        {hours.map((hour) => {
          const hourEvents = getEventsForHour(hour);
          
          return (
            <div 
              key={hour.toISOString()} 
              className="flex border-b border-border last:border-b-0"
            >
              <div className="w-20 py-3 px-3 text-sm text-muted-foreground border-r border-border flex-shrink-0">
                {format(hour, 'HH:mm')}
              </div>
              <div className="flex-1 min-h-[60px] p-2">
                {hourEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className={cn(
                      'rounded-lg px-3 py-2 mb-2 cursor-pointer transition-transform hover:scale-[1.01]',
                      statusColors[event.status]
                    )}
                  >
                    <div className="text-sm font-medium text-primary-foreground">
                      {event.title}
                    </div>
                    <div className="text-xs text-primary-foreground/80 mt-1">
                      {format(new Date(event.startDate), 'HH:mm')} - {format(new Date(event.endDate), 'HH:mm')}
                    </div>
                    {event.client && (
                      <div className="text-xs text-primary-foreground/70 mt-1">
                        {event.client.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
