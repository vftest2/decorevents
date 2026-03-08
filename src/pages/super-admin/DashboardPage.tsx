import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { SuperAdminLayout } from '@/components/super-admin/SuperAdminLayout';
import { StatsCards } from '@/components/super-admin/StatsCards';
import { useEntities } from '@/hooks/useEntities';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SuperAdminDashboardPage() {
  const { entities, stats, isLoading } = useEntities();
  const navigate = useNavigate();

  const recentEntities = entities.slice(0, 5);

  return (
    <SuperAdminLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display tracking-tight">
              Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Visão geral do sistema
            </p>
          </div>
          <Button
            onClick={() => navigate('/super-admin/entities')}
            className="bg-gradient-warm hover:opacity-90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Nova Entidade
          </Button>
        </div>

        {/* Stats */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <StatsCards stats={stats} />
        )}

        {/* Recent Entities */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-display">
                Entidades Recentes
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/super-admin/entities')}
              >
                Ver todas
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : recentEntities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma entidade cadastrada
                </p>
              ) : (
                <div className="space-y-3">
                  {recentEntities.map((entity) => (
                    <div
                      key={entity.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div>
                        <p className="font-medium">{entity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {entity.email || entity.cnpj || 'Sem informações'}
                        </p>
                      </div>
                      <Badge
                        variant={entity.is_active ? 'default' : 'secondary'}
                        className={
                          entity.is_active
                            ? 'bg-success/10 text-success'
                            : 'bg-destructive/10 text-destructive'
                        }
                      >
                        {entity.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-display">
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/super-admin/entities')}
              >
                Gerenciar Entidades
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/super-admin/users')}
              >
                Gerenciar Usuários
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
