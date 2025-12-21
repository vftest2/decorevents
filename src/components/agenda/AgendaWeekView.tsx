import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  addWeeks,
  subWeeks,
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

interface AgendaWeekViewProps {
  events: Event[];
  selectedDate: Date;
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onEventClick?: (event: Event) => void;
}

export function AgendaWeekView({ 
  events, 
  selectedDate,
  currentWeek, 
  onWeekChange, 
  onDayClick,
  onEventClick 
}: AgendaWeekViewProps) {
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
  
  const hours = eachHourOfInterval({
    start: setHours(weekStart, 6),
    end: setHours(weekStart, 22)
  });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startDate), day));
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground">
            {format(weekStart, "d 'de' MMM", { locale: ptBR })} - {format(weekEnd, "d 'de' MMM yyyy", { locale: ptBR })}
          </h2>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onWeekChange(subWeeks(currentWeek, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onWeekChange(addWeeks(currentWeek, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Days header */}
      <div className="grid grid-cols-8 border-b border-border bg-muted/30">
        <div className="py-3 text-center text-sm font-medium text-muted-foreground border-r border-border">
          Hora
        </div>
        {days.map((day) => {
          const isCurrentDay = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'py-3 text-center cursor-pointer hover:bg-muted/50 transition-colors',
                isSelected && 'bg-primary/10'
              )}
            >
              <div className="text-xs text-muted-foreground uppercase">
                {format(day, 'EEE', { locale: ptBR })}
              </div>
              <div className={cn(
                'text-lg font-semibold mt-1',
                isCurrentDay && 'text-primary',
                !isCurrentDay && 'text-foreground'
              )}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="max-h-[500px] overflow-y-auto">
        {hours.map((hour) => (
          <div key={hour.toISOString()} className="grid grid-cols-8 border-b border-border last:border-b-0">
            <div className="py-2 px-2 text-xs text-muted-foreground border-r border-border text-center">
              {format(hour, 'HH:mm')}
            </div>
            {days.map((day) => {
              const dayEvents = getEventsForDay(day).filter(event => {
                const eventHour = getHours(new Date(event.startDate));
                return eventHour === getHours(hour);
              });
              const isSelected = isSameDay(day, selectedDate);
              
              return (
                <div
                  key={`${day.toISOString()}-${hour.toISOString()}`}
                  onClick={() => onDayClick(day)}
                  className={cn(
                    'min-h-[48px] p-1 border-r border-border last:border-r-0 cursor-pointer hover:bg-muted/30 transition-colors',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                      className={cn(
                        'truncate rounded px-1.5 py-0.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.02] mb-1',
                        statusColors[event.status]
                      )}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
