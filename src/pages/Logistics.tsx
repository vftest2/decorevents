import { Truck, Package, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { mockEvents } from '@/data/mockData';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Logistics() {
  const activeEvents = mockEvents.filter(
    e => e.status === 'in_assembly' || e.status === 'in_transit'
  );

  return (
    <MainLayout>
      <Header 
        title="Logística" 
        subtitle="Gerencie saídas e retornos de itens"
      />

      <div className="p-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-border bg-card p-5 animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {mockEvents.filter(e => e.status === 'in_assembly').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Montagem</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-info/10">
                <Truck className="h-6 w-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {mockEvents.filter(e => e.status === 'in_transit').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Trânsito</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 animate-slide-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {mockEvents.filter(e => e.status === 'finished').length}
                </p>
                <p className="text-sm text-muted-foreground">Finalizados Hoje</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Events */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-foreground">Eventos Ativos</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie checklist de saída e retorno
            </p>
          </div>

          {activeEvents.length === 0 ? (
            <EmptyState
              icon={Truck}
              title="Nenhum evento ativo"
              description="Não há eventos em montagem ou em trânsito no momento."
              className="py-12"
            />
          ) : (
            <div className="divide-y divide-border">
              {activeEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="p-5 hover:bg-muted/50 transition-colors animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {event.title}
                        </h3>
                        <Badge
                          className={cn(
                            'border',
                            event.status === 'in_assembly'
                              ? 'bg-info/10 text-info border-info/20'
                              : 'bg-warning/10 text-warning border-warning/20'
                          )}
                        >
                          {event.status === 'in_assembly' ? 'Em Montagem' : 'Em Trânsito'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.startDate), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        {' • '}
                        {event.address}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          {event.items.length} itens
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Ver Checklist
                      </Button>
                      <Button 
                        size="sm"
                        className={cn(
                          event.status === 'in_assembly'
                            ? 'bg-info hover:bg-info/90'
                            : 'bg-success hover:bg-success/90'
                        )}
                      >
                        {event.status === 'in_assembly' ? 'Iniciar Saída' : 'Registrar Retorno'}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
