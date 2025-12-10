import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CloseConfirmModal, useCloseConfirmation } from '@/components/common/CloseConfirmModal';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewModelModalProps {
  open: boolean;
  onClose: () => void;
  brandId: string;
  brandName: string;
  onSuccess: (model: { id: string; name: string }) => void;
}

export function NewModelModal({ open, onClose, brandId, brandName, onSuccess }: NewModelModalProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const hasData = !!name;

  const resetForm = () => {
    setName('');
  };

  const actualClose = () => {
    resetForm();
    onClose();
  };

  const { showConfirm, handleCloseAttempt, handleConfirmClose, handleCancelClose } = 
    useCloseConfirmation(actualClose);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Nome do modelo é obrigatório');
      return;
    }

    setLoading(true);
    try {
      // Models are shared across all stores, so we don't set store_id
      const { data, error } = await supabase
        .from('models')
        .insert({ 
          brand_id: brandId,
          name: name.toUpperCase(),
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Este modelo já existe para esta marca');
          return;
        }
        throw error;
      }

      toast.success('Modelo cadastrado com sucesso!');
      onSuccess({ id: data.id, name: data.name });
      setName('');
      onClose();
    } catch (error: any) {
      toast.error('Erro ao cadastrar modelo: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasData) {
      handleCloseAttempt();
    } else {
      actualClose();
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-md" onPointerDownOutside={(e) => { if (hasData) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase">CADASTRAR NOVO MODELO</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">MARCA</Label>
              <Input
                value={brandName.toUpperCase()}
                className="input-field uppercase"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">NOME DO MODELO *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="Ex: Galaxy S21, iPhone 14..."
                className="input-field uppercase"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                CANCELAR
              </Button>
              <Button type="submit" variant="glow" className="flex-1" disabled={loading}>
                {loading ? 'SALVANDO...' : 'SALVAR'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <CloseConfirmModal
        open={showConfirm}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
      />
    </>
  );
}
