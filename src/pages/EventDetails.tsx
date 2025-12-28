import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Package, 
  Plus, 
  Trash2, 
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ClipboardList,
  FileSignature
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useEntity } from '@/contexts/EntityContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { EventStatus } from '@/types';
import { EventContractSection } from '@/components/contracts/EventContractSection';

interface EventData {
  id: string;
  title: string;
  description: string | null;
  event_type: string | null;
  start_date: string;
  end_date: string;
  address: string | null;
  status: EventStatus;
  total_value: number | null;
  client_id: string | null;
  entity_id: string;
  clients: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

interface EventItem {
  id: string;
  event_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_price: number;
  inventory_items: {
    id: string;
    name: string;
    photo: string | null;
    available_quantity: number | null;
  } | null;
}

interface InventoryItem {
  id: string;
  name: string;
  rental_price: number | null;
  available_quantity: number | null;
  photo: string | null;
}

interface LinkedRental {
  id: string;
  title: string;
  status: string;
}

const statusConfig: Record<EventStatus, { label: string; color: string; bgColor: string }> = {
  budget: { label: 'Orçamento', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  confirmed: { label: 'Confirmado', color: 'text-success', bgColor: 'bg-success/10' },
  in_assembly: { label: 'Em Montagem', color: 'text-info', bgColor: 'bg-info/10' },
  in_transit: { label: 'Em Trânsito', color: 'text-warning', bgColor: 'bg-warning/10' },
  finished: { label: 'Finalizado', color: 'text-secondary-foreground', bgColor: 'bg-secondary' },
};

export default function EventDetails() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { currentEntity } = useEntity();
  
  const [event, setEvent] = useState<EventData | null>(null);
  const [eventItems, setEventItems] = useState<EventItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [linkedRental, setLinkedRental] = useState<LinkedRental | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState<string | null>(null);

  useEffect(() => {
    if (eventId && currentEntity?.id) {
      fetchEventData();
    }
  }, [eventId, currentEntity?.id]);

  const fetchEventData = async () => {
    if (!eventId) return;
    
    setIsLoading(true);
    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          clients (id, name, phone, email)
        `)
        .eq('id', eventId)
        .maybeSingle();

      if (eventError) throw eventError;
      if (!eventData) {
        toast.error('Evento não encontrado');
        navigate('/events');
        return;
      }

      setEvent(eventData as EventData);

      // Fetch event items
      const { data: itemsData, error: itemsError } = await supabase
        .from('event_items')
        .select(`
          *,
          inventory_items (id, name, photo, available_quantity)
        `)
        .eq('event_id', eventId);

      if (itemsError) throw itemsError;
      setEventItems((itemsData || []) as EventItem[]);

      // Fetch available inventory items
      if (currentEntity?.id) {
        const { data: inventoryData, error: inventoryError } = await supabase
          .from('inventory_items')
          .select('id, name, rental_price, available_quantity, photo')
          .eq('entity_id', currentEntity.id)
          .order('name');

        if (inventoryError) throw inventoryError;
        setInventoryItems(inventoryData || []);
      }

      // Check for linked rental
      const { data: rentalData, error: rentalError } = await supabase
        .from('rentals')
        .select('id, title, status')
        .eq('event_id', eventId)
        .maybeSingle();

      if (!rentalError && rentalData) {
        setLinkedRental(rentalData);
      }

    } catch (error) {
      console.error('Error fetching event data:', error);
      toast.error('Erro ao carregar dados do evento');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: EventStatus) => {
    if (!event) return;
    
    const previousStatus = event.status;
    
    // Confirm if changing to confirmed (will create rental)
    if (newStatus === 'confirmed' && previousStatus !== 'confirmed') {
      const confirmed = window.confirm(
        'Ao confirmar o evento, uma locação será criada automaticamente com todos os itens. Deseja continuar?'
      );
      if (!confirmed) return;
    }

    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: newStatus })
        .eq('id', event.id);

      if (error) throw error;

      setEvent({ ...event, status: newStatus });
      
      if (newStatus === 'confirmed' && previousStatus !== 'confirmed') {
        toast.success('Evento confirmado! Locação criada automaticamente.');
        // Refresh to get the linked rental
        setTimeout(() => fetchEventData(), 500);
      } else {
        toast.success('Status atualizado!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddItem = async () => {
    if (!event || !selectedItem || !itemQuantity) return;

    const quantity = parseInt(itemQuantity);
    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    const inventoryItem = inventoryItems.find(i => i.id === selectedItem);
    if (!inventoryItem) return;

    // Check if item already exists in event
    const existingItem = eventItems.find(ei => ei.inventory_item_id === selectedItem);
    if (existingItem) {
      toast.error('Este item já está no evento');
      return;
    }

    setIsAddingItem(true);
    try {
      const { error } = await supabase
        .from('event_items')
        .insert({
          event_id: event.id,
          inventory_item_id: selectedItem,
          quantity,
          unit_price: inventoryItem.rental_price || 0
        });

      if (error) throw error;

      toast.success('Item adicionado!');
      setIsAddItemOpen(false);
      setSelectedItem('');
      setItemQuantity('1');
      fetchEventData();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      setIsAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (event?.status === 'confirmed') {
      toast.error('Não é possível remover itens de um evento confirmado');
      return;
    }

    setIsDeletingItem(itemId);
    try {
      const { error } = await supabase
        .from('event_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Item removido!');
      fetchEventData();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover item');
    } finally {
      setIsDeletingItem(null);
    }
  };

  const calculateTotal = () => {
    return eventItems.reduce((sum, item) => sum + (item.quantity * (item.unit_price || 0)), 0);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <AlertTriangle className="h-12 w-12 text-warning" />
          <p className="text-muted-foreground">Evento não encontrado</p>
          <Button onClick={() => navigate('/events')}>Voltar para Eventos</Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title={event.title}
        subtitle={event.event_type || 'Evento'}
      />

      <div className="p-6 space-y-6">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/events')} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para Eventos
        </Button>

        {/* Status and Info Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={event.status}
                onValueChange={(value) => handleStatusChange(value as EventStatus)}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className={cn('w-full', statusConfig[event.status].bgColor)}>
                  <SelectValue>
                    <span className={cn('font-medium', statusConfig[event.status].color)}>
                      {statusConfig[event.status].label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="budget">Orçamento</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="in_assembly">Em Montagem</SelectItem>
                  <SelectItem value="in_transit">Em Trânsito</SelectItem>
                  <SelectItem value="finished">Finalizado</SelectItem>
                </SelectContent>
              </Select>
              {event.status === 'budget' && eventItems.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  <AlertTriangle className="h-3 w-3 inline mr-1" />
                  Ao confirmar, uma locação será criada automaticamente
                </p>
              )}
            </CardContent>
          </Card>

          {/* Date Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Data do Evento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium">
                {format(new Date(event.start_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </p>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <Clock className="h-3 w-3" />
                {format(new Date(event.start_date), 'HH:mm')} - {format(new Date(event.end_date), 'HH:mm')}
              </p>
            </CardContent>
          </Card>

          {/* Client Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {event.clients ? (
                <>
                  <p className="font-medium">{event.clients.name}</p>
                  {event.clients.phone && (
                    <p className="text-sm text-muted-foreground">{event.clients.phone}</p>
                  )}
                </>
              ) : (
                <p className="text-muted-foreground">Nenhum cliente vinculado</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Address */}
        {event.address && (
          <Card>
            <CardContent className="pt-4 flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
              <p>{event.address}</p>
            </CardContent>
          </Card>
        )}

        {/* Linked Rental Alert */}
        {linkedRental && (
          <Card className="border-success/50 bg-success/5">
            <CardContent className="pt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Locação vinculada</p>
                  <p className="text-sm text-muted-foreground">{linkedRental.title}</p>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to={`/rentals/${linkedRental.id}`}>
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Ver Locação
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Contracts Section */}
        <EventContractSection
          eventId={event.id}
          entityId={event.entity_id}
          clientId={event.client_id || undefined}
          clientName={event.clients?.name}
          clientEmail={event.clients?.email || undefined}
          clientPhone={event.clients?.phone || undefined}
          eventTitle={event.title}
          eventStatus={event.status}
          totalValue={event.total_value || undefined}
          startDate={event.start_date}
          address={event.address || undefined}
        />

        {/* Event Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Itens do Evento
            </CardTitle>
            {event.status === 'budget' && (
              <Button onClick={() => setIsAddItemOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Item
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {eventItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum item adicionado</p>
                {event.status === 'budget' && (
                  <Button 
                    variant="link" 
                    onClick={() => setIsAddItemOpen(true)}
                    className="mt-2"
                  >
                    Adicionar primeiro item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {eventItems.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                  >
                    <div className="flex items-center gap-3">
                      {item.inventory_items?.photo ? (
                        <img 
                          src={item.inventory_items.photo} 
                          alt={item.inventory_items.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{item.inventory_items?.name || 'Item não encontrado'}</p>
                        <p className="text-sm text-muted-foreground">
                          Qtd: {item.quantity} × R$ {(item.unit_price || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-medium">
                        R$ {(item.quantity * (item.unit_price || 0)).toFixed(2)}
                      </span>
                      {event.status === 'budget' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          disabled={isDeletingItem === item.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {isDeletingItem === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-between items-center pt-4 border-t border-border">
                  <span className="text-lg font-medium">Total</span>
                  <span className="text-xl font-bold">
                    R$ {calculateTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item do Estoque</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Disp: {item.available_quantity || 0})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min="1"
                value={itemQuantity}
                onChange={(e) => setItemQuantity(e.target.value)}
              />
            </div>
            {selectedItem && (
              <div className="text-sm text-muted-foreground">
                Preço unitário: R$ {(inventoryItems.find(i => i.id === selectedItem)?.rental_price || 0).toFixed(2)}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddItemOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem} disabled={isAddingItem || !selectedItem}>
              {isAddingItem ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Adicionar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}