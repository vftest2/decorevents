import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Plus, 
  Building2, 
  Search, 
  Palette, 
  Users, 
  Calendar,
  Package,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Entity {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  theme: string;
  is_active: boolean;
  created_at: string;
}

interface EntityStats {
  entity_id: string;
  users_count: number;
  events_count: number;
  inventory_count: number;
}


export default function Entities() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primary_color: '#E85A4F',
    secondary_color: '#F5F0EB',
    accent_color: '#E8A83C',
    theme: 'light',
    is_active: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch entities
  const { data: entities = [], isLoading } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Entity[];
    },
  });

  // Create entity mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('entities').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({ title: 'Entidade criada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar entidade', description: error.message, variant: 'destructive' });
    },
  });

  // Update entity mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const { error } = await supabase.from('entities').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      setEditingEntity(null);
      resetForm();
      toast({ title: 'Entidade atualizada com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar entidade', description: error.message, variant: 'destructive' });
    },
  });

  // Delete entity mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('entities').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast({ title: 'Entidade excluída com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir entidade', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      primary_color: '#E85A4F',
      secondary_color: '#F5F0EB',
      accent_color: '#E8A83C',
      theme: 'light',
      is_active: true,
    });
  };

  const handleEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setFormData({
      name: entity.name,
      slug: entity.slug,
      primary_color: entity.primary_color,
      secondary_color: entity.secondary_color,
      accent_color: entity.accent_color,
      theme: entity.theme,
      is_active: entity.is_active,
    });
  };

  const handleSubmit = () => {
    if (editingEntity) {
      updateMutation.mutate({ id: editingEntity.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const filteredEntities = entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const applyColorPreset = (preset: { primary: string; secondary: string; accent: string }) => {
    setFormData({
      ...formData,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent,
    });
  };

  return (
    <MainLayout>
      <Header
        title="Gestão de Entidades"
        subtitle="Gerencie todas as empresas/filiais do sistema"
      >
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setEditingEntity(null); }}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Entidade
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Criar Nova Entidade</DialogTitle>
            </DialogHeader>
            <EntityForm
              formData={formData}
              setFormData={setFormData}
              generateSlug={generateSlug}
              applyColorPreset={applyColorPreset}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Criando...' : 'Criar Entidade'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Header>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar entidades..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Entities Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-64" />
            </Card>
          ))}
        </div>
      ) : filteredEntities.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma entidade encontrada"
          description={
            searchQuery
              ? 'Nenhuma entidade corresponde à sua busca.'
              : 'Comece criando a primeira entidade do sistema.'
          }
          actionLabel={!searchQuery ? 'Nova Entidade' : undefined}
          onAction={!searchQuery ? () => setIsCreateDialogOpen(true) : undefined}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEntities.map((entity, index) => (
            <EntityCard
              key={entity.id}
              entity={entity}
              index={index}
              onEdit={() => handleEdit(entity)}
              onDelete={() => deleteMutation.mutate(entity.id)}
            />
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingEntity} onOpenChange={(open) => !open && setEditingEntity(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Entidade</DialogTitle>
          </DialogHeader>
          <EntityForm
            formData={formData}
            setFormData={setFormData}
            generateSlug={generateSlug}
            applyColorPreset={applyColorPreset}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingEntity(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

// Color presets definition
const COLOR_PRESETS = [
  { name: 'Coral', primary: '#E85A4F', secondary: '#F5F0EB', accent: '#E8A83C' },
  { name: 'Roxo', primary: '#7C3AED', secondary: '#F5F3FF', accent: '#A78BFA' },
  { name: 'Azul', primary: '#2563EB', secondary: '#EFF6FF', accent: '#60A5FA' },
  { name: 'Verde', primary: '#059669', secondary: '#ECFDF5', accent: '#34D399' },
  { name: 'Rosa', primary: '#DB2777', secondary: '#FDF2F8', accent: '#F472B6' },
  { name: 'Laranja', primary: '#EA580C', secondary: '#FFF7ED', accent: '#FB923C' },
];

type ColorPreset = typeof COLOR_PRESETS[number];

// Entity Form Component
function EntityForm({
  formData,
  setFormData,
  generateSlug,
  applyColorPreset,
}: {
  formData: {
    name: string;
    slug: string;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    theme: string;
    is_active: boolean;
  };
  setFormData: (data: typeof formData) => void;
  generateSlug: (name: string) => string;
  applyColorPreset: (preset: ColorPreset) => void;
}) {
  return (
    <div className="grid gap-6 py-4">
      {/* Basic Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Entidade</Label>
          <Input
            id="name"
            placeholder="Ex: Festas & Sonhos"
            value={formData.name}
            onChange={(e) => {
              setFormData({
                ...formData,
                name: e.target.value,
                slug: generateSlug(e.target.value),
              });
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input
            id="slug"
            placeholder="festas-sonhos"
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          />
        </div>
      </div>

      {/* Theme */}
      <div className="space-y-2">
        <Label>Tema</Label>
        <Select
          value={formData.theme}
          onValueChange={(value) => setFormData({ ...formData, theme: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">Claro</SelectItem>
            <SelectItem value="dark">Escuro</SelectItem>
            <SelectItem value="auto">Automático</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Color Presets */}
      <div className="space-y-3">
        <Label>Paleta de Cores</Label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.name}
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 transition-all hover:border-primary',
                formData.primary_color === preset.primary && 'border-primary ring-2 ring-primary/20'
              )}
              onClick={() => applyColorPreset(preset)}
            >
              <div
                className="h-4 w-4 rounded-full"
                style={{ backgroundColor: preset.primary }}
              />
              <span className="text-sm">{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Colors */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Cor Primária</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.primary_color}
              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
              className="h-10 w-12 cursor-pointer rounded border"
            />
            <Input
              value={formData.primary_color}
              onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Cor Secundária</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.secondary_color}
              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
              className="h-10 w-12 cursor-pointer rounded border"
            />
            <Input
              value={formData.secondary_color}
              onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Cor de Destaque</Label>
          <div className="flex gap-2">
            <input
              type="color"
              value={formData.accent_color}
              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
              className="h-10 w-12 cursor-pointer rounded border"
            />
            <Input
              value={formData.accent_color}
              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="space-y-2">
        <Label>Preview</Label>
        <div
          className="flex items-center gap-4 rounded-lg p-4"
          style={{ backgroundColor: formData.secondary_color }}
        >
          <div
            className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold"
            style={{ backgroundColor: formData.primary_color }}
          >
            {formData.name.charAt(0) || 'E'}
          </div>
          <div>
            <p className="font-semibold" style={{ color: formData.primary_color }}>
              {formData.name || 'Nome da Entidade'}
            </p>
            <p className="text-sm" style={{ color: formData.accent_color }}>
              {formData.slug || 'slug-da-entidade'}
            </p>
          </div>
        </div>
      </div>

      {/* Active Switch */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div>
          <Label>Entidade Ativa</Label>
          <p className="text-sm text-muted-foreground">
            Entidades inativas não podem acessar o sistema
          </p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
      </div>
    </div>
  );
}

// Entity Card Component
function EntityCard({
  entity,
  index,
  onEdit,
  onDelete,
}: {
  entity: Entity;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card
      className="group overflow-hidden transition-all duration-300 hover:shadow-lg animate-slide-up"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Color Banner */}
      <div
        className="h-2"
        style={{
          background: `linear-gradient(90deg, ${entity.primary_color}, ${entity.accent_color})`,
        }}
      />

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 items-center justify-center rounded-xl text-white font-bold text-lg shadow-md"
              style={{ backgroundColor: entity.primary_color }}
            >
              {entity.name.charAt(0)}
            </div>
            <div>
              <CardTitle className="text-lg">{entity.name}</CardTitle>
              <p className="text-sm text-muted-foreground">/{entity.slug}</p>
            </div>
          </div>
          <Badge variant={entity.is_active ? 'default' : 'secondary'}>
            {entity.is_active ? 'Ativa' : 'Inativa'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Color Palette Display */}
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1">
            <div
              className="h-5 w-5 rounded-full border"
              style={{ backgroundColor: entity.primary_color }}
              title="Primária"
            />
            <div
              className="h-5 w-5 rounded-full border"
              style={{ backgroundColor: entity.secondary_color }}
              title="Secundária"
            />
            <div
              className="h-5 w-5 rounded-full border"
              style={{ backgroundColor: entity.accent_color }}
              title="Destaque"
            />
          </div>
          <span className="text-xs text-muted-foreground capitalize ml-2">
            Tema: {entity.theme === 'light' ? 'Claro' : entity.theme === 'dark' ? 'Escuro' : 'Auto'}
          </span>
        </div>

        {/* Mock Stats - Replace with real data later */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-muted/50 p-2">
            <Users className="mx-auto h-4 w-4 text-muted-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">Usuários</p>
            <p className="font-semibold">--</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <Calendar className="mx-auto h-4 w-4 text-muted-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">Eventos</p>
            <p className="font-semibold">--</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-2">
            <Package className="mx-auto h-4 w-4 text-muted-foreground" />
            <p className="mt-1 text-xs text-muted-foreground">Itens</p>
            <p className="font-semibold">--</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Edit2 className="mr-2 h-3 w-3" />
            Editar
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="mr-2 h-3 w-3" />
            Visualizar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
