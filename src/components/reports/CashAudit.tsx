import { useState, useEffect } from 'react';
import { 
  User,
  Calendar,
  Clock,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Wallet
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CashAuditProps {
  storeId: string | null;
  dateRange: { start: Date; end: Date };
}

interface CashSession {
  id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount: number;
  closing_amount: number | null;
  status: string;
  opened_by_name: string;
  closed_by_name: string | null;
  store_name: string;
  transactions: Transaction[];
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  payment_method: string;
  created_at: string;
  created_by_name: string;
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'DINHEIRO',
  credit_card: 'CRÉDITO',
  debit_card: 'DÉBITO',
  pix: 'PIX',
  transfer: 'TRANSFERÊNCIA'
};

export const CashAudit = ({ storeId, dateRange }: CashAuditProps) => {
  const [sessions, setSessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchCashData();
  }, [storeId, dateRange]);

  const fetchCashData = async () => {
    setLoading(true);
    try {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      // Fetch sessions
      let sessionsQuery = supabase
        .from('cash_sessions')
        .select(`
          id,
          opened_at,
          closed_at,
          opening_amount,
          closing_amount,
          status,
          opened_by,
          closed_by,
          store:stores(name)
        `)
        .gte('opened_at', startStr)
        .lte('opened_at', endStr + 'T23:59:59')
        .order('opened_at', { ascending: false });

      if (storeId) {
        sessionsQuery = sessionsQuery.eq('store_id', storeId);
      }

      const { data: sessionsData, error: sessionsError } = await sessionsQuery;
      if (sessionsError) throw sessionsError;

      // Fetch transactions for sessions
      const sessionIds = sessionsData?.map(s => s.id) || [];
      
      let transactionsData: any[] = [];
      if (sessionIds.length > 0) {
        const { data } = await supabase
          .from('cash_transactions')
          .select('id, type, amount, description, payment_method, created_at, created_by, cash_session_id')
          .in('cash_session_id', sessionIds)
          .order('created_at', { ascending: false });
        transactionsData = data || [];
      }

      // Fetch profiles
      const userIds = new Set<string>();
      sessionsData?.forEach(s => {
        if (s.opened_by) userIds.add(s.opened_by);
        if (s.closed_by) userIds.add(s.closed_by);
      });
      transactionsData.forEach(t => {
        if (t.created_by) userIds.add(t.created_by);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', Array.from(userIds));

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      // Map transactions to sessions
      const transactionsBySession = new Map<string, Transaction[]>();
      transactionsData.forEach(t => {
        const sessionId = t.cash_session_id;
        if (!transactionsBySession.has(sessionId)) {
          transactionsBySession.set(sessionId, []);
        }
        transactionsBySession.get(sessionId)!.push({
          id: t.id,
          type: t.type,
          amount: t.amount,
          description: t.description,
          payment_method: t.payment_method,
          created_at: t.created_at,
          created_by_name: profileMap.get(t.created_by) || 'Desconhecido'
        });
      });

      const mappedSessions: CashSession[] = (sessionsData || []).map(session => ({
        id: session.id,
        opened_at: session.opened_at,
        closed_at: session.closed_at,
        opening_amount: session.opening_amount,
        closing_amount: session.closing_amount,
        status: session.status,
        opened_by_name: profileMap.get(session.opened_by) || 'Desconhecido',
        closed_by_name: session.closed_by ? profileMap.get(session.closed_by) || 'Desconhecido' : null,
        store_name: (session.store as any)?.name || 'N/A',
        transactions: transactionsBySession.get(session.id) || []
      }));

      setSessions(mappedSessions);
    } catch (error) {
      console.error('Error fetching cash data:', error);
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

  if (sessions.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Nenhuma sessão de caixa encontrada no período</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase">Auditoria de Caixa</h3>
        <span className="text-xs text-muted-foreground">{sessions.length} sessões</span>
      </div>

      {sessions.map((session) => {
        const totalIncome = session.transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = session.transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        return (
          <div 
            key={session.id}
            className="rounded-xl bg-card border border-border/30 overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === session.id ? null : session.id)}
              className="w-full p-4 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${session.status === 'open' ? 'bg-success/20' : 'bg-muted'}`}>
                  <Wallet className={`w-5 h-5 ${session.status === 'open' ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground uppercase">{session.store_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(session.opened_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.status === 'open' ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {session.status === 'open' ? 'ABERTO' : 'FECHADO'}
                </span>
                {expandedId === session.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
            </button>

            {expandedId === session.id && (
              <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-3 animate-fade-in">
                {/* Session Info */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Aberto por:</span>
                  </div>
                  <span className="text-foreground font-medium uppercase">{session.opened_by_name}</span>

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Valor abertura:</span>
                  </div>
                  <span className="text-foreground font-medium">{formatCurrency(session.opening_amount)}</span>

                  {session.closed_at && (
                    <>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fechado por:</span>
                      </div>
                      <span className="text-foreground font-medium uppercase">{session.closed_by_name}</span>

                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Fechamento:</span>
                      </div>
                      <span className="text-foreground">
                        {format(new Date(session.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>

                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Valor fechamento:</span>
                      </div>
                      <span className="text-foreground font-medium">{formatCurrency(session.closing_amount || 0)}</span>
                    </>
                  )}
                </div>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-secondary/50">
                  <div className="flex items-center gap-2">
                    <ArrowUpCircle className="w-4 h-4 text-success" />
                    <span className="text-xs text-muted-foreground">Entradas:</span>
                    <span className="text-sm font-bold text-success">{formatCurrency(totalIncome)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ArrowDownCircle className="w-4 h-4 text-destructive" />
                    <span className="text-xs text-muted-foreground">Saídas:</span>
                    <span className="text-sm font-bold text-destructive">{formatCurrency(totalExpense)}</span>
                  </div>
                </div>

                {/* Transactions */}
                {session.transactions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">Movimentações ({session.transactions.length})</p>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {session.transactions.map((transaction) => (
                        <div 
                          key={transaction.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-secondary/30 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {transaction.type === 'income' ? (
                              <ArrowUpCircle className="w-4 h-4 text-success" />
                            ) : (
                              <ArrowDownCircle className="w-4 h-4 text-destructive" />
                            )}
                            <div>
                              <p className="text-foreground text-xs uppercase">{transaction.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {transaction.created_by_name} • {paymentMethodLabels[transaction.payment_method] || transaction.payment_method}
                              </p>
                            </div>
                          </div>
                          <span className={`font-bold ${transaction.type === 'income' ? 'text-success' : 'text-destructive'}`}>
                            {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
