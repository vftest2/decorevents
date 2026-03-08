import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { EntityUser } from '@/hooks/useEntityUsers';
import { ROLE_LABELS, AppRole } from '@/types/database';
import { MoreHorizontal, Power, PowerOff, Shield } from 'lucide-react';

interface UsersTableProps {
  users: EntityUser[];
  onToggleStatus: (userId: string, isActive: boolean) => void;
  onChangeRole: (userId: string, entityId: string, role: AppRole) => void;
}

export function UsersTable({ users, onToggleStatus, onChangeRole }: UsersTableProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    user: EntityUser | null;
    action: 'activate' | 'deactivate';
  }>({
    open: false,
    user: null,
    action: 'deactivate',
  });

  const handleToggleClick = (user: EntityUser) => {
    setConfirmDialog({
      open: true,
      user,
      action: user.profile.is_active ? 'deactivate' : 'activate',
    });
  };

  const handleConfirm = () => {
    if (confirmDialog.user) {
      onToggleStatus(
        confirmDialog.user.id,
        confirmDialog.action === 'activate'
      );
    }
    setConfirmDialog({ open: false, user: null, action: 'deactivate' });
  };

  const getUserRole = (user: EntityUser): string => {
    const role = user.roles[0]?.role;
    return role ? ROLE_LABELS[role] : 'Sem papel';
  };

  const getUserRoleValue = (user: EntityUser): AppRole | null => {
    return user.roles[0]?.role || null;
  };

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Nenhum usuário cadastrado.</p>
        <p className="text-sm text-muted-foreground">
          Clique em "Novo Usuário" para começar.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Entidade</TableHead>
              <TableHead>Cargo</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{user.profile.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {user.profile.phone || '-'}
                    </p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{user.entity.name}</Badge>
                </TableCell>
                <TableCell>{user.profile.position || '-'}</TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    {getUserRole(user)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.profile.is_active ? 'default' : 'secondary'}
                    className={
                      user.profile.is_active
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    }
                  >
                    {user.profile.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(user.profile.created_at), "dd 'de' MMM, yyyy", {
                    locale: ptBR,
                  })}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => {
                          const currentRole = getUserRoleValue(user);
                          const newRole = currentRole === 'entity_admin' ? 'manager' : 'entity_admin';
                          onChangeRole(user.id, user.entity.id, newRole);
                        }}
                      >
                        <Shield className="mr-2 h-4 w-4" />
                        {getUserRoleValue(user) === 'entity_admin'
                          ? 'Rebaixar para Gerente'
                          : 'Promover a Admin'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleClick(user)}>
                        {user.profile.is_active ? (
                          <>
                            <PowerOff className="mr-2 h-4 w-4" />
                            Desativar
                          </>
                        ) : (
                          <>
                            <Power className="mr-2 h-4 w-4" />
                            Ativar
                          </>
                        )}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={(open) =>
          setConfirmDialog((prev) => ({ ...prev, open }))
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.action === 'activate'
                ? 'Ativar Usuário'
                : 'Desativar Usuário'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'activate'
                ? `Tem certeza que deseja ativar "${confirmDialog.user?.profile.full_name}"? O usuário poderá acessar o sistema novamente.`
                : `Tem certeza que deseja desativar "${confirmDialog.user?.profile.full_name}"? O usuário não poderá mais acessar o sistema.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                confirmDialog.action === 'deactivate'
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              }
            >
              {confirmDialog.action === 'activate' ? 'Ativar' : 'Desativar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
