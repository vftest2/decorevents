import { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  CheckCircle,
  FileText,
  Loader2,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { UpcomingCalendar } from '@/components/dashboard/UpcomingCalendar';
import { MonthlyRevenueChart } from '@/components/dashboard/MonthlyRevenueChart';
import { EventsByTypeChart } from '@/components/dashboard/EventsByTypeChart';
import { UpcomingEventCard } from '@/components/dashboard/UpcomingEventCard';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, subMonths, format, startOfYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Event } from '@/types';
import { cn } from '@/lib/utils';

interface DashboardMetrics {
  eventsThisMonth: number;
  confirmedEvents: number;
  monthlyRevenue: number;
  pendingBudgets: number;
  previousMonthEvents: number;
  previousMonthConfirmed: number;
  previousMonthRevenue: number;
  previousMonthBudgets: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
}

interface EventTypeData {
  name: string;
  value: number;
  color: string;
}

interface TrendIndicatorProps {
  current: number;
  previous: number;
  format?: 'percentage' | 'number';
  invertColors?: boolean;
}

function TrendIndicator({ current, previous, format = 'percentage', invertColors = false }: TrendIndicatorProps) {
  if (previous === 0 && current === 0) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span>Sem dados anteriores</span>
      </div>
    );
  }

  const change = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isPositive = change >= 0;
  const isNeutral = change === 0;
  
  // For budgets, positive change might be "bad" (more pending), so we can invert colors
  const colorClass = isNeutral 
    ? 'text-muted-foreground' 
    : invertColors
      ? (isPositive ? 'text-amber-600' : 'text-green-600')
      : (isPositive ? 'text-green-600' : 'text-red-500');

  const bgClass = isNeutral 
    ? 'bg-muted' 
    : invertColors
      ? (isPositive ? 'bg-amber-50' : 'bg-green-50')
      : (isPositive ? 'bg-green-50' : 'bg-red-50');

  const Icon = isNeutral ? Minus : (isPositive ? TrendingUp : TrendingDown);

  return (
    <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', bgClass, colorClass)}>
      <Icon className="h-3 w-3" />
      <span>
        {isPositive && !isNeutral ? '+' : ''}{Math.round(change)}% vs mês anterior
      </span>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentEntity } = useEntity();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    eventsThisMonth: 0,
    confirmedEvents: 0,
    monthlyRevenue: 0,
    pendingBudgets: 0,
    previousMonthEvents: 0,
    previousMonthConfirmed: 0,
    previousMonthRevenue: 0,
    previousMonthBudgets: 0,
  });
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [eventTypeData, setEventTypeData] = useState<EventTypeData[]>([]);

  useEffect(() => {
    if (currentEntity?.id) {
      fetchDashboardData();
    }
  }, [currentEntity?.id]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      const prevMonthStart = startOfMonth(subMonths(now, 1));
      const prevMonthEnd = endOfMonth(subMonths(now, 1));
      const yearStart = startOfYear(now);

      // Fetch all events for the entity
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(id, name, email, phone, address)
        `)
        .eq('entity_id', currentEntity!.id)
        .order('start_date', { ascending: true });

      if (eventsError) throw eventsError;

      // Transform events to match the Event type
      const transformedEvents: Event[] = (eventsData || []).map(e => ({
        id: e.id,
        entityId: e.entity_id,
        title: e.title,
        description: e.description || undefined,
        startDate: new Date(e.start_date),
        endDate: new Date(e.end_date),
        status: e.status as any,
        clientId: e.client_id || '',
        client: e.client ? {
          id: e.client.id,
          entityId: e.entity_id,
          name: e.client.name,
          email: e.client.email || '',
          phone: e.client.phone || '',
          address: e.client.address || undefined,
          createdAt: new Date()
        } : undefined,
        address: e.address || '',
        eventType: e.event_type || '',
        theme: e.theme || undefined,
        items: [],
        assignedUsers: [],
        totalValue: e.total_value || 0,
        createdAt: new Date(e.created_at || '')
      }));

      setAllEvents(transformedEvents);

      // Filter for upcoming events (not finished)
      const upcoming = transformedEvents
        .filter(e => e.status !== 'finished' && new Date(e.startDate) >= now)
        .slice(0, 4);
      setUpcomingEvents(upcoming);

      // Calculate current month metrics
      const currentMonthEvents = eventsData?.filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      }) || [];

      const previousMonthEvents = eventsData?.filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= prevMonthStart && eventDate <= prevMonthEnd;
      }) || [];

      const confirmedCurrentMonth = currentMonthEvents.filter(e => e.status !== 'budget');
      const confirmedPreviousMonth = previousMonthEvents.filter(e => e.status !== 'budget');
      const pendingBudgets = currentMonthEvents.filter(e => e.status === 'budget').length;
      const previousPendingBudgets = previousMonthEvents.filter(e => e.status === 'budget').length;
      const monthlyRevenue = confirmedCurrentMonth.reduce((sum, e) => sum + (e.total_value || 0), 0);
      const prevMonthRevenue = confirmedPreviousMonth.reduce((sum, e) => sum + (e.total_value || 0), 0);

      setMetrics({
        eventsThisMonth: currentMonthEvents.length,
        confirmedEvents: confirmedCurrentMonth.length,
        monthlyRevenue,
        pendingBudgets,
        previousMonthEvents: previousMonthEvents.length,
        previousMonthConfirmed: confirmedPreviousMonth.length,
        previousMonthRevenue: prevMonthRevenue,
        previousMonthBudgets: previousPendingBudgets,
      });

      // Calculate monthly revenue data for chart
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      const monthlyRevenueData = months.map((month, index) => {
        const monthEvents = eventsData?.filter(e => {
          const eventDate = new Date(e.start_date);
          return eventDate.getMonth() === index && eventDate.getFullYear() === now.getFullYear() && e.status !== 'budget';
        }) || [];
        return {
          month,
          revenue: monthEvents.reduce((sum, e) => sum + (e.total_value || 0), 0),
        };
      });
      setMonthlyData(monthlyRevenueData);

      // Calculate event types data for chart
      const eventTypes: Record<string, number> = {};
      eventsData?.forEach(e => {
        const type = e.event_type || 'Outros';
        eventTypes[type] = (eventTypes[type] || 0) + 1;
      });
      const typeData = Object.entries(eventTypes).map(([name, value]) => ({
        name,
        value,
        color: '#6B7280',
      }));
      setEventTypeData(typeData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <MainLayout>
        <Header title="Dashboard" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Dashboard" 
        subtitle="Visão geral do seu negócio"
      />

      <div className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Eventos do Mês */}
          <Card className="animate-slide-up overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Eventos do Mês</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.eventsThisMonth}</p>
                  <TrendIndicator 
                    current={metrics.eventsThisMonth} 
                    previous={metrics.previousMonthEvents} 
                  />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Confirmados */}
          <Card className="animate-slide-up overflow-hidden" style={{ animationDelay: '50ms' }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Confirmados</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.confirmedEvents}</p>
                  <TrendIndicator 
                    current={metrics.confirmedEvents} 
                    previous={metrics.previousMonthConfirmed} 
                  />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Faturamento */}
          <Card className="animate-slide-up overflow-hidden" style={{ animationDelay: '100ms' }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Faturamento</p>
                  <p className="text-3xl font-bold text-foreground">
                    R$ {metrics.monthlyRevenue.toLocaleString('pt-BR')}
                  </p>
                  <TrendIndicator 
                    current={metrics.monthlyRevenue} 
                    previous={metrics.previousMonthRevenue} 
                  />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orçamentos Pendentes */}
          <Card className="animate-slide-up overflow-hidden" style={{ animationDelay: '150ms' }}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Orçamentos Pendentes</p>
                  <p className="text-3xl font-bold text-foreground">{metrics.pendingBudgets}</p>
                  <TrendIndicator 
                    current={metrics.pendingBudgets} 
                    previous={metrics.previousMonthBudgets}
                    invertColors
                  />
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
                  <FileText className="h-5 w-5 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MonthlyRevenueChart data={monthlyData} />
          <EventsByTypeChart data={eventTypeData} />
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Próximos Eventos */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <CardTitle className="text-base font-semibold">Próximos Eventos</CardTitle>
                <button 
                  onClick={() => navigate('/agenda')}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Ver todos
                  <ArrowRight className="h-4 w-4" />
                </button>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                      <Calendar className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Nenhum evento</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Comece criando seu primeiro evento!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {upcomingEvents.map((event) => (
                      <UpcomingEventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Calendar + Quick Actions */}
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold capitalize">
                    {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <UpcomingCalendar events={allEvents} />
              </CardContent>
            </Card>

            <QuickActions />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
