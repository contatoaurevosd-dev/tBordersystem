import { Edit, Trash2, Printer, CheckCircle, XCircle, User, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ServiceOrder } from '@/types/database';
import { cn } from '@/lib/utils';

interface OrderCardProps {
  order: ServiceOrder;
  onEdit: (order: ServiceOrder) => void;
  onDelete: (order: ServiceOrder) => void;
  onPrint: (order: ServiceOrder) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  waiting_part: { label: 'Aguardando Peça', className: 'status-warning' },
  quote: { label: 'Orçamento', className: 'status-badge bg-blue-500/20 text-blue-400' },
  in_progress: { label: 'Em Execução', className: 'status-progress' },
  delayed: { label: 'Em Atraso', className: 'status-error' },
  warranty: { label: 'Em Garantia', className: 'status-badge bg-purple-500/20 text-purple-400' },
  completed: { label: 'Concluído', className: 'status-done' },
  delivered: { label: 'Entregue', className: 'status-done' },
};

// Statuses that should NOT be marked as overdue
const finalStatuses = ['completed', 'delivered'];

export const OrderCard = ({ order, onEdit, onDelete, onPrint }: OrderCardProps) => {
  const formattedEntryDate = new Date(order.entry_date).toLocaleDateString('pt-BR');
  const attendantName = order.created_by_profile?.full_name || 'Não informado';

  // Check if order is overdue
  const isOverdue = (): boolean => {
    if (finalStatuses.includes(order.status)) return false;
    if (!order.estimated_delivery) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const estimatedDate = new Date(order.estimated_delivery);
    estimatedDate.setHours(0, 0, 0, 0);
    
    return today > estimatedDate;
  };

  const overdue = isOverdue();
  
  // If overdue and not already delayed status, show as delayed
  const effectiveStatus = overdue && order.status !== 'delayed' ? 'delayed' : order.status;
  const status = statusConfig[effectiveStatus] || statusConfig.quote;

  const formattedEstimatedDate = order.estimated_delivery 
    ? new Date(order.estimated_delivery).toLocaleDateString('pt-BR')
    : null;

  return (
    <div className={cn(
      "glass-card p-4 animate-slide-up",
      overdue && "border-destructive/50 bg-destructive/5"
    )}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-mono text-xs text-primary">#{order.order_number}</span>
            <span className={cn('status-badge', status.className)}>
              {status.label}
            </span>
            {overdue && (
              <span className="flex items-center gap-1 text-xs text-destructive font-medium">
                <AlertTriangle className="w-3 h-3" />
                ATRASADA
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground truncate">
            {order.client?.name || 'Cliente'}
          </h3>
          <p className="text-sm text-muted-foreground truncate">
            {order.brand?.name} {order.model?.name}
          </p>
        </div>
        <div className="flex items-center gap-1 ml-2">
          {order.checklist_completed ? (
            <CheckCircle className="w-5 h-5 text-success" />
          ) : (
            <XCircle className="w-5 h-5 text-destructive" />
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">
            Entrada: {formattedEntryDate}
          </span>
          {formattedEstimatedDate && (
            <span className={cn(
              "text-xs",
              overdue ? "text-destructive font-medium" : "text-muted-foreground"
            )}>
              Entrega: {formattedEstimatedDate}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{attendantName}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="iconSm" onClick={() => onEdit(order)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={() => onDelete(order)}>
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
          <Button variant="ghost" size="iconSm" onClick={() => onPrint(order)}>
            <Printer className="w-4 h-4 text-primary" />
          </Button>
        </div>
      </div>
    </div>
  );
};
