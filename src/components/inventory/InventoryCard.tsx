import { Package, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InventoryItem } from '@/types';
import { cn } from '@/lib/utils';

export interface InventoryCardProps {
  item: InventoryItem;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  index?: number;
}

export function InventoryCard({ item, onClick, onEdit, onDelete, index = 0 }: InventoryCardProps) {
  const utilizationRate = ((item.totalQuantity - item.availableQuantity) / item.totalQuantity) * 100;
  const isLowStock = item.availableQuantity <= 2;

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.();
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete?.();
  };

  return (
    <div
      onClick={onClick}
      className="group overflow-hidden rounded-xl border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-lg cursor-pointer animate-slide-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Image */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {item.photo ? (
          <img
            src={item.photo}
            alt={item.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        
        {/* Stock badge */}
        {isLowStock && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Estoque baixo
            </Badge>
          </div>
        )}

        {/* Action buttons on hover */}
        {(onEdit || onDelete) && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                onClick={handleEdit}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm text-destructive hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Category */}
        {item.category && (
          <div className="absolute bottom-2 left-2">
            <Badge 
              variant="secondary" 
              className="bg-background/80 backdrop-blur-sm"
              style={{ borderColor: item.category.color }}
            >
              {item.category.name}
            </Badge>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {item.name}
        </h3>
        
        {item.description && (
          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
            {item.description}
          </p>
        )}

        {/* Stats */}
        <div className="mt-3 flex items-center justify-between">
          <div className="text-sm">
            <span className={cn(
              'font-semibold',
              isLowStock ? 'text-destructive' : 'text-foreground'
            )}>
              {item.availableQuantity}
            </span>
            <span className="text-muted-foreground">/{item.totalQuantity} disponíveis</span>
          </div>
          <p className="font-semibold text-primary">
            R$ {item.rentalPrice.toLocaleString('pt-BR')}
          </p>
        </div>

        {/* Utilization bar */}
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                utilizationRate > 80 ? 'bg-warning' : 'bg-primary'
              )}
              style={{ width: `${utilizationRate}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {utilizationRate.toFixed(0)}% em uso
          </p>
        </div>
      </div>
    </div>
  );
}
