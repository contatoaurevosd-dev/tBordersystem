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
import { z } from 'zod';

interface NewBrandModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (brand: { id: string; name: string }) => void;
}

// Validation schema
const brandSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Nome da marca deve ter pelo menos 2 caracteres')
    .max(50, 'Nome da marca deve ter no máximo 50 caracteres'),
});

export function NewBrandModal({ open, onClose, onSuccess }: NewBrandModalProps) {
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

    const validation = brandSchema.safeParse({ name });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      // Brands are shared across all stores, so we don't set store_id
      const { data, error } = await supabase
        .from('brands')
        .insert({ name: name.toUpperCase() })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          toast.error('Esta marca já existe');
          return;
        }
        throw error;
      }

      toast.success('Marca cadastrada com sucesso!');
      onSuccess({ id: data.id, name: data.name });
      setName('');
      onClose();
    } catch (error: any) {
      toast.error('Erro ao cadastrar marca: ' + error.message);
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
            <DialogTitle className="text-foreground uppercase">CADASTRAR NOVA MARCA</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">NOME DA MARCA *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="Ex: Samsung, Apple..."
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
