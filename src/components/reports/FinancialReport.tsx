import { useState, useEffect } from 'react';
import { 
  CreditCard,
  Banknote,
  Smartphone,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  Store
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FinancialReportProps {
  storeId: string | null;
  dateRange: { start: Date; end: Date };
}

interface PaymentBreakdown {
  cash: number;
  credit_card: number;
  debit_card: number;
  pix: number;
  transfer: number;
}

interface StoreFinancials {
  store_id: string;
  store_name: string;
  income: number;
  expense: number;
  balance: number;
}

interface FinancialData {
  totalIncome: number;
  totalExpense: number;
  incomeByMethod: PaymentBreakdown;
  expenseByMethod: PaymentBreakdown;
  byStore: StoreFinancials[];
  topTransactions: {
    id: string;
    description: string;
    amount: number;
    type: string;
    payment_method: string;
    created_at: string;
    store_name: string;
  }[];
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'DINHEIRO',
  credit_card: 'CRÉDITO',
  debit_card: 'DÉBITO',
  pix: 'PIX',
  transfer: 'TRANSFERÊNCIA'
};

const paymentMethodIcons: Record<string, React.ReactNode> = {
  cash: <Banknote className="w-4 h-4" />,
  credit_card: <CreditCard className="w-4 h-4" />,
  debit_card: <CreditCard className="w-4 h-4" />,
  pix: <Smartphone className="w-4 h-4" />,
  transfer: <ArrowRightLeft className="w-4 h-4" />
};

export const FinancialReport = ({ storeId, dateRange }: FinancialReportProps) => {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinancialData();
  }, [storeId, dateRange]);

  const fetchFinancialData = async () => {
    setLoading(true);
    try {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      // Fetch transactions with store info
      let query = supabase
        .from('cash_transactions')
        .select(`
          id,
          type,
          amount,
          description,
          payment_method,
          created_at,
          store_id,
          store:stores(name)
        `)
        .gte('created_at', startStr)
        .lte('created_at', endStr + 'T23:59:59')
        .order('amount', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data: transactions, error } = await query;

      if (error) throw error;

      // Calculate totals
      const incomeTransactions = transactions?.filter(t => t.type === 'income') || [];
      const expenseTransactions = transactions?.filter(t => t.type === 'expense') || [];

      const totalIncome = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
      const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);

      // Breakdown by payment method
      const incomeByMethod: PaymentBreakdown = {
        cash: 0,
        credit_card: 0,
        debit_card: 0,
        pix: 0,
        transfer: 0
      };

      const expenseByMethod: PaymentBreakdown = {
        cash: 0,
        credit_card: 0,
        debit_card: 0,
        pix: 0,
        transfer: 0
      };

      incomeTransactions.forEach(t => {
        const method = t.payment_method as keyof PaymentBreakdown;
        if (method in incomeByMethod) {
          incomeByMethod[method] += t.amount;
        }
      });

      expenseTransactions.forEach(t => {
        const method = t.payment_method as keyof PaymentBreakdown;
        if (method in expenseByMethod) {
          expenseByMethod[method] += t.amount;
        }
      });

      // Group by store
      const storeMap = new Map<string, StoreFinancials>();
      transactions?.forEach(t => {
        const sId = t.store_id || 'unknown';
        const sName = (t.store as any)?.name || 'N/A';
        
        if (!storeMap.has(sId)) {
          storeMap.set(sId, {
            store_id: sId,
            store_name: sName,
            income: 0,
            expense: 0,
            balance: 0
          });
        }

        const store = storeMap.get(sId)!;
        if (t.type === 'income') {
          store.income += t.amount;
        } else {
          store.expense += t.amount;
        }
        store.balance = store.income - store.expense;
      });

      const byStore = Array.from(storeMap.values()).sort((a, b) => b.balance - a.balance);

      // Top transactions
      const topTransactions = (transactions || [])
        .slice(0, 10)
        .map(t => ({
          id: t.id,
          description: t.description,
          amount: t.amount,
          type: t.type,
          payment_method: t.payment_method,
          created_at: t.created_at,
          store_name: (t.store as any)?.name || 'N/A'
        }));

      setData({
        totalIncome,
        totalExpense,
        incomeByMethod,
        expenseByMethod,
        byStore,
        topTransactions
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Erro ao carregar dados financeiros</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground uppercase">Relatório Financeiro</h3>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-success/10 border border-success/30 text-center">
          <TrendingUp className="w-5 h-5 text-success mx-auto mb-1" />
          <p className="text-lg font-bold text-success">{formatCurrency(data.totalIncome)}</p>
          <p className="text-xs text-muted-foreground">RECEITAS</p>
        </div>

        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-center">
          <TrendingDown className="w-5 h-5 text-destructive mx-auto mb-1" />
          <p className="text-lg font-bold text-destructive">{formatCurrency(data.totalExpense)}</p>
          <p className="text-xs text-muted-foreground">DESPESAS</p>
        </div>

        <div className={`p-3 rounded-xl border text-center ${data.totalIncome - data.totalExpense >= 0 ? 'bg-primary/10 border-primary/30' : 'bg-destructive/10 border-destructive/30'}`}>
          <DollarSign className={`w-5 h-5 mx-auto mb-1 ${data.totalIncome - data.totalExpense >= 0 ? 'text-primary' : 'text-destructive'}`} />
          <p className={`text-lg font-bold ${data.totalIncome - data.totalExpense >= 0 ? 'text-primary' : 'text-destructive'}`}>
            {formatCurrency(data.totalIncome - data.totalExpense)}
          </p>
          <p className="text-xs text-muted-foreground">SALDO</p>
        </div>
      </div>

      {/* Income by Payment Method */}
      <div className="p-4 rounded-xl bg-card border border-border/30">
        <p className="text-xs text-muted-foreground uppercase font-semibold mb-3">Receitas por Forma de Pagamento</p>
        <div className="space-y-2">
          {Object.entries(data.incomeByMethod).map(([method, amount]) => (
            amount > 0 && (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-success/20 flex items-center justify-center text-success">
                    {paymentMethodIcons[method]}
                  </div>
                  <span className="text-sm text-foreground uppercase">
                    {paymentMethodLabels[method] || method}
                  </span>
                </div>
                <span className="text-sm font-bold text-success">{formatCurrency(amount)}</span>
              </div>
            )
          ))}
          {Object.values(data.incomeByMethod).every(v => v === 0) && (
            <p className="text-xs text-muted-foreground text-center">Nenhuma receita registrada</p>
          )}
        </div>
      </div>

      {/* Expense by Payment Method */}
      <div className="p-4 rounded-xl bg-card border border-border/30">
        <p className="text-xs text-muted-foreground uppercase font-semibold mb-3">Despesas por Forma de Pagamento</p>
        <div className="space-y-2">
          {Object.entries(data.expenseByMethod).map(([method, amount]) => (
            amount > 0 && (
              <div key={method} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-destructive/20 flex items-center justify-center text-destructive">
                    {paymentMethodIcons[method]}
                  </div>
                  <span className="text-sm text-foreground uppercase">
                    {paymentMethodLabels[method] || method}
                  </span>
                </div>
                <span className="text-sm font-bold text-destructive">{formatCurrency(amount)}</span>
              </div>
            )
          ))}
          {Object.values(data.expenseByMethod).every(v => v === 0) && (
            <p className="text-xs text-muted-foreground text-center">Nenhuma despesa registrada</p>
          )}
        </div>
      </div>

      {/* By Store (only if showing all stores) */}
      {!storeId && data.byStore.length > 1 && (
        <div className="p-4 rounded-xl bg-card border border-border/30">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-3">Resultado por Loja</p>
          <div className="space-y-2">
            {data.byStore.map((store) => (
              <div key={store.store_id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-foreground uppercase">{store.store_name}</span>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold ${store.balance >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(store.balance)}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    +{formatCurrency(store.income)} / -{formatCurrency(store.expense)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Transactions */}
      {data.topTransactions.length > 0 && (
        <div className="p-4 rounded-xl bg-card border border-border/30">
          <p className="text-xs text-muted-foreground uppercase font-semibold mb-3">Maiores Movimentações</p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {data.topTransactions.map((transaction) => (
              <div 
                key={transaction.id}
                className="flex items-center justify-between p-2 rounded-lg bg-secondary/30"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {transaction.type === 'income' ? (
                    <TrendingUp className="w-4 h-4 text-success flex-shrink-0" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-xs text-foreground uppercase truncate">{transaction.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.store_name} • {format(new Date(transaction.created_at), 'dd/MM', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                <span className={`text-sm font-bold flex-shrink-0 ml-2 ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                  {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
