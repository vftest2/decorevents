import { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  Check, 
  Loader2, 
  Plus, 
  Trash2,
  Palette,
  Image as ImageIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const themeOptions = [
  { id: 'light', label: 'Claro', icon: '☀️', description: 'Fundo claro com texto escuro' },
  { id: 'dark', label: 'Escuro', icon: '🌙', description: 'Fundo escuro com texto claro' },
  { id: 'auto', label: 'Automático', icon: '🔄', description: 'Segue as preferências do sistema' },
];

const defaultColorPresets = [
  { primary: '#E85A4F', secondary: '#F5F0EB', accent: '#E8A83C', name: 'Coral' },
  { primary: '#4A90A4', secondary: '#F0F5F7', accent: '#2ECC71', name: 'Oceano' },
  { primary: '#9B59B6', secondary: '#F5F0F8', accent: '#E74C3C', name: 'Violeta' },
  { primary: '#27AE60', secondary: '#F0F8F0', accent: '#F39C12', name: 'Natureza' },
  { primary: '#2C3E50', secondary: '#F5F6F7', accent: '#3498DB', name: 'Executivo' },
  { primary: '#E91E63', secondary: '#FFF0F5', accent: '#FF9800', name: 'Vibrante' },
  { primary: '#00BCD4', secondary: '#E0F7FA', accent: '#FFC107', name: 'Turquesa' },
  { primary: '#673AB7', secondary: '#EDE7F6', accent: '#00BFA5', name: 'Índigo' },
  { primary: '#FF5722', secondary: '#FBE9E7', accent: '#607D8B', name: 'Laranja' },
  { primary: '#795548', secondary: '#EFEBE9', accent: '#8BC34A', name: 'Terra' },
  { primary: '#009688', secondary: '#E0F2F1', accent: '#FF4081', name: 'Esmeralda' },
  { primary: '#3F51B5', secondary: '#E8EAF6', accent: '#FFEB3B', name: 'Azul Royal' },
];

// Sidebar color presets
const sidebarColorPresets = [
  { color: '#1a1a2e', name: 'Escuro Padrão' },
  { color: '#2d3436', name: 'Grafite' },
  { color: '#1e3a5f', name: 'Azul Marinho' },
  { color: '#2d4a3e', name: 'Verde Escuro' },
  { color: '#3d2c29', name: 'Marrom' },
  { color: '#4a1942', name: 'Vinho' },
  { color: '#f5f5f5', name: 'Claro' },
  { color: '#e8e8e8', name: 'Gelo' },
  { color: '#fff5eb', name: 'Creme' },
];

interface ColorPreset {
  primary: string;
  secondary: string;
  accent: string;
  name: string;
  isCustom?: boolean;
}

export function BrandingManager() {
  const { currentEntity, refreshEntity } = useEntity();
  const [selectedTheme, setSelectedTheme] = useState<string>('light');
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [customColors, setCustomColors] = useState({
    primary: '#E85A4F',
    secondary: '#F5F0EB',
    accent: '#E8A83C',
  });
  const [sidebarColor, setSidebarColor] = useState<string>('#1a1a2e');
  const [useCustomColors, setUseCustomColors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isCustomDialogOpen, setIsCustomDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [customPresets, setCustomPresets] = useState<ColorPreset[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved custom presets from localStorage
  useEffect(() => {
    const savedPresets = localStorage.getItem(`custom-presets-${currentEntity?.id}`);
    if (savedPresets) {
      setCustomPresets(JSON.parse(savedPresets));
    }
  }, [currentEntity?.id]);

  // Initialize from current entity
  useEffect(() => {
    if (currentEntity) {
      setSelectedTheme(currentEntity.theme || 'light');
      setSidebarColor(currentEntity.sidebarColor || '#1a1a2e');
      
      // Check if current colors match any preset
      const allPresets = [...defaultColorPresets, ...customPresets];
      const matchingIndex = allPresets.findIndex(
        p => p.primary === currentEntity.primaryColor
      );
      
      if (matchingIndex >= 0) {
        setSelectedPresetIndex(matchingIndex);
        setUseCustomColors(false);
      } else if (currentEntity.primaryColor) {
        // Using custom colors
        setCustomColors({
          primary: currentEntity.primaryColor || '#E85A4F',
          secondary: currentEntity.secondaryColor || '#F5F0EB',
          accent: currentEntity.accentColor || '#E8A83C',
        });
        setUseCustomColors(true);
        setSelectedPresetIndex(null);
      }
    }
  }, [currentEntity, customPresets]);

  const allPresets = [...defaultColorPresets, ...customPresets];

  const getCurrentColors = () => {
    if (useCustomColors) {
      return customColors;
    }
    if (selectedPresetIndex !== null && allPresets[selectedPresetIndex]) {
      return allPresets[selectedPresetIndex];
    }
    return customColors;
  };

  const handlePresetSelect = (index: number) => {
    setSelectedPresetIndex(index);
    setUseCustomColors(false);
    const preset = allPresets[index];
    setCustomColors({
      primary: preset.primary,
      secondary: preset.secondary,
      accent: preset.accent,
    });
  };

  const handleCustomColorChange = (colorType: 'primary' | 'secondary' | 'accent', value: string) => {
    setCustomColors(prev => ({ ...prev, [colorType]: value }));
    setUseCustomColors(true);
    setSelectedPresetIndex(null);
  };

  const handleSaveAsPreset = () => {
    if (!newPresetName.trim()) {
      toast.error('Digite um nome para a paleta');
      return;
    }

    const newPreset: ColorPreset = {
      ...customColors,
      name: newPresetName.trim(),
      isCustom: true,
    };

    const updatedPresets = [...customPresets, newPreset];
    setCustomPresets(updatedPresets);
    localStorage.setItem(`custom-presets-${currentEntity?.id}`, JSON.stringify(updatedPresets));
    
    setSelectedPresetIndex(defaultColorPresets.length + updatedPresets.length - 1);
    setUseCustomColors(false);
    setIsCustomDialogOpen(false);
    setNewPresetName('');
    toast.success('Paleta personalizada salva!');
  };

  const handleDeleteCustomPreset = (index: number) => {
    const actualIndex = index - defaultColorPresets.length;
    if (actualIndex < 0) return;

    const updatedPresets = customPresets.filter((_, i) => i !== actualIndex);
    setCustomPresets(updatedPresets);
    localStorage.setItem(`custom-presets-${currentEntity?.id}`, JSON.stringify(updatedPresets));
    
    if (selectedPresetIndex === index) {
      setSelectedPresetIndex(0);
    }
    toast.success('Paleta removida');
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentEntity?.id) return;

    // Validate file
    if (!file.type.match(/^image\/(png|jpeg|jpg|svg\+xml)$/)) {
      toast.error('Formato inválido. Use PNG, JPG ou SVG.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return;
    }

    setUploadingLogo(true);
    try {
      // Create bucket if not exists (handled by Supabase)
      const fileName = `${currentEntity.id}/logo-${Date.now()}.${file.name.split('.').pop()}`;
      
      // First, check if bucket exists, if not we'll handle the error
      const { data, error: uploadError } = await supabase.storage
        .from('entity-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        // If bucket doesn't exist, inform user
        if (uploadError.message.includes('not found')) {
          toast.error('Storage não configurado. Entre em contato com o suporte.');
          return;
        }
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('entity-logos')
        .getPublicUrl(fileName);

      // Update entity with logo URL
      const { error: updateError } = await supabase
        .from('entities')
        .update({ logo: urlData.publicUrl })
        .eq('id', currentEntity.id);

      if (updateError) throw updateError;

      toast.success('Logo atualizado com sucesso!');
      refreshEntity?.();
    } catch (error: any) {
      console.error('Error uploading logo:', error);
      toast.error('Erro ao fazer upload do logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!currentEntity?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('entities')
        .update({ logo: null })
        .eq('id', currentEntity.id);

      if (error) throw error;

      toast.success('Logo removido');
      refreshEntity?.();
    } catch (error) {
      console.error('Error removing logo:', error);
      toast.error('Erro ao remover logo');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!currentEntity?.id) return;

    setSaving(true);
    try {
      const colors = getCurrentColors();
      const { error } = await supabase
        .from('entities')
        .update({
          theme: selectedTheme,
          primary_color: colors.primary,
          secondary_color: colors.secondary,
          accent_color: colors.accent,
          sidebar_color: sidebarColor,
        })
        .eq('id', currentEntity.id);

      if (error) throw error;

      toast.success('Branding atualizado com sucesso!');
      refreshEntity?.();
    } catch (error) {
      console.error('Error updating branding:', error);
      toast.error('Erro ao atualizar branding');
    } finally {
      setSaving(false);
    }
  };

  const currentColors = getCurrentColors();

  return (
    <div className="space-y-6">
      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Logo da Entidade
          </CardTitle>
          <CardDescription>
            Faça upload do logo que aparecerá no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="flex h-24 w-24 items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted overflow-hidden">
                {currentEntity?.logo ? (
                  <img 
                    src={currentEntity.logo} 
                    alt="Logo" 
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Upload className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              {uploadingLogo && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-xl">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Fazer Upload
                </Button>
                {currentEntity?.logo && (
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                PNG, JPG ou SVG. Máximo 2MB. Recomendado: 200x200px
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                <span className="text-3xl">{theme.icon}</span>
                <span className="font-medium text-foreground">{theme.label}</span>
                <span className="text-xs text-muted-foreground text-center">{theme.description}</span>
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
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Paleta de Cores
          </CardTitle>
          <CardDescription>
            Escolha uma paleta pronta ou crie cores personalizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Presets Grid */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Paletas Prontas</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {allPresets.map((preset, index) => {
                const isCustomPreset = index >= defaultColorPresets.length;
                return (
                <div key={index} className="relative group">
                  <button
                    onClick={() => handlePresetSelect(index)}
                    className={cn(
                      'w-full relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all duration-200',
                      selectedPresetIndex === index && !useCustomColors
                        ? 'border-primary shadow-glow'
                        : 'border-border hover:border-primary/30'
                    )}
                  >
                    <div className="flex gap-1">
                      <div
                        className="h-7 w-7 rounded-full border border-border/50 shadow-sm"
                        style={{ backgroundColor: preset.primary }}
                      />
                      <div
                        className="h-7 w-7 rounded-full border border-border/50 shadow-sm"
                        style={{ backgroundColor: preset.accent }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground">{preset.name}</span>
                    {selectedPresetIndex === index && !useCustomColors && (
                      <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                  {isCustomPreset && (
                    <button
                      onClick={() => handleDeleteCustomPreset(index)}
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* Custom Colors */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium">Cores Personalizadas</Label>
              {useCustomColors && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCustomDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Salvar como Paleta
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cor Primária</Label>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="color"
                      value={currentColors.primary}
                      onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div
                      className="h-10 w-10 rounded-lg border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
                      style={{ backgroundColor: currentColors.primary }}
                    />
                  </div>
                  <Input
                    value={currentColors.primary}
                    onChange={(e) => handleCustomColorChange('primary', e.target.value)}
                    className="font-mono text-sm"
                    placeholder="#000000"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cor Secundária (Fundo)</Label>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="color"
                      value={currentColors.secondary}
                      onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div
                      className="h-10 w-10 rounded-lg border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
                      style={{ backgroundColor: currentColors.secondary }}
                    />
                  </div>
                  <Input
                    value={currentColors.secondary}
                    onChange={(e) => handleCustomColorChange('secondary', e.target.value)}
                    className="font-mono text-sm"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Cor de Destaque</Label>
                <div className="flex gap-2">
                  <div className="relative">
                    <input
                      type="color"
                      value={currentColors.accent}
                      onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <div
                      className="h-10 w-10 rounded-lg border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
                      style={{ backgroundColor: currentColors.accent }}
                    />
                  </div>
                  <Input
                    value={currentColors.accent}
                    onChange={(e) => handleCustomColorChange('accent', e.target.value)}
                    className="font-mono text-sm"
                    placeholder="#FF0000"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar Color */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-3 block">Cor do Menu Lateral</Label>
            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
              {sidebarColorPresets.map((preset, index) => (
                <button
                  key={index}
                  onClick={() => setSidebarColor(preset.color)}
                  className={cn(
                    'relative flex flex-col items-center gap-1 rounded-lg border-2 p-2 transition-all duration-200',
                    sidebarColor === preset.color
                      ? 'border-primary shadow-glow'
                      : 'border-border hover:border-primary/30'
                  )}
                  title={preset.name}
                >
                  <div
                    className="h-8 w-8 rounded-md border border-border/50 shadow-sm"
                    style={{ backgroundColor: preset.color }}
                  />
                  <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                    {preset.name}
                  </span>
                  {sidebarColor === preset.color && (
                    <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                      <Check className="h-2.5 w-2.5 text-primary-foreground" />
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Cor personalizada:</Label>
              <div className="relative">
                <input
                  type="color"
                  value={sidebarColor}
                  onChange={(e) => setSidebarColor(e.target.value)}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div
                  className="h-8 w-8 rounded-md border-2 border-border cursor-pointer hover:border-primary/50 transition-colors"
                  style={{ backgroundColor: sidebarColor }}
                />
              </div>
              <Input
                value={sidebarColor}
                onChange={(e) => setSidebarColor(e.target.value)}
                className="font-mono text-sm w-28"
                placeholder="#000000"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="pt-4 border-t">
            <Label className="text-sm font-medium mb-3 block">Pré-visualização</Label>
            <div className="rounded-xl overflow-hidden border flex">
              {/* Sidebar Preview */}
              <div 
                className="w-16 p-2 flex flex-col items-center gap-2"
                style={{ 
                  backgroundColor: sidebarColor,
                  color: parseInt(sidebarColor.replace('#', ''), 16) > 0x888888 ? '#1a1a2e' : '#f5f5f5'
                }}
              >
                <div 
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold"
                  style={{ backgroundColor: currentColors.primary, color: '#fff' }}
                >
                  {currentEntity?.name?.charAt(0) || 'E'}
                </div>
                <div className="w-8 h-1 rounded-full bg-current opacity-50" />
                <div className="w-8 h-1 rounded-full bg-current opacity-30" />
                <div className="w-8 h-1 rounded-full bg-current opacity-30" />
              </div>
              {/* Content Preview */}
              <div 
                className="flex-1 p-4"
                style={{ backgroundColor: currentColors.secondary }}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="h-10 w-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{ backgroundColor: currentColors.primary }}
                  >
                    {currentEntity?.name?.charAt(0) || 'E'}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: currentColors.primary }}>
                      {currentEntity?.name || 'Sua Empresa'}
                    </p>
                    <p className="text-xs" style={{ color: currentColors.accent }}>
                      Texto de destaque
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                    style={{ backgroundColor: currentColors.primary }}
                  >
                    Primário
                  </button>
                  <button
                    className="px-3 py-1.5 rounded-lg text-white text-xs font-medium"
                    style={{ backgroundColor: currentColors.accent }}
                  >
                    Destaque
                  </button>
                </div>
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

      {/* Save as Preset Dialog */}
      <Dialog open={isCustomDialogOpen} onOpenChange={setIsCustomDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar Paleta Personalizada</DialogTitle>
            <DialogDescription>
              Dê um nome para sua paleta de cores personalizada
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-center gap-2">
              <div
                className="h-10 w-10 rounded-full border-2 border-border"
                style={{ backgroundColor: customColors.primary }}
              />
              <div
                className="h-10 w-10 rounded-full border-2 border-border"
                style={{ backgroundColor: customColors.secondary }}
              />
              <div
                className="h-10 w-10 rounded-full border-2 border-border"
                style={{ backgroundColor: customColors.accent }}
              />
            </div>
            <div className="space-y-2">
              <Label>Nome da Paleta</Label>
              <Input
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                placeholder="Ex: Minha Marca"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCustomDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveAsPreset} className="gradient-primary border-0">
              Salvar Paleta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
