import { useState, useEffect } from 'react';
import { 
  Building2, 
  Palette, 
  Users, 
  Bell, 
  Shield, 
  Upload,
  Check,
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
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CategoryManager } from '@/components/settings/CategoryManager';

const themeOptions = [
  { id: 'light', label: 'Claro', icon: '☀️' },
  { id: 'dark', label: 'Escuro', icon: '🌙' },
  { id: 'auto', label: 'Automático', icon: '🔄' },
];

const colorPresets = [
  { primary: '#E85A4F', secondary: '#F5F0EB', accent: '#E8A83C', name: 'Coral' },
  { primary: '#4A90A4', secondary: '#F0F5F7', accent: '#2ECC71', name: 'Oceano' },
  { primary: '#9B59B6', secondary: '#F5F0F8', accent: '#E74C3C', name: 'Violeta' },
  { primary: '#27AE60', secondary: '#F0F8F0', accent: '#F39C12', name: 'Natureza' },
  { primary: '#2C3E50', secondary: '#F5F6F7', accent: '#3498DB', name: 'Executivo' },
  { primary: '#E91E63', secondary: '#FFF0F5', accent: '#FF9800', name: 'Vibrante' },
];

export default function Settings() {
  const { currentEntity } = useEntity();
  const navigate = useNavigate();
  const [selectedTheme, setSelectedTheme] = useState<string>('light');
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [entityName, setEntityName] = useState('');
  const [entitySlug, setEntitySlug] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentEntity) {
      setEntityName(currentEntity.name || '');
      setEntitySlug(currentEntity.slug || '');
      setSelectedTheme(currentEntity.theme || 'light');
      
      // Find matching preset
      const presetIndex = colorPresets.findIndex(
        p => p.primary === currentEntity.primaryColor
      );
      if (presetIndex >= 0) {
        setSelectedPreset(presetIndex);
      }
      setLoading(false);
    }
  }, [currentEntity]);

  const handleSaveBranding = async () => {
    if (!currentEntity?.id) return;

    setSaving(true);
    try {
      const preset = colorPresets[selectedPreset];
      const { error } = await supabase
        .from('entities')
        .update({
          theme: selectedTheme,
          primary_color: preset.primary,
          secondary_color: preset.secondary,
          accent_color: preset.accent
        })
        .eq('id', currentEntity.id);

      if (error) throw error;

      toast.success('Branding atualizado com sucesso');
    } catch (error) {
      console.error('Error updating branding:', error);
      toast.error('Erro ao atualizar branding');
    } finally {
      setSaving(false);
    }
  };

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
            {/* Logo Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Logo da Entidade</CardTitle>
                <CardDescription>
                  Faça upload do logo que aparecerá no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-6">
                  <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted">
                    {currentEntity?.logo ? (
                      <img 
                        src={currentEntity.logo} 
                        alt="Logo" 
                        className="h-full w-full object-contain rounded-xl"
                      />
                    ) : (
                      <Upload className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button variant="outline">Fazer Upload</Button>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG ou SVG. Máximo 2MB.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Theme Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Tema</CardTitle>
                <CardDescription>
                  Escolha o tema de cores da interface
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => setSelectedTheme(theme.id)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200',
                        selectedTheme === theme.id
                          ? 'border-primary bg-primary/5 shadow-glow'
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <span className="text-2xl">{theme.icon}</span>
                      <span className="text-sm font-medium text-foreground">{theme.label}</span>
                      {selectedTheme === theme.id && (
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Color Palette */}
            <Card>
              <CardHeader>
                <CardTitle>Paleta de Cores</CardTitle>
                <CardDescription>
                  Escolha as cores principais da sua marca
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {colorPresets.map((preset, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedPreset(index)}
                      className={cn(
                        'relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200',
                        selectedPreset === index
                          ? 'border-primary shadow-glow'
                          : 'border-border hover:border-primary/30'
                      )}
                    >
                      <div className="flex gap-1">
                        <div
                          className="h-6 w-6 rounded-full"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div
                          className="h-6 w-6 rounded-full"
                          style={{ backgroundColor: preset.accent }}
                        />
                      </div>
                      <span className="text-xs font-medium text-foreground">{preset.name}</span>
                      {selectedPreset === index && (
                        <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Custom Colors */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Cor Primária</Label>
                    <div className="flex gap-2">
                      <div
                        className="h-10 w-10 rounded-lg border border-border"
                        style={{ backgroundColor: colorPresets[selectedPreset].primary }}
                      />
                      <Input
                        value={colorPresets[selectedPreset].primary}
                        className="font-mono"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor Secundária</Label>
                    <div className="flex gap-2">
                      <div
                        className="h-10 w-10 rounded-lg border border-border"
                        style={{ backgroundColor: colorPresets[selectedPreset].secondary }}
                      />
                      <Input
                        value={colorPresets[selectedPreset].secondary}
                        className="font-mono"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cor de Destaque</Label>
                    <div className="flex gap-2">
                      <div
                        className="h-10 w-10 rounded-lg border border-border"
                        style={{ backgroundColor: colorPresets[selectedPreset].accent }}
                      />
                      <Input
                        value={colorPresets[selectedPreset].accent}
                        className="font-mono"
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleSaveBranding}
                  disabled={saving}
                  className="gradient-primary border-0 shadow-glow"
                >
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </CardContent>
            </Card>
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
            <Card>
              <CardHeader>
                <CardTitle>Gerenciar Usuários</CardTitle>
                <CardDescription>
                  Adicione e gerencie usuários da sua entidade
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={() => navigate('/users')}
                  className="gradient-primary border-0 shadow-glow"
                >
                  Ir para Gestão de Usuários
                </Button>
              </CardContent>
            </Card>
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
