import { useState, useEffect } from 'react';
import { Truck, Package, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { format, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Event {
  id: string;
  entity_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  status: string;
  address: string | null;
  total_value: number | null;
  client?: {
    id: string;
    name: string;
  };
  event_items?: {
    id: string;
    quantity: number;
  }[];
}

export default function Logistics() {
  const { currentEntity } = useEntity();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentEntity?.id) {
      fetchEvents();
    }
  }, [currentEntity?.id]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          client:clients(id, name),
          event_items(id, quantity)
        `)
        .eq('entity_id', currentEntity!.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  const updateEventStatus = async (eventId: string, newStatus: 'budget' | 'confirmed' | 'in_assembly' | 'in_transit' | 'finished') => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Status atualizado com sucesso');
      fetchEvents();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const inAssemblyCount = events.filter(e => e.status === 'in_assembly').length;
  const inTransitCount = events.filter(e => e.status === 'in_transit').length;
  const finishedTodayCount = events.filter(e => 
    e.status === 'finished' && isToday(new Date(e.end_date))
  ).length;

  const activeEvents = events.filter(
    e => e.status === 'in_assembly' || e.status === 'in_transit'
  );

  if (loading) {
    return (
      <MainLayout>
        <Header title="Logística" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

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
                  {inAssemblyCount}
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
                  {inTransitCount}
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
                  {finishedTodayCount}
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
                        {format(new Date(event.start_date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                        {event.address && ` • ${event.address}`}
                      </p>
                      <div className="mt-2 flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          {event.event_items?.length || 0} itens
                        </span>
                        {event.client && (
                          <span className="text-muted-foreground">
                            Cliente: {event.client.name}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Ver Checklist
                      </Button>
                      {event.status === 'in_assembly' ? (
                        <Button 
                          size="sm"
                          className="bg-info hover:bg-info/90"
                          onClick={() => updateEventStatus(event.id, 'in_transit')}
                        >
                          Iniciar Saída
                        </Button>
                      ) : (
                        <Button 
                          size="sm"
                          className="bg-success hover:bg-success/90"
                          onClick={() => updateEventStatus(event.id, 'finished')}
                        >
                          Registrar Retorno
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* All Events Summary */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-lg font-semibold text-foreground">Histórico de Eventos</h2>
            <p className="text-sm text-muted-foreground">
              Todos os eventos da entidade
            </p>
          </div>
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {events.filter(e => e.status === 'budget').length}
                </p>
                <p className="text-sm text-muted-foreground">Orçamentos</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {events.filter(e => e.status === 'confirmed').length}
                </p>
                <p className="text-sm text-muted-foreground">Confirmados</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {events.filter(e => e.status === 'in_assembly' || e.status === 'in_transit').length}
                </p>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {events.filter(e => e.status === 'finished').length}
                </p>
                <p className="text-sm text-muted-foreground">Finalizados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
