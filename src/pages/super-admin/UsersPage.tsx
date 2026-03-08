import { useState } from 'react';
import { Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { UsersTable } from '@/components/super-admin/UsersTable';
import { UserDialog } from '@/components/super-admin/UserDialog';
import { useEntityUsers } from '@/hooks/useEntityUsers';
import { Skeleton } from '@/components/ui/skeleton';

export default function UsersPage() {
  const {
    users,
    entities,
    isLoading,
    fetchUsers,
    createUser,
    toggleUserStatus,
    updateUserRole,
  } = useEntityUsers();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState<string>('all');

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.profile.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.profile.position?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesEntity =
      filterEntity === 'all' || user.entity.id === filterEntity;

    return matchesSearch && matchesEntity;
  });

  const handleSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      await createUser(data);
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
              Usuários
            </h1>
            <p className="text-muted-foreground mt-1">
              Gerencie os usuários de cada entidade
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-gradient-warm hover:opacity-90"
              disabled={entities.length === 0}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou cargo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              {entities.map((entity) => (
                <SelectItem key={entity.id} value={entity.id}>
                  {entity.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Info */}
        {entities.length === 0 && !isLoading && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
            <p className="text-sm text-warning-foreground">
              Nenhuma entidade ativa encontrada. Crie uma entidade primeiro para
              poder adicionar usuários.
            </p>
          </div>
        )}

        {/* Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {filteredUsers.length} de {users.length} usuário(s)
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : (
            <UsersTable
              users={filteredUsers}
              onToggleStatus={toggleUserStatus}
              onChangeRole={updateUserRole}
            />
          )}
        </div>
      </div>

      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entities={entities}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />
    </SuperAdminLayout>
  );
}
