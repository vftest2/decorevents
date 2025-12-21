import { useState, useEffect } from 'react';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Package,
  TrendingUp,
  PartyPopper,
  Loader2
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RecentEvents } from '@/components/dashboard/RecentEvents';
import { UpcomingCalendar } from '@/components/dashboard/UpcomingCalendar';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { toast } from 'sonner';
import { Event } from '@/types';

interface DashboardMetrics {
  confirmedEvents: number;
  monthlyRevenue: number;
  pendingBudgets: number;
  inventoryUtilization: number;
  eventsThisWeek: number;
  totalEvents: number;
  totalInventoryItems: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { currentEntity } = useEntity();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    confirmedEvents: 0,
    monthlyRevenue: 0,
    pendingBudgets: 0,
    inventoryUtilization: 0,
    eventsThisWeek: 0,
    totalEvents: 0,
    totalInventoryItems: 0
  });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);

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
      const weekStart = startOfWeek(now, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

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
      const upcomingEvents = transformedEvents
        .filter(e => e.status !== 'finished')
        .slice(0, 4);
      setRecentEvents(upcomingEvents);

      // Calculate metrics
      const monthEvents = eventsData?.filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= monthStart && eventDate <= monthEnd;
      }) || [];

      const weekEvents = eventsData?.filter(e => {
        const eventDate = new Date(e.start_date);
        return eventDate >= weekStart && eventDate <= weekEnd;
      }) || [];

      const confirmedMonthEvents = monthEvents.filter(e => e.status !== 'budget');
      const pendingBudgets = eventsData?.filter(e => e.status === 'budget').length || 0;
      const monthlyRevenue = confirmedMonthEvents.reduce((sum, e) => sum + (e.total_value || 0), 0);

      // Fetch inventory data
      const { data: inventoryData, error: inventoryError } = await supabase
        .from('inventory_items')
        .select('total_quantity, available_quantity')
        .eq('entity_id', currentEntity!.id);

      if (inventoryError) throw inventoryError;

      const totalQuantity = inventoryData?.reduce((sum, i) => sum + (i.total_quantity || 0), 0) || 0;
      const availableQuantity = inventoryData?.reduce((sum, i) => sum + (i.available_quantity || 0), 0) || 0;
      const inventoryUtilization = totalQuantity > 0 
        ? Math.round(((totalQuantity - availableQuantity) / totalQuantity) * 100) 
        : 0;

      setMetrics({
        confirmedEvents: confirmedMonthEvents.length,
        monthlyRevenue,
        pendingBudgets,
        inventoryUtilization,
        eventsThisWeek: weekEvents.length,
        totalEvents: eventsData?.length || 0,
        totalInventoryItems: inventoryData?.length || 0
      });

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
        subtitle="Visão geral da sua entidade"
        showAddButton
        addButtonLabel="Novo Evento"
        onAddClick={() => navigate('/agenda')}
      />

      <div className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Eventos Confirmados"
            value={metrics.confirmedEvents}
            subtitle="Este mês"
            icon={Calendar}
            variant="primary"
            delay={0}
          />
          <MetricCard
            title="Faturamento Mensal"
            value={`R$ ${metrics.monthlyRevenue.toLocaleString('pt-BR')}`}
            icon={DollarSign}
            variant="success"
            delay={100}
          />
          <MetricCard
            title="Orçamentos Pendentes"
            value={metrics.pendingBudgets}
            subtitle="Aguardando aprovação"
            icon={Clock}
            variant="warning"
            delay={200}
          />
          <MetricCard
            title="Utilização do Estoque"
            value={`${metrics.inventoryUtilization}%`}
            subtitle="Itens em uso"
            icon={Package}
            delay={300}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Events */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <PartyPopper className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-foreground">Próximos Eventos</h2>
                </div>
                <button 
                  onClick={() => navigate('/agenda')}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todos
                </button>
              </div>
              <RecentEvents events={recentEvents} />
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Calendário</h2>
            </div>
            <UpcomingCalendar events={allEvents} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 animate-slide-up" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{metrics.eventsThisWeek}</p>
                <p className="text-sm text-muted-foreground">Eventos esta semana</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 animate-slide-up" style={{ animationDelay: '500ms' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <Calendar className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{metrics.totalEvents}</p>
                <p className="text-sm text-muted-foreground">Total de eventos</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 animate-slide-up" style={{ animationDelay: '600ms' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Package className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{metrics.totalInventoryItems}</p>
                <p className="text-sm text-muted-foreground">Itens no estoque</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
