import { useState } from 'react';
import { LayoutGrid, Calendar as CalendarIcon, List } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { EventCard } from '@/components/events/EventCard';
import { EventCalendarView } from '@/components/events/EventCalendarView';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { mockEvents } from '@/data/mockData';
import { EventStatus } from '@/types';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'calendar' | 'list';

const statusFilters: { value: EventStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'budget', label: 'Orçamentos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'in_assembly', label: 'Em Montagem' },
  { value: 'in_transit', label: 'Em Trânsito' },
  { value: 'finished', label: 'Finalizados' },
];

export default function Events() {
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [statusFilter, setStatusFilter] = useState<EventStatus | 'all'>('all');

  const filteredEvents = statusFilter === 'all' 
    ? mockEvents 
    : mockEvents.filter(e => e.status === statusFilter);

  return (
    <MainLayout>
      <Header 
        title="Eventos" 
        subtitle={`${mockEvents.length} eventos cadastrados`}
        showAddButton
        addButtonLabel="Novo Evento"
      />

      <div className="p-6 space-y-6">
        {/* Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Status Filters */}
          <div className="flex flex-wrap gap-2">
            {statusFilters.map((filter) => {
              const count = filter.value === 'all' 
                ? mockEvents.length 
                : mockEvents.filter(e => e.status === filter.value).length;
              
              return (
                <button
                  key={filter.value}
                  onClick={() => setStatusFilter(filter.value)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                    statusFilter === filter.value
                      ? 'bg-primary text-primary-foreground shadow-glow'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  )}
                >
                  {filter.label}
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      'h-5 min-w-[20px] px-1.5',
                      statusFilter === filter.value && 'bg-primary-foreground/20 text-primary-foreground'
                    )}
                  >
                    {count}
                  </Badge>
                </button>
              );
            })}
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2',
                viewMode === 'grid' && 'bg-background shadow-sm'
              )}
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grade</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2',
                viewMode === 'calendar' && 'bg-background shadow-sm'
              )}
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Calendário</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'gap-2',
                viewMode === 'list' && 'bg-background shadow-sm'
              )}
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </Button>
          </div>
        </div>

        {/* Content */}
        {filteredEvents.length === 0 ? (
          <EmptyState
            icon={CalendarIcon}
            title="Nenhum evento encontrado"
            description="Não há eventos com os filtros selecionados. Tente ajustar os filtros ou crie um novo evento."
            actionLabel="Criar Evento"
            onAction={() => {}}
          />
        ) : viewMode === 'calendar' ? (
          <EventCalendarView 
            events={filteredEvents}
            onEventClick={(event) => console.log('Event clicked:', event)}
          />
        ) : (
          <div className={cn(
            viewMode === 'grid' 
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4'
              : 'space-y-3'
          )}>
            {filteredEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
                onClick={() => console.log('Event clicked:', event)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
