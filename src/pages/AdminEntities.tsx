import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Building2, Plus, Search, MoreVertical, Edit2, Trash2, Users, Calendar, LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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

const COLOR_PRESETS = [
  { name: 'Coral', primary: '#E85A4F', secondary: '#F5F0EB', accent: '#E8A83C' },
  { name: 'Roxo', primary: '#7C3AED', secondary: '#F5F3FF', accent: '#A78BFA' },
  { name: 'Azul', primary: '#2563EB', secondary: '#EFF6FF', accent: '#60A5FA' },
  { name: 'Verde', primary: '#059669', secondary: '#ECFDF5', accent: '#34D399' },
  { name: 'Rosa', primary: '#DB2777', secondary: '#FDF2F8', accent: '#F472B6' },
  { name: 'Laranja', primary: '#EA580C', secondary: '#FFF7ED', accent: '#FB923C' },
];

type ColorPreset = typeof COLOR_PRESETS[number];

export default function AdminEntities() {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    primary_color: '#E85A4F',
    secondary_color: '#F5F0EB',
    accent_color: '#E8A83C',
    theme: 'light',
    is_active: true,
  });

  useEffect(() => {
    checkAuth();
    fetchEntities();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/admin');
      return;
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const isSuperAdmin = roles?.some(r => r.role === 'super_admin');
    if (!isSuperAdmin) {
      toast.error('Acesso negado');
      navigate('/admin');
    }
  };

  const fetchEntities = async () => {
    try {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntities(data || []);
    } catch (error) {
      console.error('Error fetching entities:', error);
      toast.error('Erro ao carregar entidades');
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

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

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.slug.trim()) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('entities')
        .insert({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
          theme: formData.theme,
          is_active: formData.is_active,
        });

      if (error) {
        if (error.message.includes('duplicate')) {
          toast.error('Já existe uma entidade com este slug');
        } else {
          throw error;
        }
        return;
      }

      toast.success('Entidade criada com sucesso!');
      setIsCreateDialogOpen(false);
      resetForm();
      fetchEntities();
    } catch (error) {
      console.error('Error creating entity:', error);
      toast.error('Erro ao criar entidade');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingEntity || !formData.name.trim() || !formData.slug.trim()) {
      toast.error('Nome e slug são obrigatórios');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('entities')
        .update({
          name: formData.name.trim(),
          slug: formData.slug.trim(),
          primary_color: formData.primary_color,
          secondary_color: formData.secondary_color,
          accent_color: formData.accent_color,
          theme: formData.theme,
          is_active: formData.is_active,
        })
        .eq('id', editingEntity.id);

      if (error) throw error;

      toast.success('Entidade atualizada com sucesso!');
      setEditingEntity(null);
      resetForm();
      fetchEntities();
    } catch (error) {
      console.error('Error updating entity:', error);
      toast.error('Erro ao atualizar entidade');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (entity: Entity) => {
    if (!confirm(`Tem certeza que deseja excluir "${entity.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('entities')
        .delete()
        .eq('id', entity.id);

      if (error) throw error;

      toast.success('Entidade excluída com sucesso!');
      fetchEntities();
    } catch (error) {
      console.error('Error deleting entity:', error);
      toast.error('Erro ao excluir entidade');
    }
  };

  const handleToggleActive = async (entity: Entity) => {
    try {
      const { error } = await supabase
        .from('entities')
        .update({ is_active: !entity.is_active })
        .eq('id', entity.id);

      if (error) throw error;

      toast.success(entity.is_active ? 'Entidade desativada' : 'Entidade ativada');
      fetchEntities();
    } catch (error) {
      console.error('Error toggling entity:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const openEditDialog = (entity: Entity) => {
    setFormData({
      name: entity.name,
      slug: entity.slug,
      primary_color: entity.primary_color || '#E85A4F',
      secondary_color: entity.secondary_color || '#F5F0EB',
      accent_color: entity.accent_color || '#E8A83C',
      theme: entity.theme || 'light',
      is_active: entity.is_active,
    });
    setEditingEntity(entity);
  };

  const applyColorPreset = (preset: ColorPreset) => {
    setFormData({
      ...formData,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  const filteredEntities = entities.filter(entity =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entity.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Link>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <h1 className="text-lg font-semibold">Administração de Entidades</h1>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar entidades..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => { resetForm(); setIsCreateDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Entidade
          </Button>
        </div>

        {/* Entities Grid */}
        {filteredEntities.length === 0 ? (
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
            {filteredEntities.map((entity) => (
              <Card key={entity.id} className="relative overflow-hidden">
                {/* Color Stripe */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: entity.primary_color }}
                />
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-lg text-white font-semibold"
                      style={{ backgroundColor: entity.primary_color }}
                    >
                      {entity.name.charAt(0)}
                    </div>
                    <div>
                      <CardTitle className="text-base">{entity.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{entity.slug}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditDialog(entity)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(entity)}
                      >
                        {entity.is_active ? 'Desativar' : 'Ativar'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(entity)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Badge variant={entity.is_active ? 'default' : 'secondary'}>
                      {entity.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                    {/* Color Preview */}
                    <div className="flex gap-1">
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: entity.primary_color }}
                        title="Cor primária"
                      />
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: entity.secondary_color }}
                        title="Cor secundária"
                      />
                      <div
                        className="h-4 w-4 rounded-full border"
                        style={{ backgroundColor: entity.accent_color }}
                        title="Cor de destaque"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nova Entidade</DialogTitle>
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
            <Button onClick={handleCreate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Entidade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingEntity} onOpenChange={(open) => !open && setEditingEntity(null)}>
        <DialogContent className="max-w-lg">
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
            <Button onClick={handleUpdate} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

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
          <Label>Nome da Entidade</Label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({
              ...formData,
              name: e.target.value,
              slug: generateSlug(e.target.value),
            })}
            placeholder="Ex: Minha Empresa"
          />
        </div>
        <div className="space-y-2">
          <Label>Slug (código da entidade)</Label>
          <Input
            value={formData.slug}
            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            placeholder="minha-empresa"
          />
          <p className="text-xs text-muted-foreground">
            Este será o código usado para login
          </p>
        </div>
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
              className="h-10 w-14 cursor-pointer rounded border"
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
              className="h-10 w-14 cursor-pointer rounded border"
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
              className="h-10 w-14 cursor-pointer rounded border"
            />
            <Input
              value={formData.accent_color}
              onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label>Entidade Ativa</Label>
          <p className="text-sm text-muted-foreground">
            Entidades inativas não podem fazer login
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
