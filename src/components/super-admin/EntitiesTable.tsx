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
import { Entity } from '@/types/database';
import { MoreHorizontal, Pencil, Power, PowerOff } from 'lucide-react';

interface EntitiesTableProps {
  entities: Entity[];
  onEdit: (entity: Entity) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

export function EntitiesTable({ entities, onEdit, onToggleStatus }: EntitiesTableProps) {
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    entity: Entity | null;
    action: 'activate' | 'deactivate';
  }>({
    open: false,
    entity: null,
    action: 'deactivate',
  });

  const handleToggleClick = (entity: Entity) => {
    setConfirmDialog({
      open: true,
      entity,
      action: entity.is_active ? 'deactivate' : 'activate',
    });
  };

  const handleConfirm = () => {
    if (confirmDialog.entity) {
      onToggleStatus(
        confirmDialog.entity.id,
        confirmDialog.action === 'activate'
      );
    }
    setConfirmDialog({ open: false, entity: null, action: 'deactivate' });
  };

  if (entities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">Nenhuma entidade cadastrada.</p>
        <p className="text-sm text-muted-foreground">
          Clique em "Nova Entidade" para começar.
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
              <TableHead>CNPJ</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criado em</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entities.map((entity) => (
              <TableRow key={entity.id}>
                <TableCell className="font-medium">{entity.name}</TableCell>
                <TableCell>{entity.cnpj || '-'}</TableCell>
                <TableCell>{entity.email || '-'}</TableCell>
                <TableCell>{entity.phone || '-'}</TableCell>
                <TableCell>
                  <Badge
                    variant={entity.is_active ? 'default' : 'secondary'}
                    className={
                      entity.is_active
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                    }
                  >
                    {entity.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {format(new Date(entity.created_at), "dd 'de' MMM, yyyy", {
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
                      <DropdownMenuItem onClick={() => onEdit(entity)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleToggleClick(entity)}>
                        {entity.is_active ? (
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
                ? 'Ativar Entidade'
                : 'Desativar Entidade'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.action === 'activate'
                ? `Tem certeza que deseja ativar "${confirmDialog.entity?.name}"? Os usuários desta entidade poderão acessar o sistema novamente.`
                : `Tem certeza que deseja desativar "${confirmDialog.entity?.name}"? Os usuários desta entidade não poderão mais acessar o sistema.`}
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
