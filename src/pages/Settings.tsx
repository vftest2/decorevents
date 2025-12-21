import { useState, useEffect } from 'react';
import { 
  Building2, 
  Palette, 
  Users, 
  Bell, 
  Shield, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CategoryManager } from '@/components/settings/CategoryManager';
import { UserManager } from '@/components/settings/UserManager';
import { BrandingManager } from '@/components/settings/BrandingManager';

export default function Settings() {
  const { currentEntity, refreshEntity } = useEntity();
  const [entityName, setEntityName] = useState('');
  const [entitySlug, setEntitySlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentEntity) {
      setEntityName(currentEntity.name || '');
      setEntitySlug(currentEntity.slug || '');
      setLoading(false);
    }
  }, [currentEntity]);

  const handleSaveEntity = async () => {
    if (!currentEntity?.id) return;

    if (!entityName.trim()) {
      toast.error('Nome da entidade é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('entities')
        .update({
          name: entityName.trim()
        })
        .eq('id', currentEntity.id);

      if (error) throw error;

      toast.success('Informações atualizadas com sucesso');
      refreshEntity();
    } catch (error) {
      console.error('Error updating entity:', error);
      toast.error('Erro ao atualizar informações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <Header title="Configurações" subtitle="Carregando..." />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Header 
        title="Configurações" 
        subtitle="Personalize sua entidade"
      />

      <div className="p-6">
        <Tabs defaultValue="branding" className="space-y-6">
          <TabsList className="bg-secondary/50 p-1 flex-wrap h-auto">
            <TabsTrigger value="branding" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Branding</span>
            </TabsTrigger>
            <TabsTrigger value="personalization" className="gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Personalização</span>
            </TabsTrigger>
            <TabsTrigger value="entity" className="gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Entidade</span>
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Usuários</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Notificações</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Segurança</span>
            </TabsTrigger>
          </TabsList>

          {/* Branding Tab */}
          <TabsContent value="branding" className="space-y-6 animate-fade-in">
            <BrandingManager />
          </TabsContent>

          {/* Personalization Tab */}
          <TabsContent value="personalization" className="space-y-6 animate-fade-in">
            <CategoryManager />
          </TabsContent>

          {/* Entity Tab */}
          <TabsContent value="entity" className="space-y-6 animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Informações da Entidade</CardTitle>
                <CardDescription>
                  Dados básicos da sua empresa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="entityName">Nome da Entidade</Label>
                    <Input
                      id="entityName"
                      value={entityName}
                      onChange={(e) => setEntityName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="slug">Identificador (Slug)</Label>
                    <Input
                      id="slug"
                      value={entitySlug}
                      readOnly
                      className="bg-muted"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleSaveEntity}
                  disabled={saving}
                  className="gradient-primary border-0 shadow-glow"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="animate-fade-in">
            <UserManager />
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Preferências de Notificação</CardTitle>
                <CardDescription>
                  Configure como você deseja receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configurações de notificações em desenvolvimento...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="animate-fade-in">
            <Card>
              <CardHeader>
                <CardTitle>Segurança</CardTitle>
                <CardDescription>
                  Configurações de segurança da conta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Configurações de segurança em desenvolvimento...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
