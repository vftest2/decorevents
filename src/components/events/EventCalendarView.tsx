import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Event, EventStatus } from '@/types';
import { cn } from '@/lib/utils';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<EventStatus, string> = {
  budget: 'bg-muted-foreground/60',
  confirmed: 'bg-success',
  in_assembly: 'bg-info',
  in_transit: 'bg-warning',
  finished: 'bg-secondary-foreground/30',
};

interface EventCalendarViewProps {
  events: Event[];
  onEventClick?: (event: Event) => void;
  onDayClick?: (date: Date) => void;
}

export function EventCalendarView({ events, onEventClick, onDayClick }: EventCalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startDate), day));
  };

  const weekDays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-secondary/30">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-muted-foreground border-r border-border last:border-r-0"
          >
            <span className="hidden md:inline">{day}</span>
            <span className="md:hidden">{day.slice(0, 3)}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const row = Math.floor(idx / 7);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick?.(day)}
              className={cn(
                'min-h-[100px] md:min-h-[120px] p-2 border-r border-b border-border cursor-pointer transition-colors hover:bg-secondary/50',
                !isCurrentMonth && 'bg-muted/30',
                idx % 7 === 6 && 'border-r-0',
                row === Math.floor((days.length - 1) / 7) && 'border-b-0'
              )}
            >
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium mb-1',
                  isCurrentDay && 'bg-primary text-primary-foreground',
                  !isCurrentDay && !isCurrentMonth && 'text-muted-foreground/50',
                  !isCurrentDay && isCurrentMonth && 'text-foreground'
                )}
              >
                {format(day, 'd')}
              </div>
              
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventClick?.(event);
                    }}
                    className={cn(
                      'truncate rounded px-1.5 py-0.5 text-xs font-medium text-primary-foreground transition-transform hover:scale-[1.02]',
                      statusColors[event.status]
                    )}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground px-1.5">
                    +{dayEvents.length - 3} mais
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
