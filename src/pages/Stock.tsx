import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Search, 
  Package,
  Edit2,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { StockItemModal } from '@/components/stock/StockItemModal';
import { DeleteConfirmModal } from '@/components/common/DeleteConfirmModal';

interface StockItem {
  id: string;
  name: string;
  code: string;
  quantity: number;
  min_quantity: number;
  cost_price: number;
  sell_price: number;
  created_at: string;
  updated_at: string;
}

export default function Stock() {
  const navigate = useNavigate();
  const { user, userRole, loading } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<StockItem | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('stock_items')
        .select('*')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error fetching stock items:', error);
      toast.error('Erro ao carregar itens do estoque');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedItem(null);
    setShowModal(true);
  };

  const handleEdit = (item: StockItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const handleDelete = (item: StockItem) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    try {
      const { error } = await supabase
        .from('stock_items')
        .delete()
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Peça excluída com sucesso!');
      fetchItems();
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Erro ao excluir peça');
    } finally {
      setShowDeleteModal(false);
      setSelectedItem(null);
    }
  };

  const handleSave = () => {
    setShowModal(false);
    setSelectedItem(null);
    fetchItems();
  };

  const filteredItems = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    item.code.toLowerCase().includes(search.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const isAdmin = userRole === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in pb-24">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">ESTOQUE</h1>
              <p className="text-xs text-muted-foreground">Gerenciar peças</p>
            </div>
          </div>
          <Button 
            onClick={handleAdd}
            className="rounded-xl"
          >
            <Plus className="w-4 h-4 mr-2" />
            NOVA PEÇA
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="BUSCAR POR NOME OU CÓDIGO..."
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            className="pl-10 bg-input border-border uppercase"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-card border border-border/30 text-center">
            <p className="text-2xl font-bold text-foreground">{items.length}</p>
            <p className="text-xs text-muted-foreground">TOTAL</p>
          </div>
          <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-center">
            <p className="text-2xl font-bold text-success">
              {items.filter(i => i.quantity > i.min_quantity).length}
            </p>
            <p className="text-xs text-muted-foreground">EM ESTOQUE</p>
          </div>
          <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
            <p className="text-2xl font-bold text-destructive">
              {items.filter(i => i.quantity <= i.min_quantity).length}
            </p>
            <p className="text-xs text-muted-foreground">BAIXO/ZERADO</p>
          </div>
        </div>

        {/* Items List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              {search ? 'Nenhuma peça encontrada' : 'Nenhuma peça cadastrada'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div 
                key={item.id}
                className="p-4 rounded-xl bg-card border border-border/30"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      item.quantity <= 0 
                        ? 'bg-destructive/20' 
                        : item.quantity <= item.min_quantity 
                          ? 'bg-warning/20' 
                          : 'bg-success/20'
                    }`}>
                      {item.quantity <= item.min_quantity ? (
                        <AlertTriangle className={`w-5 h-5 ${item.quantity <= 0 ? 'text-destructive' : 'text-warning'}`} />
                      ) : (
                        <Package className="w-5 h-5 text-success" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground uppercase">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Código: {item.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(item)}
                      className="h-8 w-8 rounded-lg"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item)}
                        className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-3">
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className={`text-lg font-bold ${
                      item.quantity <= 0 
                        ? 'text-destructive' 
                        : item.quantity <= item.min_quantity 
                          ? 'text-warning' 
                          : 'text-success'
                    }`}>
                      {item.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground">QTD</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(item.cost_price)}</p>
                    <p className="text-xs text-muted-foreground">CUSTO</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-secondary/50">
                    <p className="text-sm font-semibold text-primary">{formatCurrency(item.sell_price)}</p>
                    <p className="text-xs text-muted-foreground">VENDA</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <StockItemModal
        open={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedItem(null);
        }}
        onSave={handleSave}
        item={selectedItem}
      />

      <DeleteConfirmModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedItem(null);
        }}
        onConfirm={confirmDelete}
        title="Excluir Peça"
        description={`Tem certeza que deseja excluir a peça "${selectedItem?.name}"?`}
      />
    </AppLayout>
  );
}
