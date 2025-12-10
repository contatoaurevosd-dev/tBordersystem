import { useState, useEffect } from 'react';
import { 
  User,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrdersAuditProps {
  storeId: string | null;
  dateRange: { start: Date; end: Date };
}

interface AuditEntry {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by_name: string;
  client_name: string;
  store_name: string;
  service_value: number;
}

const statusLabels: Record<string, string> = {
  waiting_part: 'AGUARDANDO PEÇA',
  quote: 'ORÇAMENTO',
  in_progress: 'EM ANDAMENTO',
  delayed: 'ATRASADO',
  warranty: 'GARANTIA',
  completed: 'CONCLUÍDO',
  delivered: 'ENTREGUE'
};

const statusColors: Record<string, string> = {
  waiting_part: 'bg-warning/20 text-warning',
  quote: 'bg-muted text-muted-foreground',
  in_progress: 'bg-primary/20 text-primary',
  delayed: 'bg-destructive/20 text-destructive',
  warranty: 'bg-purple-500/20 text-purple-400',
  completed: 'bg-success/20 text-success',
  delivered: 'bg-success/20 text-success'
};

export const OrdersAudit = ({ storeId, dateRange }: OrdersAuditProps) => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAuditData();
  }, [storeId, dateRange]);

  const fetchAuditData = async () => {
    setLoading(true);
    try {
      const startStr = format(dateRange.start, 'yyyy-MM-dd');
      const endStr = format(dateRange.end, 'yyyy-MM-dd');

      let query = supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          status,
          created_at,
          updated_at,
          created_by,
          service_value,
          client:clients(name),
          store:stores(name)
        `)
        .gte('created_at', startStr)
        .lte('created_at', endStr + 'T23:59:59')
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data: orders, error } = await query;

      if (error) throw error;

      // Fetch profiles for created_by
      const createdByIds = [...new Set(orders?.map(o => o.created_by) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', createdByIds);

      const profileMap = new Map(profiles?.map(p => [p.id, p.full_name]) || []);

      const auditEntries: AuditEntry[] = (orders || []).map(order => ({
        id: order.id,
        order_number: order.order_number,
        status: order.status,
        created_at: order.created_at,
        updated_at: order.updated_at,
        created_by_name: profileMap.get(order.created_by) || 'Desconhecido',
        client_name: (order.client as any)?.name || 'N/A',
        store_name: (order.store as any)?.name || 'N/A',
        service_value: order.service_value
      }));

      setEntries(auditEntries);
    } catch (error) {
      console.error('Error fetching audit data:', error);
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

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Nenhuma ordem encontrada no período</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground uppercase">Auditoria de Ordens</h3>
        <span className="text-xs text-muted-foreground">{entries.length} registros</span>
      </div>

      {entries.map((entry) => (
        <div 
          key={entry.id}
          className="rounded-xl bg-card border border-border/30 overflow-hidden"
        >
          <button
            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
            className="w-full p-4 flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-sm font-bold text-primary">#{entry.order_number}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground uppercase">{entry.client_name}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[entry.status] || 'bg-muted text-muted-foreground'}`}>
                {statusLabels[entry.status] || entry.status.toUpperCase()}
              </span>
              {expandedId === entry.id ? (
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {expandedId === entry.id && (
            <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Criado por:</span>
                <span className="text-foreground font-medium uppercase">{entry.created_by_name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Loja:</span>
                <span className="text-foreground font-medium uppercase">{entry.store_name}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Última atualização:</span>
                <span className="text-foreground">
                  {format(new Date(entry.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Valor do serviço:</span>
                <span className="text-primary font-bold">{formatCurrency(entry.service_value)}</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
