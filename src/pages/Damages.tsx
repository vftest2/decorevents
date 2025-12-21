import { useState, useEffect } from 'react';
import { AlertTriangle, Search, Loader2, Wrench, CheckCircle2, XCircle } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Damage {
  id: string;
  entity_id: string;
  rental_item_id: string | null;
  inventory_item_id: string;
  rental_id: string | null;
  description: string;
  severity: string;
  quantity: number;
  photos: string[] | null;
  repair_cost: number | null;
  status: string;
  registered_by: string | null;
  resolved_at: string | null;
  notes: string | null;
  created_at: string;
  inventory_item?: { name: string; photo: string | null };
  rental?: { title: string } | null;
}

const severityConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  minor: { label: 'Leve', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  moderate: { label: 'Moderado', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  severe: { label: 'Grave', color: 'text-red-600', bgColor: 'bg-red-100' },
  total_loss: { label: 'Perda Total', color: 'text-red-800', bgColor: 'bg-red-200' },
};

const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  pending: { label: 'Pendente', color: 'text-muted-foreground', bgColor: 'bg-muted', icon: AlertTriangle },
  under_repair: { label: 'Em Reparo', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: Wrench },
  repaired: { label: 'Reparado', color: 'text-green-600', bgColor: 'bg-green-100', icon: CheckCircle2 },
  written_off: { label: 'Baixado', color: 'text-red-600', bgColor: 'bg-red-100', icon: XCircle },
};

export default function Damages() {
  const { currentEntity } = useEntity();
  const [searchQuery, setSearchQuery] = useState('');
  const [damages, setDamages] = useState<Damage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [selectedDamage, setSelectedDamage] = useState<Damage | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentEntity?.id) {
      fetchDamages();
    }
  }, [currentEntity?.id]);

  const fetchDamages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('item_damages')
        .select(`
          *,
          inventory_item:inventory_items(name, photo),
          rental:rentals(title)
        `)
        .eq('entity_id', currentEntity!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDamages(data || []);
    } catch (error) {
      console.error('Error fetching damages:', error);
      toast.error('Erro ao carregar avarias');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (damageId: string, newStatus: string) => {
    setSaving(true);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      if (newStatus === 'repaired' || newStatus === 'written_off') {
        updates.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('item_damages')
        .update(updates)
        .eq('id', damageId);

      if (error) throw error;

      toast.success('Status atualizado');
      fetchDamages();
      setDetailsOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setSaving(false);
    }
  };

  const filteredDamages = damages.filter((damage) => {
    const matchesSearch = damage.inventory_item?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      damage.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && damage.status === activeTab;
  });

  const stats = {
    total: damages.length,
    pending: damages.filter(d => d.status === 'pending').length,
    under_repair: damages.filter(d => d.status === 'under_repair').length,
    resolved: damages.filter(d => ['repaired', 'written_off'].includes(d.status)).length,
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Avarias" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Controle de Avarias" 
        subtitle={`${damages.length} registros`}
      />

      <div className="p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setActiveTab('pending')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-100">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setActiveTab('under_repair')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Wrench className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.under_repair}</p>
                  <p className="text-sm text-muted-foreground">Em Reparo</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer" onClick={() => setActiveTab('repaired')}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-100">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.resolved}</p>
                  <p className="text-sm text-muted-foreground">Resolvidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar avarias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="pending">Pendentes</TabsTrigger>
            <TabsTrigger value="under_repair">Em Reparo</TabsTrigger>
            <TabsTrigger value="repaired">Resolvidas</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredDamages.length === 0 ? (
              <EmptyState
                icon={AlertTriangle}
                title="Nenhuma avaria encontrada"
                description="Não há registros de avarias com os filtros selecionados."
              />
            ) : (
              <div className="space-y-3">
                {filteredDamages.map((damage) => {
                  const severity = severityConfig[damage.severity] || severityConfig.minor;
                  const status = statusConfig[damage.status] || statusConfig.pending;
                  const StatusIcon = status.icon;

                  return (
                    <Card 
                      key={damage.id}
                      className="cursor-pointer hover:border-primary/30 transition-all"
                      onClick={() => {
                        setSelectedDamage(damage);
                        setDetailsOpen(true);
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-4">
                          <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                            {damage.inventory_item?.photo ? (
                              <img 
                                src={damage.inventory_item.photo} 
                                alt={damage.inventory_item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <AlertTriangle className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h4 className="font-medium">{damage.inventory_item?.name}</h4>
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {damage.description}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Badge className={cn(severity.bgColor, severity.color, 'border-0')}>
                                  {severity.label}
                                </Badge>
                                <Badge className={cn(status.bgColor, status.color, 'border-0')}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {status.label}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              <span>Qtd: {damage.quantity}</span>
                              {damage.rental?.title && <span>• {damage.rental.title}</span>}
                              <span>• {format(new Date(damage.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                            </div>
                          </div>
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

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedDamage && (
            <>
              <DialogHeader>
                <DialogTitle>Detalhes da Avaria</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-start gap-4">
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {selectedDamage.inventory_item?.photo ? (
                      <img 
                        src={selectedDamage.inventory_item.photo} 
                        alt={selectedDamage.inventory_item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{selectedDamage.inventory_item?.name}</h3>
                    <p className="text-muted-foreground">Quantidade afetada: {selectedDamage.quantity}</p>
                    {selectedDamage.rental?.title && (
                      <p className="text-sm text-muted-foreground">Locação: {selectedDamage.rental.title}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Descrição do Dano</Label>
                  <p className="text-foreground">{selectedDamage.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Gravidade</Label>
                    <Badge className={cn(
                      severityConfig[selectedDamage.severity]?.bgColor,
                      severityConfig[selectedDamage.severity]?.color,
                      'border-0'
                    )}>
                      {severityConfig[selectedDamage.severity]?.label}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Data do Registro</Label>
                    <p>{format(new Date(selectedDamage.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                  </div>
                </div>

                {selectedDamage.repair_cost && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Custo Estimado de Reparo</Label>
                    <p className="font-semibold">R$ {selectedDamage.repair_cost.toLocaleString('pt-BR')}</p>
                  </div>
                )}

                {selectedDamage.photos && selectedDamage.photos.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Fotos</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedDamage.photos.map((photo, index) => (
                        <img 
                          key={index}
                          src={photo}
                          alt={`Foto ${index + 1}`}
                          className="h-24 w-24 object-cover rounded-lg border cursor-pointer hover:opacity-80"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {selectedDamage.notes && (
                  <div className="space-y-1">
                    <Label className="text-muted-foreground">Observações</Label>
                    <p>{selectedDamage.notes}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Atualizar Status</Label>
                  <Select
                    value={selectedDamage.status}
                    onValueChange={(value) => handleUpdateStatus(selectedDamage.id, value)}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="under_repair">Em Reparo</SelectItem>
                      <SelectItem value="repaired">Reparado</SelectItem>
                      <SelectItem value="written_off">Baixado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
