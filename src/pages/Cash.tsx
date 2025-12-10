import { useState, useEffect } from 'react';
import { Plus, Minus, Calendar, TrendingUp, TrendingDown, Filter, Loader2, DollarSign, CreditCard, Smartphone, Wallet, ArrowDownCircle, Lock, Unlock, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  payment_method: string;
  created_at: string;
  service_order_id?: string | null;
}

interface CashSession {
  id: string;
  opening_amount: number;
  opening_observations: string | null;
  opened_at: string;
  closed_at: string | null;
  status: 'open' | 'closed';
}

interface StoreInfo {
  id: string;
  name: string;
}

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'transfer', label: 'Transferência' },
];

const paymentMethodLabels: Record<string, string> = {
  cash: 'Dinheiro',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'PIX',
  transfer: 'Transferência',
};

export default function Cash() {
  const { userStoreId, userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  
  const [modalOpen, setModalOpen] = useState(false);
  const [openCashModalOpen, setOpenCashModalOpen] = useState(false);
  const [closeCashModalOpen, setCloseCashModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Admin store selection
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  
  // Open cash states
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingObservations, setOpeningObservations] = useState('');
  
  // Close cash states
  const [closingObservations, setClosingObservations] = useState('');

  // Effective store ID (admin selected or user's store)
  const effectiveStoreId = isAdmin ? selectedStoreId : userStoreId;

  // Fetch stores for admin
  useEffect(() => {
    const fetchStores = async () => {
      if (!isAdmin) return;
      
      const { data, error } = await supabase
        .from('stores')
        .select('id, name')
        .order('name');
      
      if (data && !error) {
        setStores(data);
        if (data.length > 0 && !selectedStoreId) {
          setSelectedStoreId(data[0].id);
        }
      }
    };
    
    fetchStores();
  }, [isAdmin]);

  // Fetch current session and transactions
  useEffect(() => {
    const fetchData = async () => {
      if (!effectiveStoreId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Fetch today's open session for the effective store
        const { data: sessionData, error: sessionError } = await supabase
          .from('cash_sessions')
          .select('*')
          .eq('store_id', effectiveStoreId)
          .eq('status', 'open')
          .gte('opened_at', today.toISOString())
          .maybeSingle();

        if (sessionError) throw sessionError;
        
        if (sessionData) {
          setCurrentSession({
            id: sessionData.id,
            opening_amount: Number(sessionData.opening_amount),
            opening_observations: sessionData.opening_observations,
            opened_at: sessionData.opened_at,
            closed_at: sessionData.closed_at,
            status: sessionData.status as 'open' | 'closed',
          });
        } else {
          setCurrentSession(null);
        }

        // Fetch transactions only if there's an open session
        if (sessionData) {
          const { data: transData, error: transError } = await supabase
            .from('cash_transactions')
            .select('*')
            .eq('cash_session_id', sessionData.id)
            .order('created_at', { ascending: false });

          if (transError) throw transError;

          setTransactions((transData || []).map((t: any) => ({
            id: t.id,
            type: t.type as 'income' | 'expense',
            amount: Number(t.amount),
            description: t.description,
            payment_method: t.payment_method,
            created_at: t.created_at,
            service_order_id: t.service_order_id,
          })));
        } else {
          setTransactions([]);
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados do caixa');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [effectiveStoreId]);

  // Calculate totals by payment method
  const incomeTransactions = transactions.filter((t) => t.type === 'income');
  const expenseTransactions = transactions.filter((t) => t.type === 'expense');

  const totalCash = incomeTransactions
    .filter((t) => t.payment_method === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalCards = incomeTransactions
    .filter((t) => t.payment_method === 'credit_card' || t.payment_method === 'debit_card')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalPix = incomeTransactions
    .filter((t) => t.payment_method === 'pix')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

  // Cash expenses reduce the available change
  const cashExpenses = expenseTransactions
    .filter((t) => t.payment_method === 'cash')
    .reduce((sum, t) => sum + t.amount, 0);

  const openingAmount_num = currentSession?.opening_amount || 0;
  const dailyChange = openingAmount_num - cashExpenses; // Troco do dia = valor de abertura - saídas em dinheiro
  const totalBalance = totalIncome; // Saldo total = total de entradas
  const finalBalance = openingAmount_num + totalIncome - totalExpense; // Saldo final

  const handleOpenCash = async () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      toast.error('Informe um valor de abertura válido');
      return;
    }

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        setSaving(false);
        return;
      }

      // Get store_id - use userStoreId or fetch first store for admins
      let storeId = userStoreId;
      if (!storeId) {
        const { data: storeData } = await supabase
          .from('stores')
          .select('id')
          .limit(1)
          .maybeSingle();
        storeId = storeData?.id || null;
      }

      const { data, error } = await supabase
        .from('cash_sessions')
        .insert({
          store_id: storeId,
          opened_by: userData.user.id,
          opening_amount: parseFloat(openingAmount),
          opening_observations: openingObservations.toUpperCase() || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Link pending transactions (without session) to this new session
      if (storeId) {
        const { data: pendingTransactions, error: pendingError } = await supabase
          .from('cash_transactions')
          .select('id')
          .eq('store_id', storeId)
          .is('cash_session_id', null);

        if (!pendingError && pendingTransactions && pendingTransactions.length > 0) {
          const pendingIds = pendingTransactions.map(t => t.id);
          await supabase
            .from('cash_transactions')
            .update({ cash_session_id: data.id })
            .in('id', pendingIds);
          
          toast.info(`${pendingTransactions.length} transação(ões) pendente(s) vinculada(s) ao caixa!`);
        }
      }

      setCurrentSession({
        id: data.id,
        opening_amount: Number(data.opening_amount),
        opening_observations: data.opening_observations,
        opened_at: data.opened_at,
        closed_at: data.closed_at,
        status: data.status as 'open' | 'closed',
      });

      // Reload transactions
      const { data: transData } = await supabase
        .from('cash_transactions')
        .select('*')
        .eq('cash_session_id', data.id)
        .order('created_at', { ascending: false });

      if (transData) {
        setTransactions(transData.map((t: any) => ({
          id: t.id,
          type: t.type as 'income' | 'expense',
          amount: Number(t.amount),
          description: t.description,
          payment_method: t.payment_method,
          created_at: t.created_at,
          service_order_id: t.service_order_id,
        })));
      }

      toast.success('Caixa aberto com sucesso!');
      setOpenCashModalOpen(false);
      setOpeningAmount('');
      setOpeningObservations('');
    } catch (error: any) {
      console.error('Error opening cash:', error);
      toast.error('Erro ao abrir caixa: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseCash = async () => {
    if (!currentSession) return;

    setSaving(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('cash_sessions')
        .update({
          closed_by: userData.user.id,
          closing_amount: finalBalance,
          closing_observations: closingObservations.toUpperCase() || null,
          closed_at: new Date().toISOString(),
          status: 'closed',
        })
        .eq('id', currentSession.id);

      if (error) throw error;

      toast.success('Caixa fechado com sucesso!');
      setCurrentSession(null);
      setTransactions([]);
      setCloseCashModalOpen(false);
      setClosingObservations('');
    } catch (error: any) {
      console.error('Error closing cash:', error);
      toast.error('Erro ao fechar caixa: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTransaction = async () => {
    if (!currentSession) {
      toast.error('Abra o caixa primeiro para registrar movimentações');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Informe um valor válido');
      return;
    }

    if (!description.trim()) {
      toast.error('Informe uma descrição');
      return;
    }

    setSaving(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        setSaving(false);
        return;
      }

      const { data, error } = await supabase
        .from('cash_transactions')
        .insert({
          type: transactionType,
          amount: parseFloat(amount),
          description: description.toUpperCase(),
          payment_method: paymentMethod,
          created_by: userData.user.id,
          store_id: userStoreId,
          cash_session_id: currentSession.id,
        })
        .select()
        .single();

      if (error) throw error;

      setTransactions(prev => [{
        id: data.id,
        type: data.type as 'income' | 'expense',
        amount: Number(data.amount),
        description: data.description,
        payment_method: data.payment_method,
        created_at: data.created_at,
        service_order_id: data.service_order_id,
      }, ...prev]);

      toast.success(
        transactionType === 'income' ? 'Entrada registrada!' : 'Saída registrada!'
      );
      setModalOpen(false);
      setAmount('');
      setDescription('');
    } catch (error: any) {
      console.error('Error adding transaction:', error);
      toast.error('Erro ao registrar: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return (
    <AppLayout>
      <div className="p-4 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Caixa</h1>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
          </div>
          <Button variant="ghost" size="icon">
            <Filter className="w-5 h-5" />
          </Button>
        </div>

        {/* Admin Store Selector */}
        {isAdmin && stores.length > 0 && (
          <div className="glass-card p-4">
            <Label className="text-sm text-muted-foreground mb-2 block">VISUALIZAR CAIXA DA LOJA</Label>
            <Select value={selectedStoreId || ''} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="input-field">
                <Store className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Selecione uma loja" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Open/Close Cash Button - Only for non-admin users */}
        {loading ? (
          <div className="glass-card p-6 text-center">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
            <p className="text-muted-foreground mt-2">Carregando...</p>
          </div>
        ) : !isAdmin && !currentSession ? (
          <Button 
            onClick={() => setOpenCashModalOpen(true)} 
            className="w-full h-14 text-lg"
            variant="glow"
          >
            <Unlock className="w-5 h-5 mr-2" />
            ABRIR CAIXA DO DIA
          </Button>
        ) : !isAdmin && currentSession ? (
          <Button 
            onClick={() => setCloseCashModalOpen(true)} 
            className="w-full h-14 text-lg bg-destructive hover:bg-destructive/90"
          >
            <Lock className="w-5 h-5 mr-2" />
            FECHAR CAIXA DO DIA
          </Button>
        ) : isAdmin && !currentSession ? (
          <div className="glass-card p-4 text-center">
            <p className="text-muted-foreground">Caixa não foi aberto hoje nesta loja</p>
          </div>
        ) : null}

        {/* Show content only if cash is open */}
        {currentSession && (
          <>
            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              {/* Troco do dia */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground">TROCO DO DIA</span>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(dailyChange)}</p>
              </div>

              {/* Saldo Total */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  <span className="text-xs text-muted-foreground">SALDO TOTAL</span>
                </div>
                <p className="text-lg font-bold text-success">{formatCurrency(totalBalance)}</p>
              </div>

              {/* Dinheiro */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 text-green-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">DINHEIRO</span>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalCash)}</p>
              </div>

              {/* Cartões */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-blue-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">CARTÕES</span>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalCards)}</p>
              </div>

              {/* PIX */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                    <Smartphone className="w-4 h-4 text-cyan-500" />
                  </div>
                  <span className="text-xs text-muted-foreground">PIX</span>
                </div>
                <p className="text-lg font-bold text-foreground">{formatCurrency(totalPix)}</p>
              </div>

              {/* Total de Saídas */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                    <ArrowDownCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <span className="text-xs text-muted-foreground">TOTAL SAÍDAS</span>
                </div>
                <p className="text-lg font-bold text-destructive">{formatCurrency(totalExpense)}</p>
              </div>
            </div>

            {/* Final Balance Card */}
            <div className="glass-card-elevated p-5">
              <p className="text-sm text-muted-foreground mb-1">SALDO FINAL DO CAIXA</p>
              <p
                className={`text-3xl font-bold ${finalBalance >= 0 ? 'text-success' : 'text-destructive'}`}
              >
                {formatCurrency(finalBalance)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Troco + Entradas - Saídas
              </p>
            </div>

            {/* Quick Actions - Only for non-admin users */}
            {!isAdmin && (
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-success/50 text-success hover:bg-success/10"
                  onClick={() => {
                    setTransactionType('income');
                    setModalOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Entrada
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    setTransactionType('expense');
                    setModalOpen(true);
                  }}
                >
                  <Minus className="w-4 h-4 mr-2" />
                  Saída
                </Button>
              </div>
            )}

            {/* Transactions */}
            <div>
              <h2 className="section-header">Movimentações do Caixa</h2>
              <div className="space-y-2">
                {transactions.length === 0 ? (
                  <div className="glass-card p-6 text-center">
                    <p className="text-muted-foreground">Nenhuma movimentação registrada</p>
                  </div>
                ) : (
                  transactions.map((transaction) => (
                    <div key={transaction.id} className="glass-card p-3 flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          transaction.type === 'income'
                            ? 'bg-success/20 text-success'
                            : 'bg-destructive/20 text-destructive'
                        }`}
                      >
                        {transaction.type === 'income' ? (
                          <Plus className="w-5 h-5" />
                        ) : (
                          <Minus className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {paymentMethodLabels[transaction.payment_method] || transaction.payment_method} • {formatTime(transaction.created_at)}
                        </p>
                      </div>
                      <span
                        className={`font-semibold ${
                          transaction.type === 'income' ? 'text-success' : 'text-destructive'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Open Cash Modal */}
      <Dialog open={openCashModalOpen} onOpenChange={setOpenCashModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Abrir Caixa do Dia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor de Abertura (Troco)</Label>
              <Input
                type="number"
                placeholder="R$ 0,00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="input-field text-2xl font-bold h-14"
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Observações sobre a abertura do caixa..."
                value={openingObservations}
                onChange={(e) => setOpeningObservations(e.target.value.toUpperCase())}
                className="input-field uppercase min-h-[100px]"
              />
            </div>
            <Button onClick={handleOpenCash} className="w-full" variant="glow" disabled={saving}>
              {saving ? 'ABRINDO...' : 'ABRIR CAIXA'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Cash Modal */}
      <Dialog open={closeCashModalOpen} onOpenChange={setCloseCashModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Fechar Caixa do Dia</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="glass-card p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Troco Inicial:</span>
                <span className="font-medium">{formatCurrency(dailyChange)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Entradas:</span>
                <span className="font-medium text-success">{formatCurrency(totalIncome)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Saídas:</span>
                <span className="font-medium text-destructive">{formatCurrency(totalExpense)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-bold">Saldo Final:</span>
                <span className={`font-bold ${finalBalance >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {formatCurrency(finalBalance)}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações de Fechamento</Label>
              <Textarea
                placeholder="Observações sobre o fechamento do caixa..."
                value={closingObservations}
                onChange={(e) => setClosingObservations(e.target.value.toUpperCase())}
                className="input-field uppercase min-h-[100px]"
              />
            </div>
            <Button 
              onClick={handleCloseCash} 
              className="w-full bg-destructive hover:bg-destructive/90" 
              disabled={saving}
            >
              {saving ? 'FECHANDO...' : 'CONFIRMAR FECHAMENTO'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {transactionType === 'income' ? 'Nova Entrada' : 'Nova Saída'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Valor</Label>
              <Input
                type="number"
                placeholder="R$ 0,00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input-field text-2xl font-bold h-14"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                placeholder="Descrição da movimentação..."
                value={description}
                onChange={(e) => setDescription(e.target.value.toUpperCase())}
                className="input-field uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Meio de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="input-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value}>
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleAddTransaction} className="w-full" variant="glow" disabled={saving}>
              {saving ? 'SALVANDO...' : 'Confirmar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
