import { useState, useEffect } from 'react';
import { Plus, Search, Phone, ChevronRight, User, MapPin, CreditCard, Store, Loader2, Calendar, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/layout/AppLayout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';

interface Client {
  id: string;
  name: string;
  phone: string;
  cpf?: string | null;
  address?: string | null;
  store_id?: string | null;
  created_by?: string | null;
  created_at: string;
  ordersCount?: number;
}

interface StoreInfo {
  id: string;
  name: string;
}

interface ServiceOrder {
  id: string;
  order_number: string;
  status: string;
  problem_description: string;
  service_value: number;
  entry_date: string;
  brand?: { name: string };
  model?: { name: string };
}

interface ClientDetails extends Client {
  createdByName?: string;
  orders: ServiceOrder[];
}

const statusLabels: Record<string, string> = {
  waiting_part: 'Aguardando Peça',
  quote: 'Orçamento',
  in_progress: 'Em Execução',
  delayed: 'Em Atraso',
  warranty: 'Em Garantia',
  completed: 'Concluído',
  delivered: 'Entregue',
};

export default function Clients() {
  const { userStoreId, userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [newClient, setNewClient] = useState({ name: '', phone: '', cpf: '', address: '' });
  const [saving, setSaving] = useState(false);
  
  // Admin store filter
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>('all');

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
      }
    };
    
    fetchStores();
  }, [isAdmin]);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        let query = supabase
          .from('clients')
          .select('*')
          .order('name');

        // Admin can filter by store
        if (isAdmin && selectedStoreId !== 'all') {
          query = query.eq('store_id', selectedStoreId);
        }

        const { data, error } = await query;
        
        if (error) throw error;

        // Get order counts for each client
        const clientsWithCounts = await Promise.all(
          (data || []).map(async (client) => {
            const { count } = await supabase
              .from('service_orders')
              .select('*', { count: 'exact', head: true })
              .eq('client_id', client.id);
            
            return {
              ...client,
              ordersCount: count || 0,
            };
          })
        );

        setClients(clientsWithCounts);
      } catch (error: any) {
        console.error('Error fetching clients:', error);
        toast.error('Erro ao carregar clientes');
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, [isAdmin, selectedStoreId]);

  const filteredClients = clients.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.phone.includes(search) ||
      (client.cpf && client.cpf.includes(search))
  );

  const handleAddClient = async () => {
    if (!newClient.name || !newClient.phone) {
      toast.error('Nome e telefone são obrigatórios');
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
        .from('clients')
        .insert({
          name: newClient.name.toUpperCase(),
          phone: newClient.phone,
          cpf: newClient.cpf || null,
          address: newClient.address.toUpperCase() || null,
          store_id: userStoreId,
          created_by: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setClients(prev => [...prev, { ...data, ordersCount: 0 }]);
      toast.success('Cliente cadastrado com sucesso!');
      setModalOpen(false);
      setNewClient({ name: '', phone: '', cpf: '', address: '' });
    } catch (error: any) {
      console.error('Error adding client:', error);
      toast.error('Erro ao cadastrar cliente: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleViewDetails = async (client: Client) => {
    setLoadingDetails(true);
    setDetailsModalOpen(true);
    
    try {
      // Fetch creator name from profiles table
      let createdByName = 'Não informado';
      if (client.created_by) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', client.created_by)
          .maybeSingle();
        
        if (profileData?.full_name) {
          createdByName = profileData.full_name;
        } else {
          // If no name in profile, try to get email from auth (for display purposes)
          createdByName = 'Atendente (nome não cadastrado)';
        }
      }

      // Fetch service orders for this client
      const { data: ordersData, error: ordersError } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          status,
          problem_description,
          service_value,
          entry_date,
          brand:brands(name),
          model:models(name)
        `)
        .eq('client_id', client.id)
        .order('entry_date', { ascending: false });

      if (ordersError) throw ordersError;

      setSelectedClient({
        ...client,
        createdByName,
        orders: (ordersData || []).map((o: any) => ({
          ...o,
          brand: o.brand,
          model: o.model,
        })),
      });
    } catch (error: any) {
      console.error('Error fetching client details:', error);
      toast.error('Erro ao carregar detalhes');
    } finally {
      setLoadingDetails(false);
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setNewClient({ ...newClient, phone: formatted });
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  };

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setNewClient({ ...newClient, cpf: formatted });
  };

  return (
    <AppLayout>
      <div className="p-4 space-y-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          {!isAdmin && (
            <Button variant="glow" size="sm" onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          )}
        </div>

        {/* Admin Store Filter */}
        {isAdmin && stores.length > 0 && (
          <div className="glass-card p-4">
            <Label className="text-sm text-muted-foreground mb-2 block">FILTRAR POR LOJA</Label>
            <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
              <SelectTrigger className="input-field">
                <Store className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Todas as lojas" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="all">Todas as Lojas</SelectItem>
                {stores.map((store) => (
                  <SelectItem key={store.id} value={store.id}>
                    {store.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou CPF..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 input-field"
          />
        </div>

        {/* Clients List */}
        <div className="space-y-2">
          {loading ? (
            <div className="glass-card p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Carregando...</p>
            </div>
          ) : filteredClients.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-muted-foreground">Nenhum cliente encontrado</p>
            </div>
          ) : (
            filteredClients.map((client) => (
              <div
                key={client.id}
                className="glass-card p-4 flex items-center gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => handleViewDetails(client)}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  {client.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
                  <p className="text-sm text-muted-foreground">{client.phone}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-medium text-foreground">
                    {client.ordersCount || 0}
                  </span>
                  <p className="text-xs text-muted-foreground">ordens</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Client Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder="Nome completo"
                value={newClient.name}
                onChange={(e) => setNewClient({ ...newClient, name: e.target.value.toUpperCase() })}
                className="input-field uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={newClient.phone}
                onChange={handlePhoneChange}
                className="input-field"
                maxLength={15}
              />
            </div>
            <div className="space-y-2">
              <Label>CPF</Label>
              <Input
                placeholder="000.000.000-00"
                value={newClient.cpf}
                onChange={handleCPFChange}
                className="input-field"
                maxLength={14}
              />
            </div>
            <div className="space-y-2">
              <Label>Endereço</Label>
              <Input
                placeholder="Endereço completo"
                value={newClient.address}
                onChange={(e) => setNewClient({ ...newClient, address: e.target.value.toUpperCase() })}
                className="input-field uppercase"
              />
            </div>
            <Button onClick={handleAddClient} className="w-full" variant="glow" disabled={saving}>
              {saving ? 'Cadastrando...' : 'Cadastrar Cliente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Client Details Modal */}
      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {loadingDetails ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-muted-foreground mt-2">Carregando...</p>
            </div>
          ) : selectedClient ? (
            <div className="space-y-6 py-4">
              {/* Client Info */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Dados Cadastrais
                </h3>
                <div className="glass-card p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Nome:</span>
                    <span className="font-medium text-foreground">{selectedClient.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Telefone:</span>
                    <span className="font-medium text-foreground">{selectedClient.phone}</span>
                  </div>
                  {selectedClient.cpf && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CPF:</span>
                      <span className="font-medium text-foreground">{selectedClient.cpf}</span>
                    </div>
                  )}
                  {selectedClient.address && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Endereço:</span>
                      <span className="font-medium text-foreground text-right max-w-[200px]">{selectedClient.address}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cadastrado por:</span>
                      <span className="font-medium text-foreground">{selectedClient.createdByName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data do cadastro:</span>
                      <span className="font-medium text-foreground">
                        {format(new Date(selectedClient.created_at), 'dd/MM/yyyy')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Orders History */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Wrench className="w-5 h-5" />
                  Histórico de Serviços ({selectedClient.orders.length})
                </h3>
                {selectedClient.orders.length === 0 ? (
                  <div className="glass-card p-4 text-center">
                    <p className="text-muted-foreground">Nenhum serviço registrado</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {selectedClient.orders.map((order) => (
                      <div key={order.id} className="glass-card p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-primary">O.S. #{order.order_number}</span>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/20 text-primary">
                            {statusLabels[order.status] || order.status}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {order.brand?.name} {order.model?.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {order.problem_description || 'Sem descrição'}
                        </p>
                        <div className="flex items-center justify-between mt-2 text-xs">
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(order.entry_date), 'dd/MM/yyyy')}
                          </span>
                          <span className="font-medium text-success">
                            {formatCurrency(order.service_value)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
