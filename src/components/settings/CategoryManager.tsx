import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Category {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  entity_id: string;
}

const colorOptions = [
  '#EF4444', '#F97316', '#F59E0B', '#EAB308', '#84CC16',
  '#22C55E', '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9',
  '#3B82F6', '#6366F1', '#8B5CF6', '#A855F7', '#D946EF',
  '#EC4899', '#F43F5E', '#78716C', '#6B7280', '#71717A',
];

const emojiOptions = [
  '🎉', '🎈', '🎊', '🎁', '🎀', '💐', '🌸', '🌺', '🌹', '🌷',
  '🪑', '🛋️', '🏮', '💡', '🕯️', '🖼️', '🎨', '📦', '🧺', '🎪',
  '⭐', '✨', '💎', '🔥', '❤️', '💜', '💙', '💚', '💛', '🧡',
];

export function CategoryManager() {
  const { currentEntity } = useEntity();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
    emoji: '',
  });

  useEffect(() => {
    if (currentEntity?.id) {
      fetchCategories();
    }
  }, [currentEntity?.id]);

  const fetchCategories = async () => {
    if (!currentEntity?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('*')
        .eq('entity_id', currentEntity.id)
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Erro ao carregar categorias');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (category?: Category) => {
    if (category) {
      setEditingCategory(category);
      // Parse emoji from color field if it starts with emoji
      const hasEmoji = category.color && emojiOptions.includes(category.color.split('|')[1]);
      const colorValue = category.color?.split('|')[0] || '#6B7280';
      const emojiValue = category.color?.split('|')[1] || '';
      
      setFormData({
        name: category.name,
        description: category.description || '',
        color: colorValue,
        emoji: emojiValue,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        description: '',
        color: '#6B7280',
        emoji: '',
      });
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentEntity?.id || !formData.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }

    setSaving(true);
    try {
      // Store color and emoji together
      const colorWithEmoji = formData.emoji 
        ? `${formData.color}|${formData.emoji}`
        : formData.color;

      if (editingCategory) {
        const { error } = await supabase
          .from('inventory_categories')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: colorWithEmoji,
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        toast.success('Categoria atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('inventory_categories')
          .insert({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            color: colorWithEmoji,
            entity_id: currentEntity.id,
          });

        if (error) throw error;
        toast.success('Categoria criada com sucesso');
      }

      setDialogOpen(false);
      fetchCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error('Erro ao salvar categoria');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!categoryToDelete) return;

    try {
      const { error } = await supabase
        .from('inventory_categories')
        .delete()
        .eq('id', categoryToDelete.id);

      if (error) throw error;
      toast.success('Categoria removida com sucesso');
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Erro ao remover categoria. Verifique se não há itens vinculados.');
    } finally {
      setDeleteDialogOpen(false);
      setCategoryToDelete(null);
    }
  };

  const parseColorAndEmoji = (colorField: string | null) => {
    if (!colorField) return { color: '#6B7280', emoji: '' };
    const parts = colorField.split('|');
    return {
      color: parts[0] || '#6B7280',
      emoji: parts[1] || '',
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Categorias de Estoque</CardTitle>
          <CardDescription>
            Crie e gerencie categorias para organizar seu estoque
          </CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenDialog()}
              className="gradient-primary border-0"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
              <DialogDescription>
                {editingCategory 
                  ? 'Altere as informações da categoria' 
                  : 'Crie uma nova categoria para organizar seu estoque'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Mesas e Cadeiras"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição opcional"
                />
              </div>

              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map((color) => (
                    <button
                      key={color}
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        'h-8 w-8 rounded-full transition-all duration-200 border-2',
                        formData.color === color 
                          ? 'border-foreground scale-110 shadow-lg' 
                          : 'border-transparent hover:scale-105'
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Emoji (opcional)</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setFormData({ ...formData, emoji: '' })}
                    className={cn(
                      'h-8 w-8 rounded-lg border-2 flex items-center justify-center text-xs transition-all',
                      formData.emoji === '' 
                        ? 'border-primary bg-primary/10' 
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                  {emojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => setFormData({ ...formData, emoji })}
                      className={cn(
                        'h-8 w-8 rounded-lg border-2 flex items-center justify-center text-lg transition-all',
                        formData.emoji === emoji 
                          ? 'border-primary bg-primary/10 scale-110' 
                          : 'border-border hover:border-primary/50 hover:scale-105'
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="space-y-2">
                <Label>Prévia</Label>
                <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                  <div 
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-xl"
                    style={{ backgroundColor: formData.color }}
                  >
                    {formData.emoji || ''}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      {formData.name || 'Nome da categoria'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formData.description || 'Descrição'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={saving}
                className="gradient-primary border-0"
              >
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingCategory ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhuma categoria criada ainda</p>
            <p className="text-sm text-muted-foreground mt-1">
              Clique em "Nova Categoria" para começar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => {
              const { color, emoji } = parseColorAndEmoji(category.color);
              return (
                <div
                  key={category.id}
                  className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-md transition-all"
                >
                  <div 
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{ backgroundColor: color }}
                  >
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {category.name}
                    </p>
                    {category.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {category.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleOpenDialog(category)}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setCategoryToDelete(category);
                        setDeleteDialogOpen(true);
                      }}
                      className="h-8 w-8 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover a categoria "{categoryToDelete?.name}"?
              Esta ação não pode ser desfeita e pode afetar itens vinculados a ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
