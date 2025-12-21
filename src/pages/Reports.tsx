import { BarChart3, Download, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { mockMetrics } from '@/data/mockData';

export default function Reports() {
  return (
    <MainLayout>
      <Header 
        title="Relatórios" 
        subtitle="Análise de desempenho da entidade"
      />

      <div className="p-6 space-y-6">
        {/* Period Selector */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <Tabs defaultValue="month" className="w-auto">
            <TabsList className="bg-secondary/50">
              <TabsTrigger value="day">Hoje</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="custom">Personalizado</TabsTrigger>
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
                  R$ {mockMetrics.monthlyRevenue.toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="mt-1 text-xs text-success">+23% vs mês anterior</p>
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
                  {mockMetrics.confirmedEvents}
                </span>
              </div>
              <p className="mt-1 text-xs text-primary">+15% vs mês anterior</p>
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
                  R$ {(mockMetrics.monthlyRevenue / mockMetrics.confirmedEvents).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                </span>
              </div>
              <p className="mt-1 text-xs text-warning">+8% vs mês anterior</p>
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
                  78%
                </span>
              </div>
              <p className="mt-1 text-xs text-info">Orçamentos aprovados</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Placeholder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="animate-slide-up" style={{ animationDelay: '400ms' }}>
            <CardHeader>
              <CardTitle>Faturamento por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Gráfico de faturamento mensal
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    Conecte ao backend para visualizar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-slide-up" style={{ animationDelay: '500ms' }}>
            <CardHeader>
              <CardTitle>Eventos por Tipo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center border border-dashed border-border rounded-lg bg-muted/30">
                <div className="text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">
                    Distribuição por tipo de evento
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    Conecte ao backend para visualizar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Items */}
        <Card className="animate-slide-up" style={{ animationDelay: '600ms' }}>
          <CardHeader>
            <CardTitle>Itens Mais Alugados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Arco de Balões Premium', rentals: 45, revenue: 15750 },
                { name: 'Mesa Provençal Branca', rentals: 38, revenue: 6840 },
                { name: 'Cortina de LED', rentals: 32, revenue: 3840 },
                { name: 'Arranjo Floral Artificial', rentals: 28, revenue: 2380 },
                { name: 'Painel de Madeira Rústico', rentals: 22, revenue: 6160 },
              ].map((item, index) => (
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
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
