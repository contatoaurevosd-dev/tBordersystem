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
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';

interface NewClientModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (client: { id: string; name: string; phone: string }) => void;
}

// Validation schema
const clientSchema = z.object({
  name: z.string()
    .trim()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  phone: z.string()
    .regex(/^\(\d{2}\) \d{5}-\d{4}$/, 'Telefone deve estar no formato (00) 00000-0000'),
  cpf: z.string()
    .regex(/^$|^\d{3}\.\d{3}\.\d{3}-\d{2}$/, 'CPF deve estar no formato 000.000.000-00')
    .optional()
    .or(z.literal('')),
  address: z.string()
    .max(200, 'Endereço deve ter no máximo 200 caracteres')
    .optional()
    .or(z.literal('')),
});

// Phone mask: (00) 00000-0000
const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) {
    return `(${numbers}`;
  }
  if (numbers.length <= 7) {
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  }
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

// CPF mask: 000.000.000-00
const formatCpf = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) {
    return numbers;
  }
  if (numbers.length <= 6) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  }
  if (numbers.length <= 9) {
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  }
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

export function NewClientModal({ open, onClose, onSuccess }: NewClientModalProps) {
  const { userStoreId } = useAuth();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);

  const hasData = name || phone || cpf || address;

  const resetForm = () => {
    setName('');
    setPhone('');
    setCpf('');
    setAddress('');
  };

  const actualClose = () => {
    resetForm();
    onClose();
  };

  const { showConfirm, handleCloseAttempt, handleConfirmClose, handleCancelClose } = 
    useCloseConfirmation(actualClose);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 11) {
      setPhone(formatted);
    }
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    if (formatted.replace(/\D/g, '').length <= 11) {
      setCpf(formatted);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = clientSchema.safeParse({ name, phone, cpf, address });
    if (!validation.success) {
      toast.error(validation.error.errors[0].message);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert({
          name: name.toUpperCase(),
          phone,
          cpf: cpf || null,
          address: address.toUpperCase() || null,
          store_id: userStoreId,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Cliente cadastrado com sucesso!');
      onSuccess({ id: data.id, name: data.name, phone: data.phone });
      resetForm();
      onClose();
    } catch (error: any) {
      toast.error('Erro ao cadastrar cliente: ' + error.message);
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
            <DialogTitle className="text-foreground uppercase">CADASTRAR NOVO CLIENTE</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">NOME *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase())}
                placeholder="Nome completo"
                className="input-field uppercase"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">TELEFONE *</Label>
              <Input
                value={phone}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className="input-field"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">CPF</Label>
              <Input
                value={cpf}
                onChange={handleCpfChange}
                placeholder="000.000.000-00"
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              <Label className="uppercase text-muted-foreground">ENDEREÇO COMPLETO</Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value.toUpperCase())}
                placeholder="Rua, número, bairro, cidade"
                className="input-field uppercase"
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
