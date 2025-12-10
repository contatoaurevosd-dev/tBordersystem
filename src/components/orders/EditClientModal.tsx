import { useState, useEffect } from 'react';
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
import { Check } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  cpf?: string | null;
  address?: string | null;
}

interface EditClientModalProps {
  open: boolean;
  client: Client | null;
  onClose: () => void;
  onUpdate: (client: Client) => void;
  onSelect: (clientId: string) => void;
}

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

export function EditClientModal({ open, client, onClose, onUpdate, onSelect }: EditClientModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [originalData, setOriginalData] = useState({ name: '', phone: '', cpf: '', address: '' });

  useEffect(() => {
    if (client) {
      setName(client.name);
      setPhone(client.phone);
      setCpf(client.cpf || '');
      setAddress(client.address || '');
      setOriginalData({
        name: client.name,
        phone: client.phone,
        cpf: client.cpf || '',
        address: client.address || '',
      });
    }
  }, [client]);

  const hasChanges = 
    name !== originalData.name || 
    phone !== originalData.phone || 
    cpf !== originalData.cpf || 
    address !== originalData.address;

  const { showConfirm, handleCloseAttempt, handleConfirmClose, handleCancelClose } = 
    useCloseConfirmation(onClose);

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

  const handleSave = async () => {
    if (!client) return;
    
    if (!name.trim() || !phone.trim()) {
      toast.error('Nome e telefone são obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({
          name: name.toUpperCase(),
          phone,
          cpf: cpf || null,
          address: address.toUpperCase() || null,
        })
        .eq('id', client.id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Cliente atualizado com sucesso!');
      onUpdate({
        id: data.id,
        name: data.name,
        phone: data.phone,
        cpf: data.cpf,
        address: data.address,
      });
      setOriginalData({
        name: data.name,
        phone: data.phone,
        cpf: data.cpf || '',
        address: data.address || '',
      });
    } catch (error: any) {
      toast.error('Erro ao atualizar cliente: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = () => {
    if (client) {
      onSelect(client.id);
      onClose();
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      handleCloseAttempt();
    } else {
      onClose();
    }
  };

  if (!client) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="bg-card border-border max-w-md" onPointerDownOutside={(e) => { if (hasChanges) e.preventDefault(); }}>
          <DialogHeader>
            <DialogTitle className="text-foreground uppercase">DADOS DO CLIENTE</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleSave} 
                className="flex-1"
                disabled={loading}
              >
                {loading ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
              </Button>
            </div>
            <Button 
              type="button" 
              variant="glow" 
              onClick={handleSelect} 
              className="w-full"
            >
              <Check className="w-4 h-4 mr-2" />
              SELECIONAR CLIENTE
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CloseConfirmModal
        open={showConfirm}
        onClose={handleCancelClose}
        onConfirm={handleConfirmClose}
        title="FECHAR SEM SALVAR?"
        description="As alterações não salvas serão perdidas. Deseja realmente fechar?"
      />
    </>
  );
}
