import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Clock, Store } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChecklistModal } from '@/components/orders/ChecklistModal';
import { ChecklistRequiredModal } from '@/components/orders/ChecklistRequiredModal';
import { NewClientModal } from '@/components/orders/NewClientModal';
import { EditClientModal } from '@/components/orders/EditClientModal';
import { ExitConfirmModal } from '@/components/orders/ExitConfirmModal';
import { ClientSelectDropdown } from '@/components/orders/ClientSelectDropdown';
import { TwoClickSelect } from '@/components/orders/TwoClickSelect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const statusOptions = [
  { value: 'in_progress', label: 'Em Execução' },
  { value: 'quote', label: 'Orçamento' },
  { value: 'warranty', label: 'Em Garantia' },
];

const termsOptions = [
  { value: 'not_tested', label: 'Não deu pra testar' },
  { value: 'locked', label: 'Bloqueado' },
  { value: 'opened_by_others', label: 'Aberto por outros' },
  { value: 'water_damage', label: 'Molhou' },
  { value: 'glass_replacement', label: 'Troca de vidro' },
];

const passwordTypes = [
  { value: 'none', label: 'Sem Senha' },
  { value: 'pattern', label: 'Senha Padrão' },
  { value: 'pin', label: 'Senha de Pontos' },
  { value: 'password', label: 'Senha Alfanumérica' },
];

const paymentMethods = [
  { value: 'cash', label: 'Dinheiro' },
  { value: 'credit_card', label: 'Cartão de Crédito' },
  { value: 'debit_card', label: 'Cartão de Débito' },
  { value: 'pix', label: 'PIX' },
  { value: 'transfer', label: 'Transferência' },
];

interface Client {
  id: string;
  name: string;
  phone: string;
  cpf?: string | null;
  address?: string | null;
}

interface Brand {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
  brand_id: string;
}

interface Store {
  id: string;
  name: string;
}

interface ValidationErrors {
  store?: boolean;
  client?: boolean;
  brand?: boolean;
  model?: boolean;
  deviceColor?: boolean;
  status?: boolean;
  terms?: boolean;
  passwordValue?: boolean;
  accessories?: boolean;
  problemDescription?: boolean;
  possibleService?: boolean;
  physicalCondition?: boolean;
  possibleRepair?: boolean;
  serviceValue?: boolean;
  estimatedDelivery?: boolean;
  paymentMethod?: boolean;
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { userStoreId, userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const [checklistType, setChecklistType] = useState<'android' | 'ios' | null>(null);
  const [checklistData, setChecklistData] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Refs for scrolling to invalid fields
  const storeRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const deviceColorRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const termsRef = useRef<HTMLDivElement>(null);
  const passwordValueRef = useRef<HTMLDivElement>(null);
  const accessoriesRef = useRef<HTMLDivElement>(null);
  const problemDescriptionRef = useRef<HTMLDivElement>(null);
  const possibleServiceRef = useRef<HTMLDivElement>(null);
  const physicalConditionRef = useRef<HTMLDivElement>(null);
  const possibleRepairRef = useRef<HTMLDivElement>(null);
  const serviceValueRef = useRef<HTMLDivElement>(null);
  const estimatedDeliveryRef = useRef<HTMLDivElement>(null);
  const paymentMethodRef = useRef<HTMLDivElement>(null);

  // Modal states
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editClientModalOpen, setEditClientModalOpen] = useState(false);
  const [checklistRequiredModalOpen, setChecklistRequiredModalOpen] = useState(false);
  const [exitConfirmModalOpen, setExitConfirmModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Data from database
  const [clients, setClients] = useState<Client[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [brandName, setBrandName] = useState('');
  const [modelName, setModelName] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [status, setStatus] = useState('quote');
  const [linkedOrderId, setLinkedOrderId] = useState('');
  const [existingOrders, setExistingOrders] = useState<{ id: string; order_number: string; client_name: string }[]>([]);
  const [terms, setTerms] = useState('');
  const [passwordType, setPasswordType] = useState('none');
  const [passwordValue, setPasswordValue] = useState('');
  const [deviceColor, setDeviceColor] = useState('');
  const [accessories, setAccessories] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [possibleService, setPossibleService] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState('');
  const [possibleRepair, setPossibleRepair] = useState('');
  const [serviceValue, setServiceValue] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [observations, setObservations] = useState('');

  // Load data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      const [clientsRes, brandsRes, modelsRes] = await Promise.all([
        supabase.from('clients').select('id, name, phone, cpf, address').order('name'),
        supabase.from('brands').select('id, name').order('name'),
        supabase.from('models').select('id, name, brand_id').order('name'),
      ]);

      if (clientsRes.data) setClients(clientsRes.data);
      if (brandsRes.data) setBrands(brandsRes.data);
      if (modelsRes.data) setModels(modelsRes.data);

      // Fetch stores for admin
      if (isAdmin) {
        const { data: storesData } = await supabase.from('stores').select('id, name').order('name');
        if (storesData) setStores(storesData);
      }
    };

    fetchData();
  }, [isAdmin]);

  // Fetch existing orders when warranty status is selected
  useEffect(() => {
    const fetchExistingOrders = async () => {
      if (status === 'warranty') {
        const { data: ordersData } = await supabase
          .from('service_orders')
          .select('id, order_number, client:clients(name)')
          .order('order_number', { ascending: false })
          .limit(100);
        
        if (ordersData) {
          setExistingOrders(ordersData.map(o => ({
            id: o.id,
            order_number: o.order_number,
            client_name: (o.client as any)?.name || 'Cliente'
          })));
        }
      } else {
        setLinkedOrderId('');
        setExistingOrders([]);
      }
    };

    fetchExistingOrders();
  }, [status]);

  // Find brand by name to get models
  const selectedBrandObj = brands.find(b => b.name.toLowerCase() === brandName.toLowerCase());
  const availableModels = selectedBrandObj 
    ? models.filter(m => m.brand_id === selectedBrandObj.id) 
    : [];

  const handleNewClient = () => {
    setClientModalOpen(true);
  };

  const handleClientSuccess = (client: { id: string; name: string; phone: string }) => {
    setClients(prev => [...prev, { ...client, cpf: null, address: null }]);
    setSelectedClient(client.id);
  };

  const handleEditClient = (client: Client) => {
    setClientToEdit(client);
    setEditClientModalOpen(true);
  };

  const handleClientUpdate = (updatedClient: Client) => {
    setClients(prev => prev.map(c => c.id === updatedClient.id ? updatedClient : c));
  };

  const handleClientSelect = (clientId: string) => {
    setSelectedClient(clientId);
    setEditClientModalOpen(false);
  };

  // Helper function to get or create brand
  const getOrCreateBrand = async (): Promise<string | null> => {
    if (!brandName.trim()) return null;
    
    // Check if brand exists
    const existingBrand = brands.find(b => b.name.toLowerCase() === brandName.trim().toLowerCase());
    if (existingBrand) return existingBrand.id;
    
    // Create new brand
    const { data, error } = await supabase
      .from('brands')
      .insert({ name: brandName.trim().toUpperCase() })
      .select()
      .single();
    
    if (error) throw new Error(`Erro ao criar marca: ${error.message}`);
    return data.id;
  };

  // Helper function to get or create model
  const getOrCreateModel = async (brandId: string): Promise<string | null> => {
    if (!modelName.trim()) return null;
    
    // Check if model exists for this brand
    const existingModel = models.find(
      m => m.name.toLowerCase() === modelName.trim().toLowerCase() && m.brand_id === brandId
    );
    if (existingModel) return existingModel.id;
    
    // Create new model
    const { data, error } = await supabase
      .from('models')
      .insert({ name: modelName.trim().toUpperCase(), brand_id: brandId })
      .select()
      .single();
    
    if (error) throw new Error(`Erro ao criar modelo: ${error.message}`);
    return data.id;
  };

  const handleChecklistComplete = (type: 'android' | 'ios', data: Record<string, string>) => {
    setChecklistCompleted(true);
    setChecklistType(type);
    setChecklistData(data);
    toast.success('Checklist preenchido com sucesso!');
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};
    const refsToCheck: { key: keyof ValidationErrors; ref: React.RefObject<HTMLDivElement>; condition: boolean }[] = [];

    // Admin must select a store
    if (isAdmin && stores.length > 0 && !selectedStore) {
      errors.store = true;
      refsToCheck.push({ key: 'store', ref: storeRef, condition: true });
    }

    if (!selectedClient) {
      errors.client = true;
      refsToCheck.push({ key: 'client', ref: clientRef, condition: true });
    }

    if (!brandName.trim()) {
      errors.brand = true;
      refsToCheck.push({ key: 'brand', ref: brandRef, condition: true });
    }

    if (!modelName.trim()) {
      errors.model = true;
      refsToCheck.push({ key: 'model', ref: modelRef, condition: true });
    }

    if (!deviceColor.trim()) {
      errors.deviceColor = true;
      refsToCheck.push({ key: 'deviceColor', ref: deviceColorRef, condition: true });
    }

    if (!status) {
      errors.status = true;
      refsToCheck.push({ key: 'status', ref: statusRef, condition: true });
    }

    if (!terms) {
      errors.terms = true;
      refsToCheck.push({ key: 'terms', ref: termsRef, condition: true });
    }

    if (passwordType === 'pattern' && !passwordValue.trim()) {
      errors.passwordValue = true;
      refsToCheck.push({ key: 'passwordValue', ref: passwordValueRef, condition: true });
    }

    if (!accessories.trim()) {
      errors.accessories = true;
      refsToCheck.push({ key: 'accessories', ref: accessoriesRef, condition: true });
    }

    if (!problemDescription.trim()) {
      errors.problemDescription = true;
      refsToCheck.push({ key: 'problemDescription', ref: problemDescriptionRef, condition: true });
    }

    if (!possibleService.trim()) {
      errors.possibleService = true;
      refsToCheck.push({ key: 'possibleService', ref: possibleServiceRef, condition: true });
    }

    if (!physicalCondition.trim()) {
      errors.physicalCondition = true;
      refsToCheck.push({ key: 'physicalCondition', ref: physicalConditionRef, condition: true });
    }

    if (!possibleRepair.trim()) {
      errors.possibleRepair = true;
      refsToCheck.push({ key: 'possibleRepair', ref: possibleRepairRef, condition: true });
    }

    if (!serviceValue || parseFloat(serviceValue) <= 0) {
      errors.serviceValue = true;
      refsToCheck.push({ key: 'serviceValue', ref: serviceValueRef, condition: true });
    }

    if (!estimatedDelivery) {
      errors.estimatedDelivery = true;
      refsToCheck.push({ key: 'estimatedDelivery', ref: estimatedDeliveryRef, condition: true });
    }

    // If entry value is provided, payment method is required
    if (entryValue && parseFloat(entryValue) > 0 && !paymentMethod) {
      errors.paymentMethod = true;
      refsToCheck.push({ key: 'paymentMethod', ref: paymentMethodRef, condition: true });
    }

    setValidationErrors(errors);

    // Find first error and scroll to it
    const firstError = refsToCheck.find(item => item.condition && errors[item.key]);
    if (firstError && firstError.ref.current) {
      firstError.ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast.error('Preencha todos os campos obrigatórios');
      return false;
    }

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!checklistCompleted) {
      setChecklistRequiredModalOpen(true);
      return;
    }

    if (!validateForm()) {
      return;
    }

    // Determine the store ID to use
    const targetStoreId = isAdmin ? selectedStore : userStoreId;

    setIsSaving(true);

    try {
      // Generate order number
      const { data: orderNumberData, error: orderNumberError } = await supabase
        .rpc('generate_order_number');

      if (orderNumberError) throw orderNumberError;

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        setIsSaving(false);
        return;
      }

      const serviceVal = parseFloat(serviceValue || '0');
      const entryVal = parseFloat(entryValue || '0');

      // Get or create brand and model
      const brandId = await getOrCreateBrand();
      if (!brandId) {
        toast.error('Erro ao processar marca');
        setIsSaving(false);
        return;
      }

      const modelId = await getOrCreateModel(brandId);
      if (!modelId) {
        toast.error('Erro ao processar modelo');
        setIsSaving(false);
        return;
      }

      // Create service order
      const { data: orderData, error } = await supabase
        .from('service_orders')
        .insert({
          order_number: orderNumberData,
          client_id: selectedClient,
          brand_id: brandId,
          model_id: modelId,
          device_color: deviceColor,
          password_type: passwordType,
          password_value: passwordType === 'pattern' ? passwordValue : null,
          status: status,
          terms: terms ? [terms] : [],
          accessories: accessories,
          problem_description: problemDescription,
          possible_service: possibleService,
          physical_condition: physicalCondition,
          service_value: serviceVal,
          entry_value: entryVal,
          remaining_value: serviceVal - entryVal,
          payment_method: entryVal > 0 ? paymentMethod : null,
          entry_date: new Date().toISOString(),
          estimated_delivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
          observations: observations || null,
          checklist_completed: checklistCompleted,
          checklist_type: checklistType,
          checklist_data: checklistData,
          linked_order_id: status === 'warranty' && linkedOrderId ? linkedOrderId : null,
          created_by: userData.user.id,
          store_id: targetStoreId,
        })
        .select()
        .single();

      if (error) throw error;

      // If there's an entry value, register in cash
      if (entryVal > 0 && paymentMethod && targetStoreId) {
        // Find current open cash session for this store
        const { data: sessionData } = await supabase
          .from('cash_sessions')
          .select('id')
          .eq('store_id', targetStoreId)
          .eq('status', 'open')
          .maybeSingle();

        const clientName = clients.find(c => c.id === selectedClient)?.name || 'Cliente';
        
        // Always register the transaction, with or without session
        const { error: cashError } = await supabase
          .from('cash_transactions')
          .insert({
            type: 'income',
            amount: entryVal,
            description: `O.S. #${orderNumberData} - ${clientName} (Entrada)`,
            payment_method: paymentMethod,
            service_order_id: orderData?.id,
            created_by: userData.user.id,
            store_id: targetStoreId,
            cash_session_id: sessionData?.id || null,
          });

        if (cashError) {
          console.error('Error registering cash entry:', cashError);
          toast.error('O.S. criada, mas houve erro ao registrar entrada no caixa');
        } else if (sessionData) {
          toast.success(`Entrada de R$ ${entryVal.toFixed(2)} registrada no caixa!`);
        } else {
          toast.info(`Entrada de R$ ${entryVal.toFixed(2)} registrada. Aparecerá no caixa quando aberto.`);
        }
      }

      toast.success('Ordem de serviço criada com sucesso!');
      navigate('/orders');
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast.error('Erro ao criar ordem de serviço: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFillChecklistFromModal = () => {
    setChecklistRequiredModalOpen(false);
    if (!validateForm()) {
      return;
    }
    setChecklistModalOpen(true);
  };

  // Handle opening checklist directly (no validation needed when clicking card)
  const handleOpenChecklist = () => {
    setChecklistModalOpen(true);
  };

  // Handle back navigation with confirmation
  const handleBackNavigation = useCallback(() => {
    setExitConfirmModalOpen(true);
  }, []);

  const handleConfirmExit = () => {
    setExitConfirmModalOpen(false);
    navigate('/orders');
  };

  // Intercept browser back button and hardware back button
  useEffect(() => {
    // Push a dummy state to history to intercept back navigation
    window.history.pushState({ preventBack: true }, '');

    const handlePopState = (event: PopStateEvent) => {
      // Prevent the default back navigation
      window.history.pushState({ preventBack: true }, '');
      handleBackNavigation();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [handleBackNavigation]);

  // Helper to convert input to uppercase
  const handleUppercaseChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value.toUpperCase());
  };

  // Convert options to format expected by TwoClickSelect - using names as values for free typing
  const brandOptions = brands.map(b => ({ value: b.name, label: b.name }));
  const modelOptions = availableModels.map(m => ({ value: m.name, label: m.name }));
  const storeOptions = stores.map(s => ({ value: s.id, label: s.name }));

  return (
    <AppLayout showNav={false}>
      <form onSubmit={handleSubmit} className="animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={handleBackNavigation}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">Nova Ordem de Serviço</h1>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6 pb-24">
          {/* Store Selection - Admin Only */}
          {isAdmin && stores.length > 0 && (
            <div ref={storeRef} className="space-y-3">
              <Label className={`section-header uppercase flex items-center gap-2 ${validationErrors.store ? 'text-destructive' : ''}`}>
                <Store className="w-4 h-4" />
                LOJA DE DESTINO *
              </Label>
              <div className={validationErrors.store ? 'ring-2 ring-destructive rounded-lg' : ''}>
                <TwoClickSelect
                  options={storeOptions}
                  value={selectedStore}
                  onValueChange={(v) => { setSelectedStore(v); setValidationErrors(prev => ({ ...prev, store: false })); }}
                  placeholder="SELECIONE A LOJA"
                />
              </div>
              {validationErrors.store && (
                <p className="text-xs text-destructive">* Campo obrigatório</p>
              )}
            </div>
          )}

          {/* Checklist Status */}
          <div
            className={`glass-card p-4 cursor-pointer transition-colors ${
              checklistCompleted ? 'border-success/50' : 'border-destructive/50'
            }`}
            onClick={handleOpenChecklist}
          >
            <div>
              <p className="font-medium text-foreground">Checklist</p>
              <p className={`text-sm ${checklistCompleted ? 'text-success' : 'text-destructive'}`}>
                {checklistCompleted
                  ? `✅ Preenchido (${checklistType === 'android' ? 'Android' : 'iOS'})`
                  : '❌ Não preenchido'}
              </p>
            </div>
          </div>

          {/* Client */}
          <div ref={clientRef} className="space-y-3">
            <Label className={`section-header uppercase ${validationErrors.client ? 'text-destructive' : ''}`}>CLIENTE *</Label>
            <div className={validationErrors.client ? 'ring-2 ring-destructive rounded-lg' : ''}>
              <ClientSelectDropdown
                clients={clients}
                selectedClient={selectedClient}
                onSelect={(v) => { setSelectedClient(v); setValidationErrors(prev => ({ ...prev, client: false })); }}
                onEdit={handleEditClient}
              />
            </div>
            {validationErrors.client && <p className="text-xs text-destructive">* Campo obrigatório</p>}
            <Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleNewClient}>
              <Plus className="w-4 h-4 mr-2" />
              CADASTRAR NOVO CLIENTE
            </Button>
          </div>

          {/* Device Info */}
          <div className="space-y-3">
            <Label className="section-header uppercase">APARELHO</Label>
            <div className="grid grid-cols-2 gap-3">
              <div ref={brandRef}>
                <Label className={`text-xs uppercase mb-1 block ${validationErrors.brand ? 'text-destructive' : 'text-muted-foreground'}`}>MARCA *</Label>
                <div className={validationErrors.brand ? 'ring-2 ring-destructive rounded-lg' : ''}>
                  <TwoClickSelect
                    options={brandOptions}
                    value={brandName}
                    onValueChange={(v) => { setBrandName(v); setModelName(''); setValidationErrors(prev => ({ ...prev, brand: false })); }}
                    placeholder="DIGITE OU SELECIONE"
                  />
                </div>
                {validationErrors.brand && <p className="text-xs text-destructive mt-1">* Obrigatório</p>}
              </div>
              <div ref={modelRef}>
                <Label className={`text-xs uppercase mb-1 block ${validationErrors.model ? 'text-destructive' : 'text-muted-foreground'}`}>MODELO *</Label>
                <div className={validationErrors.model ? 'ring-2 ring-destructive rounded-lg' : ''}>
                  <TwoClickSelect
                    options={modelOptions}
                    value={modelName}
                    onValueChange={(v) => { setModelName(v); setValidationErrors(prev => ({ ...prev, model: false })); }}
                    placeholder="DIGITE OU SELECIONE"
                    disabled={!brandName.trim()}
                  />
                </div>
                {validationErrors.model && <p className="text-xs text-destructive mt-1">* Obrigatório</p>}
              </div>
            </div>
            <div ref={deviceColorRef} className="space-y-2">
              <Label className={`text-sm uppercase ${validationErrors.deviceColor ? 'text-destructive' : 'text-muted-foreground'}`}>COR DO APARELHO *</Label>
              <Input
                placeholder="Ex: Preto, Azul..."
                value={deviceColor}
                onChange={(e) => { setDeviceColor(e.target.value.toUpperCase()); setValidationErrors(prev => ({ ...prev, deviceColor: false })); }}
                className={`input-field uppercase ${validationErrors.deviceColor ? 'ring-2 ring-destructive' : ''}`}
              />
              {validationErrors.deviceColor && <p className="text-xs text-destructive">* Campo obrigatório</p>}
            </div>
          </div>

          {/* Status */}
          <div ref={statusRef} className="space-y-3">
            <Label className={`section-header uppercase ${validationErrors.status ? 'text-destructive' : ''}`}>STATUS *</Label>
            <div className={validationErrors.status ? 'ring-2 ring-destructive rounded-lg' : ''}>
              <TwoClickSelect
                options={statusOptions}
                value={status}
                onValueChange={(v) => { setStatus(v); setValidationErrors(prev => ({ ...prev, status: false })); }}
              />
            </div>
            {validationErrors.status && <p className="text-xs text-destructive">* Campo obrigatório</p>}
          </div>

          {/* Link Existing Order - Only when warranty is selected */}
          {status === 'warranty' && (
            <div className="space-y-3">
              <Label className="section-header uppercase">VINCULAR O.S EXISTENTE</Label>
              <TwoClickSelect
                options={existingOrders.map(o => ({ 
                  value: o.id, 
                  label: `#${o.order_number} - ${o.client_name}` 
                }))}
                value={linkedOrderId}
                onValueChange={setLinkedOrderId}
                placeholder="BUSCAR O.S..."
              />
              {linkedOrderId && (
                <p className="text-sm text-success">
                  ✅ O.S. vinculada: #{existingOrders.find(o => o.id === linkedOrderId)?.order_number}
                </p>
              )}
            </div>
          )}

          {/* Password */}
          <div ref={passwordValueRef} className="space-y-3">
            <Label className="section-header uppercase">SENHA DO APARELHO</Label>
            <TwoClickSelect
              options={passwordTypes}
              value={passwordType}
              onValueChange={setPasswordType}
            />
            {passwordType === 'pattern' && (
              <>
                <Input
                  placeholder="Digite a senha"
                  value={passwordValue}
                  onChange={(e) => { setPasswordValue(e.target.value.toUpperCase()); setValidationErrors(prev => ({ ...prev, passwordValue: false })); }}
                  className={`input-field uppercase ${validationErrors.passwordValue ? 'ring-2 ring-destructive' : ''}`}
                />
                {validationErrors.passwordValue && <p className="text-xs text-destructive">* Digite a senha</p>}
              </>
            )}
            {passwordType === 'pin' && (
              <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                ℹ️ A senha será gerada automaticamente na impressão no formato de 9 pontos.
              </p>
            )}
          </div>

          {/* Accessories */}
          <div ref={accessoriesRef} className="space-y-3">
            <Label className={`section-header uppercase ${validationErrors.accessories ? 'text-destructive' : ''}`}>ACESSÓRIOS ENTREGUES *</Label>
            <Input
              placeholder="Ex: Carregador, Capinha..."
              value={accessories}
              onChange={(e) => { setAccessories(e.target.value.toUpperCase()); setValidationErrors(prev => ({ ...prev, accessories: false })); }}
              className={`input-field uppercase ${validationErrors.accessories ? 'ring-2 ring-destructive' : ''}`}
            />
            {validationErrors.accessories && <p className="text-xs text-destructive">* Campo obrigatório</p>}
          </div>

          {/* Problem & Service */}
          <div ref={problemDescriptionRef} className="space-y-3">
            <Label className={`section-header uppercase ${validationErrors.problemDescription ? 'text-destructive' : ''}`}>RELATO DO CLIENTE *</Label>
            <Textarea
              placeholder="Descreva o problema relatado pelo cliente..."
              value={problemDescription}
              onChange={(e) => { setProblemDescription(e.target.value.toUpperCase()); setValidationErrors(prev => ({ ...prev, problemDescription: false })); }}
              className={`input-field min-h-[80px] uppercase ${validationErrors.problemDescription ? 'ring-2 ring-destructive' : ''}`}
            />
            {validationErrors.problemDescription && <p className="text-xs text-destructive">* Campo obrigatório</p>}
          </div>

          <div ref={possibleServiceRef} className="space-y-3">
            <Label className={`section-header uppercase ${validationErrors.possibleService ? 'text-destructive' : ''}`}>ESTADO FÍSICO DO APARELHO *</Label>
            <Input
              placeholder="Ex: Arranhões, amassados, trincas..."
              value={possibleService}
              onChange={(e) => { setPossibleService(e.target.value.toUpperCase()); setValidationErrors(prev => ({ ...prev, possibleService: false })); }}
              className={`input-field uppercase ${validationErrors.possibleService ? 'ring-2 ring-destructive' : ''}`}
            />
            {validationErrors.possibleService && <p className="text-xs text-destructive">* Campo obrigatório</p>}
          </div>

          <div ref={physicalConditionRef} className="space-y-3">
            <Label className={`section-header uppercase ${validationErrors.physicalCondition ? 'text-destructive' : ''}`}>PROBLEMA APRESENTADO *</Label>
            <Textarea
              placeholder="Descreva o problema identificado no aparelho..."
              value={physicalCondition}
              onChange={(e) => { setPhysicalCondition(e.target.value.toUpperCase()); setValidationErrors(prev => ({ ...prev, physicalCondition: false })); }}
              className={`input-field min-h-[60px] uppercase ${validationErrors.physicalCondition ? 'ring-2 ring-destructive' : ''}`}
            />
            {validationErrors.physicalCondition && <p className="text-xs text-destructive">* Campo obrigatório</p>}
          </div>

          <div ref={possibleRepairRef} className="space-y-3">
            <Label className={`section-header uppercase ${validationErrors.possibleRepair ? 'text-destructive' : ''}`}>POSSÍVEL REPARO A SER FEITO *</Label>
            <Input
              placeholder="Ex: Troca de tela, Reparo na placa..."
              value={possibleRepair}
              onChange={(e) => { setPossibleRepair(e.target.value.toUpperCase()); setValidationErrors(prev => ({ ...prev, possibleRepair: false })); }}
              className={`input-field uppercase ${validationErrors.possibleRepair ? 'ring-2 ring-destructive' : ''}`}
            />
            {validationErrors.possibleRepair && <p className="text-xs text-destructive">* Campo obrigatório</p>}
          </div>

          {/* Observations */}
          <div className="space-y-3">
            <Label className="section-header uppercase">OBSERVAÇÕES</Label>
            <Textarea
              placeholder="Observações adicionais..."
              value={observations}
              onChange={handleUppercaseChange(setObservations)}
              className="input-field min-h-[80px] uppercase"
            />
          </div>

          {/* Values */}
          <div className="space-y-3">
            <Label className="section-header uppercase">VALORES</Label>
            <div className="grid grid-cols-2 gap-3">
              <div ref={serviceValueRef} className="space-y-2">
                <Label className={`text-sm uppercase ${validationErrors.serviceValue ? 'text-destructive' : 'text-muted-foreground'}`}>VALOR DO SERVIÇO *</Label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={serviceValue}
                  onChange={(e) => { setServiceValue(e.target.value); setValidationErrors(prev => ({ ...prev, serviceValue: false })); }}
                  className={`input-field ${validationErrors.serviceValue ? 'ring-2 ring-destructive' : ''}`}
                />
                {validationErrors.serviceValue && <p className="text-xs text-destructive">* Obrigatório</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground uppercase">VALOR DE ENTRADA</Label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={entryValue}
                  onChange={(e) => setEntryValue(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
            {entryValue && parseFloat(entryValue) > 0 && (
              <div ref={paymentMethodRef} className="space-y-2">
                <Label className={`text-sm uppercase ${validationErrors.paymentMethod ? 'text-destructive' : 'text-muted-foreground'}`}>MEIO DE PAGAMENTO *</Label>
                <div className={validationErrors.paymentMethod ? 'ring-2 ring-destructive rounded-lg' : ''}>
                  <TwoClickSelect
                    options={paymentMethods}
                    value={paymentMethod}
                    onValueChange={(v) => { setPaymentMethod(v); setValidationErrors(prev => ({ ...prev, paymentMethod: false })); }}
                    placeholder="SELECIONE"
                  />
                </div>
                {validationErrors.paymentMethod && <p className="text-xs text-destructive">* Obrigatório</p>}
              </div>
            )}
            {serviceValue && entryValue && (
              <div className="bg-secondary/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground uppercase">VALOR RESTANTE</p>
                <p className="text-lg font-bold text-foreground">
                  R$ {(parseFloat(serviceValue || '0') - parseFloat(entryValue || '0')).toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="space-y-3">
            <Label className="section-header uppercase">DATAS</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase">
                  <Calendar className="w-4 h-4 shrink-0" />
                  <span>ENTRADA</span>
                </div>
                <Input
                  type="date"
                  value={format(new Date(), 'yyyy-MM-dd')}
                  className="input-field"
                  readOnly
                />
              </div>
              <div ref={estimatedDeliveryRef} className="space-y-2">
                <div className={`flex items-center gap-2 text-sm uppercase ${validationErrors.estimatedDelivery ? 'text-destructive' : 'text-muted-foreground'}`}>
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="truncate">PREVISÃO DE ENTREGA *</span>
                </div>
                <Input
                  type="datetime-local"
                  value={estimatedDelivery}
                  onChange={(e) => { setEstimatedDelivery(e.target.value); setValidationErrors(prev => ({ ...prev, estimatedDelivery: false })); }}
                  className={`input-field ${validationErrors.estimatedDelivery ? 'ring-2 ring-destructive' : ''}`}
                />
                {validationErrors.estimatedDelivery && <p className="text-xs text-destructive">* Obrigatório</p>}
              </div>
            </div>
          </div>

          {/* Terms */}
          <div ref={termsRef} className="space-y-3">
            <Label className={`section-header uppercase ${validationErrors.terms ? 'text-destructive' : ''}`}>TERMOS DE SERVIÇO *</Label>
            <div className={validationErrors.terms ? 'ring-2 ring-destructive rounded-lg' : ''}>
              <TwoClickSelect
                options={termsOptions}
                value={terms}
                onValueChange={(v) => { setTerms(v); setValidationErrors(prev => ({ ...prev, terms: false })); }}
                placeholder="SELECIONE"
              />
            </div>
            {validationErrors.terms && <p className="text-xs text-destructive">* Campo obrigatório</p>}
          </div>


          {/* Submit Button */}
          <Button type="submit" variant="glow" size="lg" className="w-full" disabled={isSaving}>
            {isSaving ? 'SALVANDO...' : 'SALVAR O.S.'}
          </Button>
        </div>
      </form>

      <ChecklistModal
        open={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        onComplete={handleChecklistComplete}
      />

      <NewClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={handleClientSuccess}
      />


      <EditClientModal
        open={editClientModalOpen}
        client={clientToEdit}
        onClose={() => {
          setEditClientModalOpen(false);
          setClientToEdit(null);
        }}
        onUpdate={handleClientUpdate}
        onSelect={handleClientSelect}
      />

      <ChecklistRequiredModal
        open={checklistRequiredModalOpen}
        onClose={() => setChecklistRequiredModalOpen(false)}
        onFillChecklist={handleFillChecklistFromModal}
      />

      <ExitConfirmModal
        open={exitConfirmModalOpen}
        onClose={() => setExitConfirmModalOpen(false)}
        onConfirm={handleConfirmExit}
      />
    </AppLayout>
  );
}
