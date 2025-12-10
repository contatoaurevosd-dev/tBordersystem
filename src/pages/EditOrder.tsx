import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Calendar, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChecklistModal } from '@/components/orders/ChecklistModal';
import { NewClientModal } from '@/components/orders/NewClientModal';
import { NewBrandModal } from '@/components/orders/NewBrandModal';
import { NewModelModal } from '@/components/orders/NewModelModal';
import { EditClientModal } from '@/components/orders/EditClientModal';
import { ExitConfirmModal } from '@/components/orders/ExitConfirmModal';
import { ClientSelectDropdown } from '@/components/orders/ClientSelectDropdown';
import { TwoClickSelect } from '@/components/orders/TwoClickSelect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const statusOptions = [
  { value: 'waiting_part', label: 'Aguardando Peça' },
  { value: 'quote', label: 'Orçamento' },
  { value: 'in_progress', label: 'Em Execução' },
  { value: 'delayed', label: 'Em Atraso' },
  { value: 'warranty', label: 'Em Garantia' },
  { value: 'completed', label: 'Concluído' },
  { value: 'delivered', label: 'Entregue' },
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

export default function EditOrder() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');

  // Checklist states
  const [checklistModalOpen, setChecklistModalOpen] = useState(false);
  const [checklistCompleted, setChecklistCompleted] = useState(false);
  const [checklistType, setChecklistType] = useState<'android' | 'ios' | null>(null);
  const [checklistData, setChecklistData] = useState<Record<string, string>>({});

  // Modal states
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [editClientModalOpen, setEditClientModalOpen] = useState(false);
  const [exitConfirmModalOpen, setExitConfirmModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  // Data from database
  const [clients, setClients] = useState<Client[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<Model[]>([]);

  // Form state
  const [selectedClient, setSelectedClient] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [status, setStatus] = useState('quote');
  const [terms, setTerms] = useState('');
  const [passwordType, setPasswordType] = useState('none');
  const [passwordValue, setPasswordValue] = useState('');
  const [deviceColor, setDeviceColor] = useState('');
  const [accessories, setAccessories] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  const [possibleService, setPossibleService] = useState('');
  const [physicalCondition, setPhysicalCondition] = useState('');
  const [serviceValue, setServiceValue] = useState('');
  const [entryValue, setEntryValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [observations, setObservations] = useState('');
  const [entryDate, setEntryDate] = useState('');

  // Load data from Supabase
  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;

      try {
        const [clientsRes, brandsRes, modelsRes, orderRes] = await Promise.all([
          supabase.from('clients').select('id, name, phone, cpf, address').order('name'),
          supabase.from('brands').select('id, name').order('name'),
          supabase.from('models').select('id, name, brand_id').order('name'),
          supabase.from('service_orders').select('*').eq('id', id).maybeSingle(),
        ]);

        if (clientsRes.data) setClients(clientsRes.data);
        if (brandsRes.data) setBrands(brandsRes.data);
        if (modelsRes.data) setModels(modelsRes.data);

        if (orderRes.data) {
          const order = orderRes.data;
          setOrderNumber(order.order_number);
          setSelectedClient(order.client_id);
          setSelectedBrand(order.brand_id);
          setSelectedModel(order.model_id);
          setStatus(order.status);
          setTerms(order.terms?.[0] || '');
          setPasswordType(order.password_type);
          setPasswordValue(order.password_value || '');
          setDeviceColor(order.device_color);
          setAccessories(order.accessories);
          setProblemDescription(order.problem_description);
          setPossibleService(order.possible_service);
          setPhysicalCondition(order.physical_condition);
          setServiceValue(order.service_value?.toString() || '');
          setEntryValue(order.entry_value?.toString() || '');
          setPaymentMethod(order.payment_method || '');
          setEntryDate(order.entry_date);
          setEstimatedDelivery(order.estimated_delivery ? format(new Date(order.estimated_delivery), "yyyy-MM-dd'T'HH:mm") : '');
          setObservations(order.observations || '');
          setChecklistCompleted(order.checklist_completed);
          setChecklistType(order.checklist_type as 'android' | 'ios' | null);
          setChecklistData((order.checklist_data as Record<string, string>) || {});
        }
      } catch (error: any) {
        console.error('Error fetching data:', error);
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const availableModels = selectedBrand 
    ? models.filter(m => m.brand_id === selectedBrand) 
    : [];

  const selectedBrandName = brands.find(b => b.id === selectedBrand)?.name || '';

  const handleNewClient = () => setClientModalOpen(true);

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

  const handleNewBrand = () => setBrandModalOpen(true);

  const handleBrandSuccess = (brand: { id: string; name: string }) => {
    setBrands(prev => [...prev, brand]);
    setSelectedBrand(brand.id);
  };

  const handleNewModel = () => {
    if (!selectedBrand) {
      toast.error('Selecione uma marca primeiro');
      return;
    }
    setModelModalOpen(true);
  };

  const handleModelSuccess = (model: { id: string; name: string }) => {
    setModels(prev => [...prev, { ...model, brand_id: selectedBrand }]);
    setSelectedModel(model.id);
  };

  const handleChecklistComplete = (type: 'android' | 'ios', data: Record<string, string>) => {
    setChecklistCompleted(true);
    setChecklistType(type);
    setChecklistData(data);
    toast.success('Checklist preenchido com sucesso!');
  };

  const handleSave = async () => {
    if (!selectedClient || !selectedBrand || !selectedModel) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    setIsSaving(true);

    try {
      const serviceVal = parseFloat(serviceValue || '0');
      const entryVal = parseFloat(entryValue || '0');

      const { error } = await supabase
        .from('service_orders')
        .update({
          client_id: selectedClient,
          brand_id: selectedBrand,
          model_id: selectedModel,
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
          estimated_delivery: estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null,
          observations: observations || null,
          checklist_completed: checklistCompleted,
          checklist_type: checklistType,
          checklist_data: checklistData,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Ordem de serviço atualizada!');
      navigate('/orders');
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast.error('Erro ao atualizar: ' + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackNavigation = useCallback(() => {
    setExitConfirmModalOpen(true);
  }, []);

  const handleConfirmExit = () => {
    setExitConfirmModalOpen(false);
    navigate('/orders');
  };

  useEffect(() => {
    window.history.pushState({ preventBack: true }, '');

    const handlePopState = () => {
      window.history.pushState({ preventBack: true }, '');
      handleBackNavigation();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [handleBackNavigation]);

  const handleUppercaseChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value.toUpperCase());
  };

  const brandOptions = brands.map(b => ({ value: b.id, label: b.name }));
  const modelOptions = availableModels.map(m => ({ value: m.id, label: m.name }));

  const remainingValue = parseFloat(serviceValue || '0') - parseFloat(entryValue || '0');

  if (loading) {
    return (
      <AppLayout showNav={false}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout showNav={false}>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={handleBackNavigation}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">Editar O.S. #{orderNumber}</h1>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6 pb-24">
          {/* Checklist Status */}
          <div
            className={`glass-card p-4 cursor-pointer transition-colors ${
              checklistCompleted ? 'border-success/50' : 'border-destructive/50'
            }`}
            onClick={() => setChecklistModalOpen(true)}
          >
            <p className="font-medium text-foreground">Checklist</p>
            <p className={`text-sm ${checklistCompleted ? 'text-success' : 'text-destructive'}`}>
              {checklistCompleted
                ? `✅ Preenchido (${checklistType === 'android' ? 'Android' : 'iOS'})`
                : '❌ Não preenchido'}
            </p>
          </div>

          {/* Client */}
          <div className="space-y-3">
            <Label className="section-header uppercase">CLIENTE</Label>
            <ClientSelectDropdown
              clients={clients}
              selectedClient={selectedClient}
              onSelect={setSelectedClient}
              onEdit={handleEditClient}
            />
            <Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleNewClient}>
              <Plus className="w-4 h-4 mr-2" />
              CADASTRAR NOVO CLIENTE
            </Button>
          </div>

          {/* Device Info */}
          <div className="space-y-3">
            <Label className="section-header uppercase">APARELHO</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground uppercase">MARCA</Label>
                <TwoClickSelect
                  options={brandOptions}
                  value={selectedBrand}
                  onValueChange={setSelectedBrand}
                  placeholder="SELECIONE"
                />
                <Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleNewBrand}>
                  <Plus className="w-4 h-4 mr-2" />
                  NOVA MARCA
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground uppercase">MODELO</Label>
                <TwoClickSelect
                  options={modelOptions}
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                  placeholder="SELECIONE"
                  disabled={!selectedBrand}
                />
                <Button type="button" variant="secondary" size="sm" className="w-full" onClick={handleNewModel}>
                  <Plus className="w-4 h-4 mr-2" />
                  NOVO MODELO
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground uppercase">COR DO APARELHO</Label>
              <Input
                placeholder="Ex: Preto, Azul..."
                value={deviceColor}
                onChange={handleUppercaseChange(setDeviceColor)}
                className="input-field uppercase"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-3">
            <Label className="section-header uppercase">STATUS</Label>
            <TwoClickSelect
              options={statusOptions}
              value={status}
              onValueChange={setStatus}
            />
          </div>

          {/* Terms */}
          <div className="space-y-3">
            <Label className="section-header uppercase">TERMOS DE SERVIÇO</Label>
            <TwoClickSelect
              options={termsOptions}
              value={terms}
              onValueChange={setTerms}
              placeholder="SELECIONE"
            />
          </div>

          {/* Password */}
          <div className="space-y-3">
            <Label className="section-header uppercase">SENHA DO APARELHO</Label>
            <TwoClickSelect
              options={passwordTypes}
              value={passwordType}
              onValueChange={setPasswordType}
            />
            {passwordType === 'pattern' && (
              <Input
                placeholder="Digite a senha"
                value={passwordValue}
                onChange={handleUppercaseChange(setPasswordValue)}
                className="input-field uppercase"
              />
            )}
            {passwordType === 'pin' && (
              <p className="text-sm text-muted-foreground bg-secondary/50 p-3 rounded-lg">
                ℹ️ A senha será gerada automaticamente na impressão no formato de 9 pontos.
              </p>
            )}
          </div>

          {/* Accessories */}
          <div className="space-y-3">
            <Label className="section-header uppercase">ACESSÓRIOS ENTREGUES</Label>
            <Input
              placeholder="Ex: Carregador, Capinha..."
              value={accessories}
              onChange={handleUppercaseChange(setAccessories)}
              className="input-field uppercase"
            />
          </div>

          {/* Problem & Service */}
          <div className="space-y-3">
            <Label className="section-header uppercase">DESCRIÇÃO DO PROBLEMA</Label>
            <Textarea
              placeholder="Descreva o problema relatado pelo cliente..."
              value={problemDescription}
              onChange={handleUppercaseChange(setProblemDescription)}
              className="input-field min-h-[80px] uppercase"
            />
          </div>

          <div className="space-y-3">
            <Label className="section-header uppercase">POSSÍVEL SERVIÇO</Label>
            <Input
              placeholder="Ex: Troca de tela, Reparo na placa..."
              value={possibleService}
              onChange={handleUppercaseChange(setPossibleService)}
              className="input-field uppercase"
            />
          </div>

          <div className="space-y-3">
            <Label className="section-header uppercase">CONDIÇÃO FÍSICA</Label>
            <Textarea
              placeholder="Descreva arranhões, amassados, etc..."
              value={physicalCondition}
              onChange={handleUppercaseChange(setPhysicalCondition)}
              className="input-field min-h-[60px] uppercase"
            />
          </div>

          {/* Values */}
          <div className="space-y-3">
            <Label className="section-header uppercase">VALORES</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground uppercase">VALOR DO SERVIÇO</Label>
                <Input
                  type="number"
                  placeholder="R$ 0,00"
                  value={serviceValue}
                  onChange={(e) => setServiceValue(e.target.value)}
                  className="input-field"
                />
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
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground uppercase">MEIO DE PAGAMENTO (ENTRADA)</Label>
                <TwoClickSelect
                  options={paymentMethods}
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  placeholder="SELECIONE"
                />
              </div>
            )}
            {serviceValue && entryValue && (
              <div className="bg-secondary/50 p-3 rounded-lg">
                <p className="text-sm text-muted-foreground uppercase">VALOR RESTANTE</p>
                <p className="text-lg font-bold text-foreground">
                  R$ {remainingValue.toFixed(2)}
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
                  value={entryDate ? format(new Date(entryDate), 'yyyy-MM-dd') : ''}
                  className="input-field"
                  readOnly
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground uppercase">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span className="truncate">PREVISÃO DE ENTREGA</span>
                </div>
                <Input
                  type="datetime-local"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
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

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              type="button" 
              variant="glow" 
              size="lg" 
              className="w-full" 
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </Button>
          </div>
        </div>
      </div>

      <ChecklistModal
        open={checklistModalOpen}
        onClose={() => setChecklistModalOpen(false)}
        onComplete={handleChecklistComplete}
        orderCode={`#${orderNumber}`}
      />

      <NewClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        onSuccess={handleClientSuccess}
      />

      <NewBrandModal
        open={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        onSuccess={handleBrandSuccess}
      />

      <NewModelModal
        open={modelModalOpen}
        onClose={() => setModelModalOpen(false)}
        onSuccess={handleModelSuccess}
        brandId={selectedBrand}
        brandName={selectedBrandName}
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

      <ExitConfirmModal
        open={exitConfirmModalOpen}
        onClose={() => setExitConfirmModalOpen(false)}
        onConfirm={handleConfirmExit}
      />
    </AppLayout>
  );
}
