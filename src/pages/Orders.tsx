import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronDown, Loader2, Store } from 'lucide-react';
import { generateFullPrintContent, PrintOrderData } from '@/services/printContentService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import { OrderCard } from '@/components/orders/OrderCard';
import { ChecklistModal } from '@/components/orders/ChecklistModal';
import { DeleteOrderModal } from '@/components/orders/DeleteOrderModal';
import { ServiceOrder, OrderStatus } from '@/types/database';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

interface StoreOption {
  id: string;
  name: string;
}

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'waiting_part', label: 'Aguardando Peça' },
  { value: 'quote', label: 'Orçamento' },
  { value: 'in_progress', label: 'Em Execução' },
  { value: 'delayed', label: 'Em Atraso' },
  { value: 'warranty', label: 'Em Garantia' },
  { value: 'completed', label: 'Concluído' },
  { value: 'delivered', label: 'Entregue' },
];

export default function Orders() {
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [storeFilter, setStoreFilter] = useState<string>('all');
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<ServiceOrder | null>(null);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<ServiceOrder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch stores for admin filter
  useEffect(() => {
    if (isAdmin) {
      const fetchStores = async () => {
        const { data } = await supabase
          .from('stores')
          .select('id, name')
          .order('name');
        if (data) setStores(data);
      };
      fetchStores();
    }
  }, [isAdmin]);

  // Fetch orders from database
  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        // Fetch orders
        const { data: ordersData, error } = await supabase
          .from('service_orders')
          .select(`
            *,
            client:clients(id, name, phone, created_at, updated_at),
            brand:brands(id, name, created_at),
            model:models(id, brand_id, name, created_at),
            store:stores(id, name)
          `)
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Fetch profiles for created_by users
        const createdByIds = [...new Set((ordersData || []).map(o => o.created_by).filter(Boolean))];
        const { data: profilesData } = createdByIds.length > 0 
          ? await supabase.from('profiles').select('id, full_name').in('id', createdByIds)
          : { data: [] };
        
        const profilesMap = new Map((profilesData || []).map(p => [p.id, p]));

        const data = (ordersData || []).map(order => ({
          ...order,
          created_by_profile: profilesMap.get(order.created_by) || null
        }));

        if (error) throw error;

        // Map database response to ServiceOrder type
        const mappedOrders: ServiceOrder[] = (data || []).map((order: any) => ({
          id: order.id,
          order_number: order.order_number,
          client_id: order.client_id,
          brand_id: order.brand_id,
          model_id: order.model_id,
          device_color: order.device_color,
          password_type: order.password_type as any,
          password_value: order.password_value,
          status: order.status as OrderStatus,
          terms: order.terms || [],
          accessories: order.accessories,
          problem_description: order.problem_description,
          possible_service: order.possible_service,
          physical_condition: order.physical_condition,
          service_value: Number(order.service_value),
          entry_value: Number(order.entry_value),
          remaining_value: Number(order.remaining_value),
          payment_method: order.payment_method as any,
          entry_date: order.entry_date,
          estimated_delivery: order.estimated_delivery,
          observations: order.observations,
          checklist_completed: order.checklist_completed,
          checklist_type: order.checklist_type as any,
          checklist_data: order.checklist_data,
          created_by: order.created_by,
          updated_at: order.updated_at,
          created_at: order.created_at,
          client: order.client,
          brand: order.brand,
          model: order.model,
          created_by_profile: order.created_by_profile,
          store: order.store,
        }));

        setOrders(mappedOrders);
      } catch (error: any) {
        console.error('Error fetching orders:', error);
        toast.error('Erro ao carregar ordens de serviço');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.client?.name.toLowerCase().includes(search.toLowerCase()) ||
      order.order_number.includes(search) ||
      order.model?.name.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    const matchesStore = !isAdmin || storeFilter === 'all' || order.store?.id === storeFilter;

    return matchesSearch && matchesStatus && matchesStore;
  });
  
  const currentStore = stores.find(s => s.id === storeFilter);

  const handleEdit = (order: ServiceOrder) => {
    navigate(`/orders/${order.id}/edit`);
  };

  const handleDelete = (order: ServiceOrder) => {
    setOrderToDelete(order);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!orderToDelete) return;

    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('service_orders')
        .delete()
        .eq('id', orderToDelete.id);

      if (error) throw error;

      setOrders(prev => prev.filter(o => o.id !== orderToDelete.id));
      toast.success('O.S. excluída com sucesso');
      setDeleteModalOpen(false);
      setOrderToDelete(null);
    } catch (error: any) {
      toast.error('Erro ao excluir: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Create print job in database
  const createPrintJob = useCallback(async (order: ServiceOrder, checklistType?: 'android' | 'ios', checklistData?: Record<string, string>) => {
    try {
      // Get user info for created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      // Get store info
      const storeId = order.store?.id;
      if (!storeId) throw new Error('Ordem sem loja vinculada');

      // Fetch store details
      const { data: storeData } = await supabase
        .from('stores')
        .select('name, phone, address, cnpj')
        .eq('id', storeId)
        .single();

      // Fetch client details
      const { data: clientData } = await supabase
        .from('clients')
        .select('name, phone, cpf, address')
        .eq('id', order.client_id)
        .single();

      // Get attendant name
      const attendantName = order.created_by_profile?.full_name || 'Atendente';

      // Build print order data
      const printData: PrintOrderData = {
        orderNumber: order.order_number,
        clientName: clientData?.name || order.client?.name || 'Cliente',
        clientPhone: clientData?.phone || order.client?.phone || '',
        clientCpf: clientData?.cpf || undefined,
        clientAddress: clientData?.address || undefined,
        brand: order.brand?.name || '',
        model: order.model?.name || '',
        deviceColor: order.device_color,
        problemDescription: order.problem_description,
        possibleService: order.possible_service,
        accessories: order.accessories,
        physicalCondition: order.physical_condition,
        passwordType: order.password_type,
        passwordValue: order.password_value || undefined,
        serviceValue: order.service_value,
        entryValue: order.entry_value,
        remainingValue: order.remaining_value,
        estimatedDelivery: order.estimated_delivery || undefined,
        observations: order.observations || undefined,
        storeName: storeData?.name || order.store?.name || 'Loja',
        storePhone: storeData?.phone || undefined,
        storeAddress: storeData?.address || undefined,
        storeCnpj: storeData?.cnpj || undefined,
        attendantName: attendantName,
        createdAt: order.created_at,
        terms: order.terms || [],
        checklistType: checklistType || order.checklist_type as 'android' | 'ios' | null,
        checklistData: (checklistData || order.checklist_data) as Record<string, string> | null,
      };

      // Generate print content
      const content = generateFullPrintContent(printData);

      // Insert print job
      const { error: insertError } = await supabase
        .from('print_jobs')
        .insert({
          service_order_id: order.id,
          store_id: storeId,
          status: 'pending',
          printer_type: 'escpos', // Default, will be overridden by print bridge
          content: content,
          created_by: user.id,
        });

      if (insertError) throw insertError;

      toast.success(`O.S. #${order.order_number} enviada para impressão!`);
    } catch (error: any) {
      console.error('Error creating print job:', error);
      toast.error('Erro ao enviar para impressão: ' + error.message);
    }
  }, []);

  const handlePrint = async (order: ServiceOrder) => {
    if (!order.checklist_completed) {
      setSelectedOrder(order);
      setChecklistModalOpen(true);
      return;
    }
    
    await createPrintJob(order);
  };

  const handleChecklistComplete = async (type: 'android' | 'ios', data: Record<string, string>) => {
    if (selectedOrder) {
      // First update the order with checklist data
      try {
        const { error } = await supabase
          .from('service_orders')
          .update({
            checklist_completed: true,
            checklist_type: type,
            checklist_data: data,
          })
          .eq('id', selectedOrder.id);

        if (error) throw error;

        // Update local state
        setOrders(prev => prev.map(o => 
          o.id === selectedOrder.id 
            ? { ...o, checklist_completed: true, checklist_type: type, checklist_data: data as any }
            : o
        ));

        // Create print job with checklist data
        await createPrintJob(selectedOrder, type, data);
        
        setChecklistModalOpen(false);
        setSelectedOrder(null);
      } catch (error: any) {
        toast.error('Erro ao salvar checklist: ' + error.message);
      }
    }
  };

  const currentFilter = statusFilters.find((f) => f.value === statusFilter);

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Ordens de Serviço</h1>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, número..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 input-field"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {currentFilter?.label}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card border-border">
                {statusFilters.map((filter) => (
                  <DropdownMenuItem
                    key={filter.value}
                    onClick={() => setStatusFilter(filter.value)}
                    className="cursor-pointer"
                  >
                    {filter.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {/* Store Filter - Admin Only */}
          {isAdmin && stores.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 w-full justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4" />
                    {storeFilter === 'all' ? 'Todas as Lojas' : currentStore?.name || 'Selecionar Loja'}
                  </div>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="bg-card border-border w-full min-w-[200px]">
                <DropdownMenuItem
                  onClick={() => setStoreFilter('all')}
                  className="cursor-pointer"
                >
                  Todas as Lojas
                </DropdownMenuItem>
                {stores.map((store) => (
                  <DropdownMenuItem
                    key={store.id}
                    onClick={() => setStoreFilter(store.id)}
                    className="cursor-pointer"
                  >
                    {store.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {loading ? (
            <div className="glass-card p-8 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Carregando ordens...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Nenhuma ordem encontrada</p>
            </div>
          ) : (
            filteredOrders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onPrint={handlePrint}
              />
            ))
          )}
        </div>
      </div>

      {/* Checklist Modal */}
      <ChecklistModal
        open={checklistModalOpen}
        onClose={() => {
          setChecklistModalOpen(false);
          setSelectedOrder(null);
        }}
        onComplete={handleChecklistComplete}
      />

      {/* Delete Confirmation Modal */}
      <DeleteOrderModal
        open={deleteModalOpen}
        orderNumber={orderToDelete?.order_number || ''}
        onClose={() => {
          setDeleteModalOpen(false);
          setOrderToDelete(null);
        }}
        onConfirm={confirmDelete}
        isDeleting={isDeleting}
      />
    </AppLayout>
  );
}