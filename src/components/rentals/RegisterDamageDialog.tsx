import { useState, useRef } from 'react';
import { Loader2, Upload, X, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useEntity } from '@/contexts/EntityContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RegisterDamageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rentalItem: {
    id: string;
    inventory_item_id: string;
    quantity: number;
    inventory_item: {
      name: string;
    };
  };
  rental: {
    id: string;
    title: string;
  };
  onSuccess: () => void;
}

const severityOptions = [
  { value: 'minor', label: 'Leve', description: 'Pequenos arranhões ou desgaste' },
  { value: 'moderate', label: 'Moderado', description: 'Danos visíveis que afetam uso' },
  { value: 'severe', label: 'Grave', description: 'Danos significativos' },
  { value: 'total_loss', label: 'Perda Total', description: 'Item inutilizado' },
];

export function RegisterDamageDialog({ 
  open, 
  onOpenChange, 
  rentalItem, 
  rental,
  onSuccess 
}: RegisterDamageDialogProps) {
  const { currentEntity } = useEntity();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    description: '',
    severity: 'minor',
    quantity: 1,
    repair_cost: 0,
    notes: '',
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentEntity!.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('damage-photos')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('damage-photos')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setPhotos([...photos, ...uploadedUrls]);
      toast.success('Foto(s) enviada(s)');
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }

    setSaving(true);
    try {
      // Register damage
      const { error: damageError } = await supabase.from('item_damages').insert({
        entity_id: currentEntity!.id,
        rental_item_id: rentalItem.id,
        inventory_item_id: rentalItem.inventory_item_id,
        rental_id: rental.id,
        description: formData.description.trim(),
        severity: formData.severity,
        quantity: formData.quantity,
        repair_cost: formData.repair_cost || null,
        photos: photos.length > 0 ? photos : null,
        notes: formData.notes.trim() || null,
        status: 'pending',
      });

      if (damageError) throw damageError;

      // Update rental item
      const returnedQty = rentalItem.quantity - formData.quantity;
      const { error: updateError } = await supabase
        .from('rental_items')
        .update({
          checked_in: true,
          returned_quantity: returnedQty,
          damaged_quantity: formData.quantity,
        })
        .eq('id', rentalItem.id);

      if (updateError) throw updateError;

      // Add to item history
      await supabase.from('item_history').insert({
        entity_id: currentEntity!.id,
        inventory_item_id: rentalItem.inventory_item_id,
        rental_id: rental.id,
        action_type: 'damaged',
        quantity: formData.quantity,
        notes: `Avaria registrada: ${formData.description}`,
      });

      toast.success('Avaria registrada com sucesso');
      onSuccess();
    } catch (error) {
      console.error('Error registering damage:', error);
      toast.error('Erro ao registrar avaria');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Avaria</DialogTitle>
          <DialogDescription>
            Registre o dano no item: {rentalItem.inventory_item.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Descrição do Dano *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descreva o dano observado..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Gravidade</Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData({ ...formData, severity: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {severityOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantidade Afetada</Label>
              <Input
                type="number"
                min="1"
                max={rentalItem.quantity}
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Custo Estimado de Reparo (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formData.repair_cost}
              onChange={(e) => setFormData({ ...formData, repair_cost: parseFloat(e.target.value) || 0 })}
            />
          </div>

          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Fotos do Dano</Label>
            <div className="flex flex-wrap gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img 
                    src={photo} 
                    alt={`Dano ${index + 1}`}
                    className="h-20 w-20 object-cover rounded-lg border"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="h-20 w-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                ) : (
                  <Camera className="h-5 w-5 text-muted-foreground" />
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>

          <div className="space-y-2">
            <Label>Observações Adicionais</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Registrar Avaria
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
