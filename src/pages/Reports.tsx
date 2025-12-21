import { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, TrendingUp, DollarSign, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay, subMonths } from 'date-fns';
import { toast } from 'sonner';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface ReportMetrics {
  totalRevenue: number;
  totalEvents: number;
  confirmedEvents: number;
  conversionRate: number;
  averageTicket: number;
}

interface EventTypeData {
  name: string;
  value: number;
}

interface MonthlyData {
  month: string;
  revenue: number;
  events: number;
}

interface TopItem {
  name: string;
  rentals: number;
  revenue: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--info))', 'hsl(var(--destructive))'];

export default function Reports() {
  const { currentEntity } = useEntity();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month');
  const [metrics, setMetrics] = useState<ReportMetrics>({
    totalRevenue: 0,
    totalEvents: 0,
    confirmedEvents: 0,
    conversionRate: 0,
    averageTicket: 0
  });
  const [eventTypeData, setEventTypeData] = useState<EventTypeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);

  useEffect(() => {
    if (currentEntity?.id) {
      fetchReports();
    }
  }, [currentEntity?.id, period]);

  const getDateRange = () => {
    const now = new Date();
    switch (period) {
      case 'day':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'month':
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();

      // Fetch events for the period
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .eq('entity_id', currentEntity!.id)
        .gte('start_date', start.toISOString())
        .lte('start_date', end.toISOString());

      if (eventsError) throw eventsError;

      // Calculate metrics
      const confirmedEvents = events?.filter(e => e.status !== 'budget') || [];
      const totalRevenue = confirmedEvents.reduce((sum, e) => sum + (e.total_value || 0), 0);
      const conversionRate = events?.length ? (confirmedEvents.length / events.length) * 100 : 0;
      const averageTicket = confirmedEvents.length ? totalRevenue / confirmedEvents.length : 0;

      setMetrics({
        totalRevenue,
        totalEvents: events?.length || 0,
        confirmedEvents: confirmedEvents.length,
        conversionRate,
        averageTicket
      });

      // Event type distribution
      const typeGroups: Record<string, number> = {};
      events?.forEach(e => {
        const type = e.event_type || 'Outros';
        typeGroups[type] = (typeGroups[type] || 0) + 1;
      });
      setEventTypeData(Object.entries(typeGroups).map(([name, value]) => ({ name, value })));

      // Monthly data (last 6 months)
      const monthlyResults: MonthlyData[] = [];
      for (let i = 5; i >= 0; i--) {
        const monthStart = startOfMonth(subMonths(new Date(), i));
        const monthEnd = endOfMonth(subMonths(new Date(), i));
        
        const { data: monthEvents } = await supabase
          .from('events')
          .select('total_value, status')
          .eq('entity_id', currentEntity!.id)
          .gte('start_date', monthStart.toISOString())
          .lte('start_date', monthEnd.toISOString());

        const confirmedMonthEvents = monthEvents?.filter(e => e.status !== 'budget') || [];
        const monthRevenue = confirmedMonthEvents.reduce((sum, e) => sum + (e.total_value || 0), 0);

        monthlyResults.push({
          month: monthStart.toLocaleDateString('pt-BR', { month: 'short' }),
          revenue: monthRevenue,
          events: monthEvents?.length || 0
        });
      }
      setMonthlyData(monthlyResults);

      // Top rented items
      const { data: eventItems } = await supabase
        .from('event_items')
        .select(`
          quantity,
          unit_price,
          inventory_item:inventory_items(name)
        `)
        .eq('inventory_items.entity_id', currentEntity!.id);

      const itemGroups: Record<string, { rentals: number; revenue: number }> = {};
      eventItems?.forEach(item => {
        const name = (item.inventory_item as any)?.name || 'Item';
        if (!itemGroups[name]) {
          itemGroups[name] = { rentals: 0, revenue: 0 };
        }
        itemGroups[name].rentals += item.quantity || 0;
        itemGroups[name].revenue += (item.quantity || 0) * (item.unit_price || 0);
      });

      const sortedItems = Object.entries(itemGroups)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.rentals - a.rentals)
        .slice(0, 5);

      setTopItems(sortedItems);

    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Relatórios" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Relatórios" 
        subtitle="Análise de desempenho da entidade"
      />

      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')} className="w-auto">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="day">Hoje</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
            </TabsList>
          </Tabs>

          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar PDF
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Faturamento Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-success" />
                <span className="text-2xl font-bold text-foreground">
                  R$ {metrics.totalRevenue.toLocaleString('pt-BR')}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Eventos Realizados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold text-foreground">
                  {metrics.confirmedEvents}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                de {metrics.totalEvents} eventos totais
              </p>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '200ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Ticket Médio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-warning" />
                <span className="text-2xl font-bold text-foreground">
                  R$ {metrics.averageTicket.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '300ms' }}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Taxa de Conversão
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-info" />
                <span className="text-2xl font-bold text-foreground">
                  {metrics.conversionRate.toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Orçamentos aprovados</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <CardTitle>Faturamento por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" className="text-muted-foreground" />
                    <YAxis className="text-muted-foreground" />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Faturamento']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Sem dados para exibir</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
            <CardHeader>
              <CardTitle>Eventos por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              {eventTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={eventTypeData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {eventTypeData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                  <p className="text-muted-foreground">Sem dados para exibir</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Top Items */}
        <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle>Itens Mais Alugados</CardTitle>
          </CardHeader>
          <CardContent>
            {topItems.length > 0 ? (
              <div className="space-y-4">
                {topItems.map((item, index) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.rentals} aluguéis</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">
                        R$ {item.revenue.toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground">
                Nenhum item alugado no período selecionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
