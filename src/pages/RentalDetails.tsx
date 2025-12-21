import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Package, Loader2, Calendar, Clock, User, MapPin,
  Plus, Trash2, Check, X, AlertTriangle, Camera
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RegisterDamageDialog } from '@/components/rentals/RegisterDamageDialog';

interface RentalItem {
  id: string;
  rental_id: string;
  inventory_item_id: string;
  quantity: number;
  unit_price: number | null;
  checked_out: boolean;
  checked_in: boolean;
  returned_quantity: number;
  damaged_quantity: number;
  lost_quantity: number;
  notes: string | null;
  inventory_item: {
    id: string;
    name: string;
    photo: string | null;
    available_quantity: number | null;
    rental_price: number | null;
  };
}

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
  event?: { title: string; address: string } | null;
  client?: { name: string; phone: string } | null;
}

interface InventoryItem {
  id: string;
  name: string;
  available_quantity: number | null;
  rental_price: number | null;
  photo: string | null;
}

const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  draft: { label: 'Rascunho', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  confirmed: { label: 'Confirmado', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  out: { label: 'Em Locação', color: 'text-orange-600', bgColor: 'bg-orange-100' },
  returned: { label: 'Retornado', color: 'text-green-600', bgColor: 'bg-green-100' },
  completed: { label: 'Concluído', color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
};

export default function RentalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentEntity } = useEntity();
  
  const [rental, setRental] = useState<Rental | null>(null);
  const [rentalItems, setRentalItems] = useState<RentalItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [damageDialogOpen, setDamageDialogOpen] = useState(false);
  const [selectedItemForDamage, setSelectedItemForDamage] = useState<RentalItem | null>(null);
  
  const [newItem, setNewItem] = useState({
    inventory_item_id: '',
    quantity: 1,
    unit_price: 0,
  });

  useEffect(() => {
    if (id && currentEntity?.id) {
      fetchRental();
      fetchInventoryItems();
    }
  }, [id, currentEntity?.id]);

  const fetchRental = async () => {
    setLoading(true);
    try {
      const { data: rentalData, error: rentalError } = await supabase
        .from('rentals')
        .select(`
          *,
          event:events(title, address),
          client:clients(name, phone)
        `)
        .eq('id', id)
        .maybeSingle();

      if (rentalError) throw rentalError;
      if (!rentalData) {
        toast.error('Locação não encontrada');
        navigate('/rentals');
        return;
      }

      setRental(rentalData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('rental_items')
        .select(`
          *,
          inventory_item:inventory_items(id, name, photo, available_quantity, rental_price)
        `)
        .eq('rental_id', id);

      if (itemsError) throw itemsError;
      setRentalItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching rental:', error);
      toast.error('Erro ao carregar locação');
    } finally {
      setLoading(false);
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, available_quantity, rental_price, photo')
        .eq('entity_id', currentEntity!.id)
        .order('name');

      if (error) throw error;
      setInventoryItems(data || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const handleAddItem = async () => {
    if (!newItem.inventory_item_id) {
      toast.error('Selecione um item');
      return;
    }

    const inventoryItem = inventoryItems.find(i => i.id === newItem.inventory_item_id);
    if (!inventoryItem) return;

    if ((inventoryItem.available_quantity || 0) < newItem.quantity) {
      toast.error('Quantidade indisponível no estoque');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('rental_items').insert({
        rental_id: id,
        inventory_item_id: newItem.inventory_item_id,
        quantity: newItem.quantity,
        unit_price: newItem.unit_price || inventoryItem.rental_price,
      });

      if (error) throw error;

      toast.success('Item adicionado');
      setAddItemDialogOpen(false);
      setNewItem({ inventory_item_id: '', quantity: 1, unit_price: 0 });
      fetchRental();
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Erro ao adicionar item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    try {
      const { error } = await supabase
        .from('rental_items')
        .delete()
        .eq('id', itemToDelete);

      if (error) throw error;

      toast.success('Item removido');
      fetchRental();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao remover item');
    } finally {
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleCheckout = async (itemId: string, checked: boolean) => {
    try {
      const { error } = await supabase
        .from('rental_items')
        .update({ checked_out: checked })
        .eq('id', itemId);

      if (error) throw error;
      fetchRental();
    } catch (error) {
      console.error('Error updating checkout:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleCheckin = async (itemId: string, returnedQty: number, damagedQty: number, lostQty: number) => {
    try {
      const { error } = await supabase
        .from('rental_items')
        .update({
          checked_in: true,
          returned_quantity: returnedQty,
          damaged_quantity: damagedQty,
          lost_quantity: lostQty,
        })
        .eq('id', itemId);

      if (error) throw error;
      
      toast.success('Retorno registrado');
      fetchRental();
    } catch (error) {
      console.error('Error updating checkin:', error);
      toast.error('Erro ao registrar retorno');
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!rental) return;

    setSaving(true);
    try {
      const updates: Record<string, unknown> = { status: newStatus };
      
      if (newStatus === 'out' && !rental.actual_departure_date) {
        updates.actual_departure_date = new Date().toISOString();
      }
      if (newStatus === 'returned' && !rental.actual_return_date) {
        updates.actual_return_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from('rentals')
        .update(updates)
        .eq('id', rental.id);

      if (error) throw error;

      // Update inventory if going out
      if (newStatus === 'out') {
        for (const item of rentalItems) {
          await supabase
            .from('inventory_items')
            .update({
              available_quantity: (item.inventory_item.available_quantity || 0) - item.quantity
            })
            .eq('id', item.inventory_item_id);

          await supabase.from('item_history').insert({
            entity_id: currentEntity!.id,
            inventory_item_id: item.inventory_item_id,
            rental_id: rental.id,
            event_id: rental.event_id,
            action_type: 'rented',
            quantity: item.quantity,
            notes: `Locação: ${rental.title}`,
          });
        }
      }

      // Update inventory on return
      if (newStatus === 'returned') {
        for (const item of rentalItems) {
          const returnedQty = item.returned_quantity || item.quantity;
          await supabase
            .from('inventory_items')
            .update({
              available_quantity: (item.inventory_item.available_quantity || 0) + returnedQty
            })
            .eq('id', item.inventory_item_id);

          await supabase.from('item_history').insert({
            entity_id: currentEntity!.id,
            inventory_item_id: item.inventory_item_id,
            rental_id: rental.id,
            event_id: rental.event_id,
            action_type: 'returned',
            quantity: returnedQty,
            notes: `Retorno da locação: ${rental.title}`,
          });
        }
      }

      toast.success('Status atualizado');
      fetchRental();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    } finally {
      setSaving(false);
    }
  };

  const allCheckedOut = rentalItems.length > 0 && rentalItems.every(item => item.checked_out);
  const allCheckedIn = rentalItems.length > 0 && rentalItems.every(item => item.checked_in);
  const totalValue = rentalItems.reduce((sum, item) => sum + (item.unit_price || 0) * item.quantity, 0);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!rental) return null;

  const status = statusConfig[rental.status] || statusConfig.draft;

  return (
    <MainLayout>
      <Header 
        title={rental.title}
        subtitle={rental.client?.name || 'Sem cliente vinculado'}
      />

      <div className="p-6 space-y-6">
        {/* Back button and status */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/rentals')} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <div className="flex items-center gap-3">
            <Badge className={cn(status.bgColor, status.color, 'border-0 text-sm px-3 py-1')}>
              {status.label}
            </Badge>
            <Select value={rental.status} onValueChange={handleUpdateStatus} disabled={saving}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="confirmed">Confirmar</SelectItem>
                <SelectItem value="out" disabled={!allCheckedOut}>
                  Saída {!allCheckedOut && '(verifique itens)'}
                </SelectItem>
                <SelectItem value="returned">Retornado</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Período</p>
                  <p className="font-medium">
                    {rental.departure_date && format(new Date(rental.departure_date), 'dd/MM/yyyy', { locale: ptBR })}
                    {' → '}
                    {rental.return_date && format(new Date(rental.return_date), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Itens</p>
                  <p className="font-medium">{rentalItems.length} itens</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">💰</div>
                <div>
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="font-semibold text-primary">
                    R$ {totalValue.toLocaleString('pt-BR')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="items">
          <TabsList>
            <TabsTrigger value="items">Itens da Locação</TabsTrigger>
            <TabsTrigger value="checkout">Checklist Saída</TabsTrigger>
            <TabsTrigger value="checkin">Retorno</TabsTrigger>
          </TabsList>

          {/* Items Tab */}
          <TabsContent value="items" className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setAddItemDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Item
              </Button>
            </div>

            {rentalItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <p className="text-muted-foreground">Nenhum item adicionado</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setAddItemDialogOpen(true)}
                  >
                    Adicionar primeiro item
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {rentalItems.map((item) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                          {item.inventory_item.photo ? (
                            <img 
                              src={item.inventory_item.photo} 
                              alt={item.inventory_item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{item.inventory_item.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {item.quantity} | 
                            R$ {((item.unit_price || 0) * item.quantity).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => {
                            setItemToDelete(item.id);
                            setDeleteConfirmOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Checkout Tab */}
          <TabsContent value="checkout" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Checklist de Saída</CardTitle>
                <CardDescription>
                  Marque os itens conforme forem verificados para saída
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rentalItems.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      'flex items-center gap-4 p-3 rounded-lg border',
                      item.checked_out ? 'bg-green-50 border-green-200' : 'border-border'
                    )}
                  >
                    <Checkbox
                      checked={item.checked_out}
                      onCheckedChange={(checked) => handleCheckout(item.id, !!checked)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{item.inventory_item.name}</p>
                      <p className="text-sm text-muted-foreground">Quantidade: {item.quantity}</p>
                    </div>
                    {item.checked_out && <Check className="h-5 w-5 text-green-600" />}
                  </div>
                ))}
              </CardContent>
            </Card>

            {allCheckedOut && rental.status === 'confirmed' && (
              <Button 
                className="w-full gradient-primary border-0"
                onClick={() => handleUpdateStatus('out')}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Saída dos Itens
              </Button>
            )}
          </TabsContent>

          {/* Checkin Tab */}
          <TabsContent value="checkin" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conferência de Retorno</CardTitle>
                <CardDescription>
                  Registre a devolução dos itens e eventuais avarias
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {rentalItems.map((item) => (
                  <div 
                    key={item.id}
                    className={cn(
                      'p-4 rounded-lg border',
                      item.checked_in ? 'bg-green-50 border-green-200' : 'border-border'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="font-medium">{item.inventory_item.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Saída: {item.quantity} unidades
                        </p>
                      </div>
                      {item.checked_in ? (
                        <Badge className="bg-green-100 text-green-600 border-0">Conferido</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleCheckin(item.id, item.quantity, 0, 0)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          OK
                        </Button>
                      )}
                    </div>
                    
                    {!item.checked_in && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-orange-600"
                          onClick={() => {
                            setSelectedItemForDamage(item);
                            setDamageDialogOpen(true);
                          }}
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Avaria
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => handleCheckin(item.id, 0, 0, item.quantity)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Não devolvido
                        </Button>
                      </div>
                    )}

                    {item.checked_in && (item.damaged_quantity > 0 || item.lost_quantity > 0) && (
                      <div className="mt-2 text-sm">
                        {item.damaged_quantity > 0 && (
                          <p className="text-orange-600">
                            ⚠️ {item.damaged_quantity} avariado(s)
                          </p>
                        )}
                        {item.lost_quantity > 0 && (
                          <p className="text-destructive">
                            ❌ {item.lost_quantity} não devolvido(s)
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {allCheckedIn && rental.status === 'out' && (
              <Button 
                className="w-full gradient-primary border-0"
                onClick={() => handleUpdateStatus('returned')}
                disabled={saving}
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Finalizar Retorno
              </Button>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Item Dialog */}
      <Dialog open={addItemDialogOpen} onOpenChange={setAddItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Item</DialogTitle>
            <DialogDescription>
              Selecione um item do estoque para adicionar à locação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Item *</Label>
              <Select
                value={newItem.inventory_item_id}
                onValueChange={(value) => {
                  const item = inventoryItems.find(i => i.id === value);
                  setNewItem({
                    ...newItem,
                    inventory_item_id: value,
                    unit_price: item?.rental_price || 0
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um item" />
                </SelectTrigger>
                <SelectContent>
                  {inventoryItems
                    .filter(i => (i.available_quantity || 0) > 0)
                    .map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name} ({item.available_quantity} disponíveis)
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min="1"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Preço Unitário</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddItem} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Item</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este item da locação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Damage Dialog */}
      {selectedItemForDamage && (
        <RegisterDamageDialog
          open={damageDialogOpen}
          onOpenChange={setDamageDialogOpen}
          rentalItem={selectedItemForDamage}
          rental={rental}
          onSuccess={() => {
            fetchRental();
            setDamageDialogOpen(false);
            setSelectedItemForDamage(null);
          }}
        />
      )}
    </MainLayout>
  );
}
