import { useState } from 'react';
import { Package, Search, Filter } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { InventoryCard } from '@/components/inventory/InventoryCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockInventory, mockCategories } from '@/data/mockData';
import { cn } from '@/lib/utils';

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredItems = mockInventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <MainLayout>
      <Header 
        title="Estoque" 
        subtitle={`${mockInventory.length} itens cadastrados`}
        showAddButton
        addButtonLabel="Novo Item"
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
              {mockInventory.length}
            </Badge>
          </button>
          {mockCategories.map((category) => {
            const count = mockInventory.filter(i => i.categoryId === category.id).length;
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
                  style={{ backgroundColor: category.color }}
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
            onAction={() => {}}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredItems.map((item, index) => (
              <InventoryCard
                key={item.id}
                item={item}
                index={index}
                onClick={() => console.log('Item clicked:', item)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
