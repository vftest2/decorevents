import { useState, useEffect } from 'react';
import { Package, Search, Filter, Plus, Loader2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { InventoryCard } from '@/components/inventory/InventoryCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface InventoryCategory {
  id: string;
  entity_id: string;
  name: string;
  description: string | null;
  color: string | null;
}

interface InventoryItem {
  id: string;
  entity_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  total_quantity: number | null;
  available_quantity: number | null;
  rental_price: number | null;
  photo: string | null;
  category?: InventoryCategory;
}

export default function Inventory() {
  const { currentEntity } = useEntity();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category_id: '',
    total_quantity: 1,
    available_quantity: 1,
    rental_price: 0,
    photo: ''
  });

  useEffect(() => {
    if (currentEntity?.id) {
      fetchData();
    }
  }, [currentEntity?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('entity_id', currentEntity!.id)
        .order('name');

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch items with categories
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select(`
          *,
          category:inventory_categories(*)
        `)
        .eq('entity_id', currentEntity!.id)
        .order('name');

      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Erro ao carregar estoque');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('inventory_items').insert({
        entity_id: currentEntity!.id,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        category_id: formData.category_id || null,
        total_quantity: formData.total_quantity,
        available_quantity: formData.available_quantity,
        rental_price: formData.rental_price,
        photo: formData.photo.trim() || null
      });

      if (error) throw error;

      toast.success('Item adicionado com sucesso');
      setDialogOpen(false);
      setFormData({
        name: '',
        description: '',
        category_id: '',
        total_quantity: 1,
        available_quantity: 1,
        rental_price: 0,
        photo: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Erro ao criar item');
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <MainLayout>
        <Header title="Estoque" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Estoque" 
        subtitle={`${items.length} itens cadastrados`}
        showAddButton
        addButtonLabel="Novo Item"
        onAddClick={() => setDialogOpen(true)}
      />

      <div className="p-6 space-y-6">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar itens..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
              !selectedCategory
                ? 'bg-primary text-primary-foreground shadow-glow'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            )}
          >
            Todas Categorias
            <Badge 
              variant="secondary" 
              className={cn(
                'h-5 min-w-[20px] px-1.5',
                !selectedCategory && 'bg-primary-foreground/20 text-primary-foreground'
              )}
            >
              {items.length}
            </Badge>
          </button>
          {categories.map((category) => {
            const count = items.filter(i => i.category_id === category.id).length;
            return (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-200',
                  selectedCategory === category.id
                    ? 'bg-primary text-primary-foreground shadow-glow'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                )}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: category.color || '#6B7280' }}
                />
                {category.name}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    'h-5 min-w-[20px] px-1.5',
                    selectedCategory === category.id && 'bg-primary-foreground/20 text-primary-foreground'
                  )}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* Inventory Grid */}
        {filteredItems.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Nenhum item encontrado"
            description="Não há itens com os filtros selecionados. Tente ajustar a busca ou adicione novos itens."
            actionLabel="Adicionar Item"
            onAction={() => setDialogOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item, index) => (
              <InventoryCard
                key={item.id}
                item={{
                  id: item.id,
                  entityId: item.entity_id,
                  name: item.name,
                  description: item.description || undefined,
                  categoryId: item.category_id || '',
                  category: item.category ? {
                    id: item.category.id,
                    entityId: item.category.entity_id,
                    name: item.category.name,
                    description: item.category.description || undefined,
                    color: item.category.color || '#6B7280'
                  } : undefined,
                  totalQuantity: item.total_quantity || 0,
                  availableQuantity: item.available_quantity || 0,
                  rentalPrice: item.rental_price || 0,
                  photo: item.photo || undefined,
                  createdAt: new Date()
                }}
                index={index}
                onClick={() => console.log('Item clicked:', item)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Item de Estoque</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do item"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição do item"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(value) => setFormData({ ...formData, category_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="total_quantity">Quantidade Total</Label>
                <Input
                  id="total_quantity"
                  type="number"
                  min="0"
                  value={formData.total_quantity}
                  onChange={(e) => setFormData({ ...formData, total_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="available_quantity">Disponível</Label>
                <Input
                  id="available_quantity"
                  type="number"
                  min="0"
                  value={formData.available_quantity}
                  onChange={(e) => setFormData({ ...formData, available_quantity: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rental_price">Preço de Aluguel (R$)</Label>
              <Input
                id="rental_price"
                type="number"
                min="0"
                step="0.01"
                value={formData.rental_price}
                onChange={(e) => setFormData({ ...formData, rental_price: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="photo">URL da Foto</Label>
              <Input
                id="photo"
                value={formData.photo}
                onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Item
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
