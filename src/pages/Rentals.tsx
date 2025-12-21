import { useState, useEffect } from 'react';
import { Package, Search, Plus, Loader2, Calendar, Clock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import { CreateRentalDialog } from '@/components/rentals/CreateRentalDialog';

interface Rental {
  id: string;
  entity_id: string;
  event_id: string | null;
  client_id: string | null;
  title: string;
  description: string | null;
  status: string;
  departure_date: string | null;
  return_date: string | null;
  actual_departure_date: string | null;
  actual_return_date: string | null;
  total_value: number | null;
  notes: string | null;
  created_at: string;
  event?: { title: string } | null;
  client?: { name: string } | null;
  rental_items?: { id: string }[];
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Rascunho', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  confirmed: { label: 'Confirmado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  out: { label: 'Em Locação', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  returned: { label: 'Retornado', color: 'text-green-600', bgColor: 'bg-green-100' },
  completed: { label: 'Concluído', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
};

export default function Rentals() {
  const { currentEntity } = useEntity();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (currentEntity?.id) {
      fetchRentals();
    }
  }, [currentEntity?.id]);

  const fetchRentals = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('rentals')
        .select(`
          *,
          event:events(title),
          client:clients(name),
          rental_items(id)
        `)
        .eq('entity_id', currentEntity!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRentals(data || []);
    } catch (error) {
      console.error('Error fetching rentals:', error);
      toast.error('Erro ao carregar locações');
    } finally {
      setLoading(false);
    }
  };

  const filteredRentals = rentals.filter((rental) => {
    const matchesSearch = rental.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rental.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'active') return matchesSearch && ['confirmed', 'out'].includes(rental.status);
    if (activeTab === 'pending') return matchesSearch && rental.status === 'draft';
    if (activeTab === 'completed') return matchesSearch && ['returned', 'completed'].includes(rental.status);
    return matchesSearch;
  });

  const stats = {
    total: rentals.length,
    active: rentals.filter(r => ['confirmed', 'out'].includes(r.status)).length,
    pending: rentals.filter(r => r.status === 'draft').length,
    completed: rentals.filter(r => ['returned', 'completed'].includes(r.status)).length,
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Locações" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Locações" 
        subtitle={`${rentals.length} locações registradas`}
        showAddButton
        addButtonLabel="Nova Locação"
        onAddClick={() => setDialogOpen(true)}
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveTab('all')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveTab('active')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-100">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveTab('pending')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setActiveTab('completed')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Concluídas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar locações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="active">Ativas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="completed">Concluídas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredRentals.length === 0 ? (
              <EmptyState
                icon={Package}
                title="Nenhuma locação encontrada"
                description="Crie uma nova locação para começar a gerenciar seus aluguéis."
                actionLabel="Nova Locação"
                onAction={() => setDialogOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRentals.map((rental, index) => {
                  const status = statusConfig[rental.status] || statusConfig.draft;
                  return (
                    <Card 
                      key={rental.id}
                      className="cursor-pointer hover:border-primary/30 hover:shadow-md transition-all animate-slide-up"
                      style={{ animationDelay: `${index * 50}ms` }}
                      onClick={() => navigate(`/rentals/${rental.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-lg line-clamp-1">{rental.title}</CardTitle>
                          <Badge className={cn(status.bgColor, status.color, 'border-0')}>
                            {status.label}
                          </Badge>
                        </div>
                        {rental.client?.name && (
                          <p className="text-sm text-muted-foreground">{rental.client.name}</p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {rental.event?.title && (
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">{rental.event.title}</span>
                          </div>
                        )}
                        
                        {(rental.departure_date || rental.return_date) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {rental.departure_date && format(new Date(rental.departure_date), 'dd/MM', { locale: ptBR })}
                              {rental.departure_date && rental.return_date && (
                                <ArrowRight className="inline h-3 w-3 mx-1" />
                              )}
                              {rental.return_date && format(new Date(rental.return_date), 'dd/MM', { locale: ptBR })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="text-sm text-muted-foreground">
                            {rental.rental_items?.length || 0} itens
                          </span>
                          {rental.total_value && rental.total_value > 0 && (
                            <span className="font-semibold text-primary">
                              R$ {rental.total_value.toLocaleString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <CreateRentalDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        onSuccess={() => {
          fetchRentals();
          setDialogOpen(false);
        }}
      />
    </MainLayout>
  );
}
