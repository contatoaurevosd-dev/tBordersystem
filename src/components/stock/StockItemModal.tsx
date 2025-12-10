import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface StockItem {
  id: string;
  name: string;
  code: string;
  quantity: number;
  min_quantity: number;
  cost_price: number;
  sell_price: number;
}

interface StockItemModalProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  item: StockItem | null;
}

export const StockItemModal = ({ open, onClose, onSave, item }: StockItemModalProps) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [minQuantity, setMinQuantity] = useState('5');
  const [costPrice, setCostPrice] = useState('0');
  const [sellPrice, setSellPrice] = useState('0');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setName(item.name);
      setCode(item.code);
      setQuantity(item.quantity.toString());
      setMinQuantity(item.min_quantity.toString());
      setCostPrice(item.cost_price.toString());
      setSellPrice(item.sell_price.toString());
    } else {
      setName('');
      setCode('');
      setQuantity('0');
      setMinQuantity('5');
      setCostPrice('0');
      setSellPrice('0');
    }
  }, [item, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !code.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim().toUpperCase(),
        code: code.trim().toUpperCase(),
        quantity: parseInt(quantity) || 0,
        min_quantity: parseInt(minQuantity) || 5,
        cost_price: parseFloat(costPrice) || 0,
        sell_price: parseFloat(sellPrice) || 0
      };

      if (item) {
        const { error } = await supabase
          .from('stock_items')
          .update(data)
          .eq('id', item.id);

        if (error) throw error;
        toast.success('Peça atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('stock_items')
          .insert(data);

        if (error) {
          if (error.code === '23505') {
            toast.error('Já existe uma peça com este código');
            return;
          }
          throw error;
        }
        toast.success('Peça cadastrada com sucesso!');
      }

      onSave();
    } catch (error) {
      console.error('Error saving stock item:', error);
      toast.error('Erro ao salvar peça');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground uppercase">
            {item ? 'EDITAR PEÇA' : 'NOVA PEÇA'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase">Nome *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              placeholder="NOME DA PEÇA"
              className="bg-input border-border uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase">Código *</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CÓDIGO DA PEÇA"
              className="bg-input border-border uppercase"
              disabled={!!item}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Quantidade</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Qtd. Mínima</Label>
              <Input
                type="number"
                value={minQuantity}
                onChange={(e) => setMinQuantity(e.target.value)}
                min="0"
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Preço de Custo</Label>
              <Input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                min="0"
                className="bg-input border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase">Preço de Venda</Label>
              <Input
                type="number"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                min="0"
                className="bg-input border-border"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              CANCELAR
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                'SALVAR'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
