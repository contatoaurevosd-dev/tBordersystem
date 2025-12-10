import { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown,
  ClipboardList,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface ReportsDashboardProps {
  storeId: string | null;
  dateRange: { start: Date; end: Date };
}

interface DashboardStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalExpenses: number;
  newClients: number;
  avgOrderValue: number;
  deliveryRate: number;
}

export const ReportsDashboard = ({ storeId, dateRange }: ReportsDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0,
    totalRevenue: 0,
    totalExpenses: 0,
    newClients: 0,
    avgOrderValue: 0,
    deliveryRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [storeId, dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      // Fetch orders
      let ordersQuery = supabase
        .from('service_orders')
        .select('id, status, service_value, created_at')
        .gte('created_at', startStr)
        .lte('created_at', endStr + 'T23:59:59');

      if (storeId) {
        ordersQuery = ordersQuery.eq('store_id', storeId);
      }

      const { data: orders } = await ordersQuery;

      // Fetch transactions
      let transactionsQuery = supabase
        .from('cash_transactions')
        .select('id, type, amount, created_at')
        .gte('created_at', startStr)
        .lte('created_at', endStr + 'T23:59:59');

      if (storeId) {
        transactionsQuery = transactionsQuery.eq('store_id', storeId);
      }

      const { data: transactions } = await transactionsQuery;

      // Fetch clients
      let clientsQuery = supabase
        .from('clients')
        .select('id, created_at')
        .gte('created_at', startStr)
        .lte('created_at', endStr + 'T23:59:59');

      if (storeId) {
        clientsQuery = clientsQuery.eq('store_id', storeId);
      }

      const { data: clients } = await clientsQuery;

      // Calculate stats
      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter(o => o.status === 'delivered').length || 0;
      const pendingOrders = orders?.filter(o => !['delivered', 'completed'].includes(o.status)).length || 0;
      const totalServiceValue = orders?.reduce((sum, o) => sum + (o.service_value || 0), 0) || 0;
      
      const totalRevenue = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
      const totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
      
      const newClients = clients?.length || 0;
      const avgOrderValue = totalOrders > 0 ? totalServiceValue / totalOrders : 0;
      const deliveryRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      setStats({
        totalOrders,
        completedOrders,
        pendingOrders,
        totalRevenue,
        totalExpenses,
        newClients,
        avgOrderValue,
        deliveryRate
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  return (
    <div className="space-y-4">
      {/* Financial Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-success" />
            </div>
            <span className="text-xs text-muted-foreground uppercase">Receitas</span>
          </div>
          <p className="text-lg font-bold text-success">{formatCurrency(stats.totalRevenue)}</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <span className="text-xs text-muted-foreground uppercase">Despesas</span>
          </div>
          <p className="text-lg font-bold text-destructive">{formatCurrency(stats.totalExpenses)}</p>
        </div>
      </div>

      {/* Net Balance */}
      <div className="p-4 rounded-xl bg-card border border-primary/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground uppercase">Saldo Líquido</span>
          </div>
          <p className={`text-xl font-bold ${stats.totalRevenue - stats.totalExpenses >= 0 ? 'text-success' : 'text-destructive'}`}>
            {formatCurrency(stats.totalRevenue - stats.totalExpenses)}
          </p>
        </div>
      </div>

      {/* Orders Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-card border border-border/30 text-center">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-2">
            <ClipboardList className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stats.totalOrders}</p>
          <p className="text-xs text-muted-foreground uppercase">Total O.S.</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border/30 text-center">
          <div className="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center mx-auto mb-2">
            <CheckCircle className="w-4 h-4 text-success" />
          </div>
          <p className="text-2xl font-bold text-success">{stats.completedOrders}</p>
          <p className="text-xs text-muted-foreground uppercase">Entregues</p>
        </div>

        <div className="p-3 rounded-xl bg-card border border-border/30 text-center">
          <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <p className="text-2xl font-bold text-warning">{stats.pendingOrders}</p>
          <p className="text-xs text-muted-foreground uppercase">Pendentes</p>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <Users className="w-4 h-4 text-foreground" />
            </div>
            <span className="text-xs text-muted-foreground uppercase">Novos Clientes</span>
          </div>
          <p className="text-lg font-bold text-foreground">{stats.newClients}</p>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-foreground" />
            </div>
            <span className="text-xs text-muted-foreground uppercase">Ticket Médio</span>
          </div>
          <p className="text-lg font-bold text-foreground">{formatCurrency(stats.avgOrderValue)}</p>
        </div>
      </div>

      {/* Delivery Rate */}
      <div className="p-4 rounded-xl bg-card border border-border/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground uppercase">Taxa de Entrega</span>
          <span className="text-lg font-bold text-primary">{stats.deliveryRate.toFixed(1)}%</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary rounded-full transition-all duration-500"
            style={{ width: `${stats.deliveryRate}%` }}
          />
        </div>
      </div>
    </div>
  );
};
