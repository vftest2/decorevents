import { Calendar, Clock, MapPin, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Event, EventStatus } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig: Record<EventStatus, { label: string; className: string }> = {
  budget: { label: 'Orçamento', className: 'bg-orange-100 text-orange-700 hover:bg-orange-100' },
  confirmed: { label: 'Confirmado', className: 'bg-green-100 text-green-700 hover:bg-green-100' },
  in_assembly: { label: 'Em Montagem', className: 'bg-blue-100 text-blue-700 hover:bg-blue-100' },
  in_transit: { label: 'Em Trânsito', className: 'bg-purple-100 text-purple-700 hover:bg-purple-100' },
  finished: { label: 'Finalizado', className: 'bg-gray-100 text-gray-700 hover:bg-gray-100' },
};

const eventTypeColors: Record<string, string> = {
  'Casamento': 'bg-red-100 text-red-700',
  'Infantil': 'bg-yellow-100 text-yellow-700',
  'Corporativo': 'bg-orange-100 text-orange-700',
  'Debutante': 'bg-purple-100 text-purple-700',
  'Outros': 'bg-blue-100 text-blue-700',
};

const eventTypeIcons: Record<string, string> = {
  'Casamento': '💍',
  'Infantil': '🎈',
  'Corporativo': '🏢',
  'Debutante': '👗',
  'Outros': '🎉',
};

interface UpcomingEventCardProps {
  event: Event;
}

export function UpcomingEventCard({ event }: UpcomingEventCardProps) {
  const status = statusConfig[event.status];
  const eventType = event.eventType || 'Outros';
  const typeColor = eventTypeColors[eventType] || eventTypeColors['Outros'];
  const typeIcon = eventTypeIcons[eventType] || '🎉';

  return (
    <div className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center text-sm', typeColor)}>
            {typeIcon}
          </span>
          <div>
            <h4 className="font-semibold text-foreground text-sm">{event.title}</h4>
            <p className="text-xs text-muted-foreground">{eventType}</p>
          </div>
        </div>
        <Badge className={cn('text-xs font-medium', status.className)}>
          {status.label}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>{event.client?.name || 'Cliente não definido'}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>{format(new Date(event.startDate), "dd 'de' MMMM", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3.5 w-3.5" />
          <span>{format(new Date(event.startDate), 'HH:mm')}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5" />
          <span className="truncate">{event.address || 'Local não definido'}</span>
        </div>
      </div>
    </div>
  );
}
