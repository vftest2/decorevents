import { useEffect, useState } from 'react';
import { 
  Calendar, 
  Package, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Event, EVENT_STATUS_LABELS } from '@/types/database';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Stats {
  totalEvents: number;
  upcomingEvents: number;
  completedEvents: number;
  totalDecorations: number;
}

const statusColors: Record<string, string> = {
  planning: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  assembly: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function DashboardPage() {
  const { profile, entity } = useAuth();
  const [stats, setStats] = useState<Stats>({
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    totalDecorations: 0,
  });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!profile?.entity_id) return;

      try {
        // Fetch events
        const { data: events } = await supabase
          .from('events')
          .select('*')
          .eq('entity_id', profile.entity_id)
          .order('event_date', { ascending: true });

        if (events) {
          const now = new Date();
          const upcoming = events.filter(e => new Date(e.event_date) >= now && e.status !== 'completed' && e.status !== 'cancelled');
          const completed = events.filter(e => e.status === 'completed');

          setStats(prev => ({
            ...prev,
            totalEvents: events.length,
            upcomingEvents: upcoming.length,
            completedEvents: completed.length,
          }));

          // Get recent/upcoming events for display
          setRecentEvents(upcoming.slice(0, 5) as Event[]);
        }

        // Fetch decorations count
        const { count: decorationsCount } = await supabase
          .from('decoration_items')
          .select('*', { count: 'exact', head: true })
          .eq('entity_id', profile.entity_id);

        setStats(prev => ({
          ...prev,
          totalDecorations: decorationsCount || 0,
        }));
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [profile?.entity_id]);

  const getDateLabel = (dateStr: string) => {
    const date = parseISO(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "d 'de' MMM", { locale: ptBR });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Olá, {profile?.full_name?.split(' ')[0] || 'Usuário'}! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Aqui está o resumo da sua empresa
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="shadow-card hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Eventos
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEvents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                eventos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Próximos Eventos
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
              <div className="flex items-center gap-1 text-xs text-success mt-1">
                <ArrowUpRight className="w-3 h-3" />
                agendados
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Concluídos
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completedEvents}</div>
              <p className="text-xs text-muted-foreground mt-1">
                eventos finalizados
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-card hover:shadow-soft transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Itens de Decoração
              </CardTitle>
              <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <Package className="w-4 h-4 text-warning" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDecorations}</div>
              <p className="text-xs text-muted-foreground mt-1">
                itens cadastrados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Events */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Próximos Eventos</CardTitle>
            <CardDescription>
              Seus eventos mais próximos
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Nenhum evento próximo</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                      <span className="text-xs text-muted-foreground uppercase">
                        {format(parseISO(event.event_date), 'MMM', { locale: ptBR })}
                      </span>
                      <span className="text-lg font-bold text-primary">
                        {format(parseISO(event.event_date), 'd')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">
                        {event.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {getDateLabel(event.event_date)}
                          {event.event_time && ` às ${event.event_time.slice(0, 5)}`}
                        </span>
                      </div>
                    </div>
                    <Badge className={cn('font-normal', statusColors[event.status])}>
                      {EVENT_STATUS_LABELS[event.status]}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
