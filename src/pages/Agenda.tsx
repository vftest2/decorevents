import { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { AgendaMonthView } from '@/components/agenda/AgendaMonthView';
import { AgendaWeekView } from '@/components/agenda/AgendaWeekView';
import { AgendaDayView } from '@/components/agenda/AgendaDayView';
import { AgendaSidebar } from '@/components/agenda/AgendaSidebar';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { EventDetailsDialog } from '@/components/events/EventDetailsDialog';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EventStatus } from '@/types';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { setMonth, setYear } from 'date-fns';

type ViewMode = 'month' | 'week' | 'day';

export default function Agenda() {
  const { currentEntity } = useEntity();
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedHour, setSelectedHour] = useState<number | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    if (currentEntity?.id) {
      fetchEvents();
    }
  }, [currentEntity?.id]);

  const fetchEvents = async () => {
    if (!currentEntity?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone
          )
        `)
        .eq('entity_id', currentEntity.id)
        .order('start_date', { ascending: true });

      if (error) throw error;

      const mappedEvents: Event[] = (data || []).map((event) => ({
        id: event.id,
        entityId: event.entity_id,
        title: event.title,
        description: event.description || undefined,
        startDate: new Date(event.start_date),
        endDate: new Date(event.end_date),
        status: (event.status || 'budget') as EventStatus,
        clientId: event.client_id || '',
        client: event.clients ? {
          id: event.clients.id,
          entityId: event.entity_id,
          name: event.clients.name,
          email: event.clients.email || '',
          phone: event.clients.phone || '',
          createdAt: new Date(),
        } : undefined,
        address: event.address || '',
        eventType: event.event_type || '',
        theme: event.theme || undefined,
        items: [],
        assignedUsers: [],
        totalValue: event.total_value || 0,
        createdAt: new Date(event.created_at || ''),
      }));

      setEvents(mappedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    setViewMode('day');
  };

  const handleMonthChange = (date: Date) => {
    setCurrentMonth(date);
  };

  const handleWeekChange = (date: Date) => {
    setCurrentWeek(date);
  };

  const handleDateChange = (date: Date) => {
    setSelectedDate(date);
    setCurrentMonth(setYear(setMonth(currentMonth, date.getMonth()), date.getFullYear()));
  };

  const handleEventClick = (event: Event) => {
    setSelectedEvent(event);
    setIsDetailsDialogOpen(true);
  };

  const handleAddEvent = (date?: Date, hour?: number) => {
    if (date) {
      setSelectedDate(date);
    }
    setSelectedHour(hour);
    setIsCreateDialogOpen(true);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Agenda" 
        subtitle="Gerencie seus eventos e compromissos"
      />

      {/* View Mode Toggle */}
      <div className="mb-6 flex items-center justify-end">
        <div className="inline-flex items-center rounded-lg border border-border bg-card p-1">
          {(['month', 'week', 'day'] as ViewMode[]).map((mode) => (
            <Button
              key={mode}
              variant={viewMode === mode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode(mode)}
              className={cn(
                'px-4',
                viewMode === mode && 'shadow-sm'
              )}
            >
              {mode === 'month' ? 'Mês' : mode === 'week' ? 'Semana' : 'Dia'}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar View */}
        <div className="flex-1">
          {viewMode === 'month' && (
            <AgendaMonthView
              events={events}
              selectedDate={selectedDate}
              currentMonth={currentMonth}
              onMonthChange={handleMonthChange}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          )}
          {viewMode === 'week' && (
            <AgendaWeekView
              events={events}
              selectedDate={selectedDate}
              currentWeek={currentWeek}
              onWeekChange={handleWeekChange}
              onDayClick={handleDayClick}
              onEventClick={handleEventClick}
            />
          )}
          {viewMode === 'day' && (
            <AgendaDayView
              events={events}
              selectedDate={selectedDate}
              onDateChange={handleDateChange}
              onEventClick={handleEventClick}
              onAddEvent={handleAddEvent}
            />
          )}
        </div>

        {/* Sidebar */}
        <AgendaSidebar
          selectedDate={selectedDate}
          events={events}
          onAddEvent={() => handleAddEvent()}
          onEventClick={handleEventClick}
        />
      </div>

      {/* Create Event Dialog */}
      <CreateEventDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        defaultDate={selectedDate}
        defaultHour={selectedHour}
        onEventCreated={fetchEvents}
      />

      {/* Event Details Dialog */}
      <EventDetailsDialog
        event={selectedEvent}
        open={isDetailsDialogOpen}
        onOpenChange={setIsDetailsDialogOpen}
        onEventDeleted={fetchEvents}
      />
    </MainLayout>
  );
}
