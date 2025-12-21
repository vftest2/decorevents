import { 
  Calendar, 
  DollarSign, 
  Clock, 
  Package,
  TrendingUp,
  PartyPopper
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { RecentEvents } from '@/components/dashboard/RecentEvents';
import { UpcomingCalendar } from '@/components/dashboard/UpcomingCalendar';
import { mockEvents, mockMetrics } from '@/data/mockData';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <Header 
        title="Dashboard" 
        subtitle="Visão geral da sua entidade"
        showAddButton
        addButtonLabel="Novo Evento"
        onAddClick={() => navigate('/events/new')}
      />

      <div className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Eventos Confirmados"
            value={mockMetrics.confirmedEvents}
            subtitle="Este mês"
            icon={Calendar}
            variant="primary"
            trend={{ value: 15, isPositive: true }}
            delay={0}
          />
          <MetricCard
            title="Faturamento Mensal"
            value={`R$ ${mockMetrics.monthlyRevenue.toLocaleString('pt-BR')}`}
            icon={DollarSign}
            variant="success"
            trend={{ value: 23, isPositive: true }}
            delay={100}
          />
          <MetricCard
            title="Orçamentos Pendentes"
            value={mockMetrics.pendingBudgets}
            subtitle="Aguardando aprovação"
            icon={Clock}
            variant="warning"
            delay={200}
          />
          <MetricCard
            title="Utilização do Estoque"
            value={`${mockMetrics.inventoryUtilization}%`}
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
                  onClick={() => navigate('/events')}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Ver todos
                </button>
              </div>
              <RecentEvents events={mockEvents.filter(e => e.status !== 'finished').slice(0, 4)} />
            </div>
          </div>

          {/* Calendar Widget */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Calendário</h2>
            </div>
            <UpcomingCalendar events={mockEvents} />
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
                <p className="text-2xl font-bold text-foreground">{mockMetrics.eventsThisWeek}</p>
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
                <p className="text-2xl font-bold text-foreground">{mockMetrics.totalEvents}</p>
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
                <p className="text-2xl font-bold text-foreground">156</p>
                <p className="text-sm text-muted-foreground">Itens no estoque</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
