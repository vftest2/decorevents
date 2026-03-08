import { useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { EntitiesTable } from '@/components/super-admin/EntitiesTable';
import { EntityDialog } from '@/components/super-admin/EntityDialog';
import { useEntities } from '@/hooks/useEntities';
import { Entity } from '@/types/database';
import { Skeleton } from '@/components/ui/skeleton';

export default function EntitiesPage() {
  const {
    entities,
    isLoading,
    fetchEntities,
    createEntity,
    updateEntity,
    toggleEntityStatus,
  } = useEntities();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntity, setEditingEntity] = useState<Entity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEntities = entities.filter(
    (entity) =>
      entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreate = () => {
    setEditingEntity(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (entity: Entity) => {
    setEditingEntity(entity);
    setDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      if (editingEntity) {
        await updateEntity(editingEntity.id, data);
      } else {
        await createEntity(data);
      }
      setDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">
              Entidades
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie as empresas cadastradas no sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchEntities}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={handleOpenCreate} className="bg-gradient-warm hover:opacity-90">
              <Plus className="mr-2 h-4 w-4" />
              Nova Entidade
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredEntities.length} de {entities.length} entidade(s)
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <EntitiesTable
              entities={filteredEntities}
              onEdit={handleOpenEdit}
              onToggleStatus={toggleEntityStatus}
            />
          )}
        </div>
      </div>

      <EntityDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entity={editingEntity}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </SuperAdminLayout>
  );
}
