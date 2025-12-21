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

interface AgendaMonthViewProps {
  events: Event[];
  selectedDate: Date;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  onDayClick: (date: Date) => void;
  onEventClick?: (event: Event) => void;
}

export function AgendaMonthView({ 
  events, 
  selectedDate,
  currentMonth, 
  onMonthChange, 
  onDayClick,
  onEventClick 
}: AgendaMonthViewProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEventsForDay = (day: Date) => {
    return events.filter((event) => isSameDay(new Date(event.startDate), day));
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-foreground capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </h2>
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMonthChange(subMonths(currentMonth, 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Week days header */}
      <div className="grid grid-cols-7 border-b border-border bg-muted/30">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const isSelected = isSameDay(day, selectedDate);
          const row = Math.floor(idx / 7);
          const totalRows = Math.ceil(days.length / 7);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onDayClick(day)}
              className={cn(
                'min-h-[100px] p-2 border-r border-b border-border cursor-pointer transition-colors hover:bg-muted/50',
                !isCurrentMonth && 'bg-muted/20',
                isSelected && 'bg-primary/5 ring-2 ring-primary ring-inset',
                idx % 7 === 6 && 'border-r-0',
                row === totalRows - 1 && 'border-b-0'
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
                    title={`${event.title} - ${format(new Date(event.startDate), 'HH:mm')} às ${format(new Date(event.endDate), 'HH:mm')}`}
                  >
                    <span className="font-semibold">{format(new Date(event.startDate), 'HH:mm')}</span>
                    {' '}{event.title}
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
