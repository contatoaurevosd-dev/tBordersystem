import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, ChevronDown, ChevronUp, Shield, Loader2, Wrench, XCircle, CheckCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TwoClickSelect } from '@/components/orders/TwoClickSelect';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

const warrantyTimeOptions = [
  { value: '0', label: 'SEM GARANTIA' },
  { value: '30', label: '30 DIAS' },
  { value: '60', label: '60 DIAS' },
  { value: '90', label: '90 DIAS' },
  { value: '180', label: '180 DIAS' },
  { value: '365', label: '365 DIAS' },
];

const paymentMethods = [
  { value: 'cash', label: 'DINHEIRO' },
  { value: 'credit_card', label: 'CARTÃO DE CRÉDITO' },
  { value: 'debit_card', label: 'CARTÃO DE DÉBITO' },
  { value: 'pix', label: 'PIX' },
  { value: 'transfer', label: 'TRANSFERÊNCIA' },
];

type DeliveryType = 'with_repair' | 'without_repair' | 'warranty';

interface LinkedOrder {
  id: string;
  order_number: string;
}

interface ServiceOrder {
  id: string;
  order_number: string;
  status: string;
  service_value: number;
  entry_value: number;
  remaining_value: number;
  device_color: string;
  problem_description: string;
  possible_service: string;
  store_id: string | null;
  linked_order_id: string | null;
  linked_order?: LinkedOrder | null;
  client: {
    id: string;
    name: string;
    phone: string;
  } | null;
  brand: {
    id: string;
    name: string;
  } | null;
  model: {
    id: string;
    name: string;
  } | null;
}

export default function Deliveries() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchCode, setSearchCode] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundOrder, setFoundOrder] = useState<ServiceOrder | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [warrantyTime, setWarrantyTime] = useState('90');
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [executedService, setExecutedService] = useState('');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('with_repair');
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [lastRefundInfo, setLastRefundInfo] = useState<{
    orderNumber: string;
    clientName: string;
    clientPhone: string;
    device: string;
    deviceColor: string;
    refundAmount: number;
    reason: string;
    date: Date;
    executedBy: string;
  } | null>(null);

  const generateRefundPDF = () => {
    if (!lastRefundInfo) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE ESTORNO', pageWidth / 2, 25, { align: 'center' });
    
    // Date/Time
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data/Hora: ${format(lastRefundInfo.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 35, { align: 'center' });
    
    // Divider line
    doc.setLineWidth(0.5);
    doc.line(20, 42, pageWidth - 20, 42);
    
    // Order Data Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DA ORDEM DE SERVIÇO', 20, 55);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const orderData = [
      `Número da O.S.: #${lastRefundInfo.orderNumber}`,
      `Cliente: ${lastRefundInfo.clientName}`,
      `Telefone: ${lastRefundInfo.clientPhone}`,
      `Aparelho: ${lastRefundInfo.device}`,
      `Cor: ${lastRefundInfo.deviceColor}`,
    ];
    
    let yPos = 65;
    orderData.forEach((line) => {
      doc.text(line, 20, yPos);
      yPos += 8;
    });
    
    // Divider line
    doc.line(20, yPos + 5, pageWidth - 20, yPos + 5);
    
    // Refund Data Section
    yPos += 18;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO ESTORNO', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 53, 69); // Red color for refund amount
    doc.text(`Valor do Estorno: R$ ${lastRefundInfo.refundAmount.toFixed(2)}`, 20, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Reset to black
    doc.text(`Motivo: ${lastRefundInfo.reason}`, 20, yPos);
    
    yPos += 8;
    doc.text(`Executado por: ${lastRefundInfo.executedBy}`, 20, yPos);
    
    // Divider line
    yPos += 12;
    doc.line(20, yPos, pageWidth - 20, yPos);
    
    // Observations Section
    yPos += 13;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(180, 83, 9); // Warning color
    const observations = [
      'Este estorno NÃO foi registrado automaticamente no caixa.',
      'Favor comunicar ao setor financeiro para efetuar',
      'a devolução ao cliente.',
    ];
    observations.forEach((line) => {
      doc.text(line, 20, yPos);
      yPos += 7;
    });
    
    // Footer
    doc.setTextColor(128, 128, 128); // Gray
    doc.setFontSize(8);
    doc.text('Documento gerado automaticamente pelo sistema', pageWidth / 2, 280, { align: 'center' });
    
    // Save PDF
    doc.save(`estorno_os_${lastRefundInfo.orderNumber}_${format(lastRefundInfo.date, 'yyyyMMdd_HHmmss')}.pdf`);
    
    toast.success('Relatório de estorno em PDF baixado!');
  };

  const handleSearch = async () => {
    if (!searchCode.trim()) {
      toast.error('Digite o código da O.S.');
      return;
    }

    setIsSearching(true);
    setFoundOrder(null);
    setExpanded(false);

    try {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          status,
          service_value,
          entry_value,
          remaining_value,
          device_color,
          problem_description,
          possible_service,
          store_id,
          linked_order_id,
          client:clients(id, name, phone),
          brand:brands(id, name),
          model:models(id, name)
        `)
        .eq('order_number', searchCode.trim().replace('#', ''))
        .maybeSingle();

      if (error) throw error;

      if (data) {
        // Fetch linked order details if exists
        let linkedOrder: LinkedOrder | null = null;
        if (data.linked_order_id) {
          const { data: linkedData } = await supabase
            .from('service_orders')
            .select('id, order_number')
            .eq('id', data.linked_order_id)
            .maybeSingle();
          
          if (linkedData) {
            linkedOrder = linkedData;
          }
        }

        const order: ServiceOrder = {
          id: data.id,
          order_number: data.order_number,
          status: data.status,
          service_value: data.service_value,
          entry_value: data.entry_value,
          remaining_value: data.remaining_value,
          device_color: data.device_color,
          problem_description: data.problem_description,
          possible_service: data.possible_service,
          store_id: data.store_id,
          linked_order_id: data.linked_order_id,
          linked_order: linkedOrder,
          client: Array.isArray(data.client) ? data.client[0] : data.client,
          brand: Array.isArray(data.brand) ? data.brand[0] : data.brand,
          model: Array.isArray(data.model) ? data.model[0] : data.model,
        };
        setFoundOrder(order);
        setExpanded(true);
        
        // Auto-select warranty delivery type if order has a linked order (is a warranty order)
        if (order.linked_order_id) {
          setDeliveryType('warranty');
        }
      } else {
        toast.error('O.S. não encontrada');
      }
    } catch (error: any) {
      console.error('Error searching order:', error);
      toast.error('Erro ao buscar O.S.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getCashSession = async (storeId: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: sessionData } = await supabase
      .from('cash_sessions')
      .select('id')
      .eq('store_id', storeId)
      .eq('status', 'open')
      .gte('opened_at', today.toISOString())
      .maybeSingle();

    return sessionData?.id || null;
  };

  const handleFinalize = async () => {
    if (!foundOrder) return;

    if (foundOrder.status === 'delivered') {
      toast.error('Esta O.S. já foi entregue');
      return;
    }

    // Validate warranty selection if warranty type
    if (deliveryType === 'warranty') {
      const warrantyDays = parseInt(warrantyTime);
      if (warrantyDays === 0) {
        toast.error('Selecione um tempo de garantia válido');
        return;
      }
    }

    setIsFinalizing(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Usuário não autenticado');
        setIsFinalizing(false);
        return;
      }

      const cashSessionId = foundOrder.store_id ? await getCashSession(foundOrder.store_id) : null;

      if (deliveryType === 'with_repair') {
        // Com reparo: remaining value goes to cash
        const remainingVal = foundOrder.remaining_value;

        const { error: updateError } = await supabase
          .from('service_orders')
          .update({
            status: 'delivered',
            remaining_value: 0,
            payment_method: paymentMethod,
          })
          .eq('id', foundOrder.id);

        if (updateError) throw updateError;

        // Register remaining value in cash
        if (remainingVal > 0 && foundOrder.store_id) {
          const transactionData = {
            type: 'income',
            amount: remainingVal,
            description: `O.S. #${foundOrder.order_number} - ${foundOrder.client?.name || 'Cliente'} (Valor Restante)`,
            payment_method: paymentMethod,
            service_order_id: foundOrder.id,
            created_by: userData.user.id,
            store_id: foundOrder.store_id,
            cash_session_id: cashSessionId,
          };

          const { error: cashError } = await supabase
            .from('cash_transactions')
            .insert(transactionData);

          if (cashError) {
            console.error('Error registering cash entry:', cashError);
            toast.warning('Entrega realizada, mas houve erro ao registrar no caixa');
          } else {
            toast.success('Entrega realizada e valor registrado no caixa!');
          }
        } else {
          toast.success('Entrega realizada com sucesso!');
        }
      } else if (deliveryType === 'without_repair' || deliveryType === 'warranty') {
        // Sem reparo ou Garantia: values zeroed, NO cash refund - just notification
        const entryVal = foundOrder.entry_value;

        const { error: updateError } = await supabase
          .from('service_orders')
          .update({
            status: deliveryType === 'warranty' ? 'warranty' : 'delivered',
            service_value: 0,
            entry_value: 0,
            remaining_value: 0,
          })
          .eq('id', foundOrder.id);

        if (updateError) throw updateError;

        // If there's an entry value to refund, send notification to admin instead of cash transaction
        if (entryVal > 0) {
          const refundReason = deliveryType === 'warranty' ? 'Garantia' : 'Sem reparo';
          
          // Create admin notification about refund
          const { error: notifError } = await supabase
            .from('admin_notifications')
            .insert({
              type: 'refund_required',
              title: 'Estorno Pendente',
              message: `A O.S. #${foundOrder.order_number} (${foundOrder.client?.name || 'Cliente'}) necessita de estorno de R$ ${entryVal.toFixed(2)} - Motivo: ${refundReason}. Informe ao financeiro.`,
              reference_id: foundOrder.id,
            });

          if (notifError) {
            console.error('Error creating refund notification:', notifError);
          }

          // Store refund info in state for PDF download
          setLastRefundInfo({
            orderNumber: foundOrder.order_number,
            clientName: foundOrder.client?.name || 'Cliente',
            clientPhone: foundOrder.client?.phone || '',
            device: `${foundOrder.brand?.name || ''} ${foundOrder.model?.name || ''}`,
            deviceColor: foundOrder.device_color,
            refundAmount: entryVal,
            reason: refundReason,
            date: new Date(),
            executedBy: userData.user.email || '',
          });

          const warrantyDays = parseInt(warrantyTime);
          if (deliveryType === 'warranty') {
            toast.success(`Garantia de ${warrantyDays} dias ativada! Notificação de estorno enviada.`);
          } else {
            toast.success(`Entrega sem reparo finalizada! Notificação de estorno enviada.`);
          }
        } else {
          if (deliveryType === 'warranty') {
            const warrantyDays = parseInt(warrantyTime);
            toast.success(`Garantia de ${warrantyDays} dias ativada!`);
          } else {
            toast.success('Entrega sem reparo finalizada!');
          }
        }
      }

      // Reset state
      setFoundOrder(null);
      setSearchCode('');
      setExpanded(false);
      setDeliveryType('with_repair');
    } catch (error: any) {
      console.error('Error finalizing delivery:', error);
      toast.error('Erro ao finalizar entrega: ' + error.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      quote: 'Orçamento',
      in_progress: 'Em Execução',
      waiting_part: 'Aguardando Peça',
      delayed: 'Em Atraso',
      warranty: 'Em Garantia',
      completed: 'Concluído',
      delivered: 'Entregue',
    };
    return statusMap[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colorMap: Record<string, string> = {
      quote: 'text-warning',
      in_progress: 'text-primary',
      waiting_part: 'text-orange-500',
      delayed: 'text-destructive',
      warranty: 'text-purple-500',
      completed: 'text-success',
      delivered: 'text-muted-foreground',
    };
    return colorMap[status] || 'text-foreground';
  };

  return (
    <AppLayout>
      <div className="animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold text-foreground">ENTREGAS</h1>
              <p className="text-sm text-muted-foreground">Finalizar e gerenciar entregas</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Search */}
          <div className="space-y-3">
            <Label className="section-header uppercase">BUSCAR O.S.</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Digite o código da O.S. (ex: 00001)"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                className="flex-1 uppercase"
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                {isSearching ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Found Order */}
          {foundOrder && (
            <Card className="glass-card border-primary/30">
              <CardHeader
                className="cursor-pointer"
                onClick={() => setExpanded(!expanded)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">O.S. #{foundOrder.order_number}</CardTitle>
                    <p className="text-sm text-muted-foreground">{foundOrder.client?.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium ${getStatusColor(foundOrder.status)}`}>
                      {getStatusLabel(foundOrder.status)}
                    </span>
                    {expanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </CardHeader>

              {expanded && (
                <CardContent className="space-y-4 pt-0">
                  {/* Order Details */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dispositivo:</span>
                      <span className="font-medium">{foundOrder.brand?.name} {foundOrder.model?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cor:</span>
                      <span className="font-medium">{foundOrder.device_color}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{foundOrder.client?.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serviço:</span>
                      <span className="font-medium">{foundOrder.possible_service}</span>
                    </div>
                    <div className="border-t border-border pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor Total:</span>
                        <span className="font-medium">R$ {foundOrder.service_value.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Entrada:</span>
                        <span className="font-medium">R$ {foundOrder.entry_value.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold">
                        <span className="text-primary">Restante:</span>
                        <span className="text-primary">R$ {foundOrder.remaining_value.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Linked Order Info - Warranty indicator */}
                    {foundOrder.linked_order && (
                      <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3 mt-2">
                        <div className="flex items-center gap-2 text-purple-500">
                          <Shield className="w-4 h-4" />
                          <span className="font-medium text-sm">O.S. DE GARANTIA</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Vinculada à O.S. #{foundOrder.linked_order.order_number}
                        </p>
                        <p className="text-xs text-purple-400 mt-1">
                          Esta entrega não gera custos ou receitas
                        </p>
                      </div>
                    )}

                    {/* Executed Service */}
                    <div className="space-y-2 border-t border-border pt-3">
                      <Label className="uppercase text-xs font-medium">SERVIÇO EXECUTADO</Label>
                      <Input
                        value={executedService}
                        onChange={(e) => setExecutedService(e.target.value.toUpperCase())}
                        placeholder="DESCREVA O SERVIÇO EXECUTADO"
                        className="uppercase"
                      />
                    </div>

                    {/* Delivery Type Selection */}
                    {foundOrder.status !== 'delivered' && (
                      <div className="space-y-2 border-t border-border pt-3">
                        <Label className="uppercase text-xs font-medium">TIPO DE ENTREGA</Label>
                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => setDeliveryType('with_repair')}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all",
                              deliveryType === 'with_repair'
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background hover:border-primary/50"
                            )}
                          >
                            <Wrench className="w-5 h-5" />
                            <span className="text-xs font-medium">COM REPARO</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryType('without_repair')}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all",
                              deliveryType === 'without_repair'
                                ? "border-destructive bg-destructive/10 text-destructive"
                                : "border-border bg-background hover:border-destructive/50"
                            )}
                          >
                            <XCircle className="w-5 h-5" />
                            <span className="text-xs font-medium">SEM REPARO</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeliveryType('warranty')}
                            className={cn(
                              "flex flex-col items-center justify-center gap-1 p-3 rounded-lg border-2 transition-all",
                              deliveryType === 'warranty'
                                ? "border-purple-500 bg-purple-500/10 text-purple-500"
                                : "border-border bg-background hover:border-purple-500/50"
                            )}
                          >
                            <Shield className="w-5 h-5" />
                            <span className="text-xs font-medium">GARANTIA</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {foundOrder.status !== 'delivered' && (
                    <>
                      {/* Payment and Warranty Selection - Side by Side */}
                      <div className={cn(
                        "grid gap-3",
                        deliveryType === 'with_repair' && foundOrder.remaining_value > 0 ? 'grid-cols-2' : 'grid-cols-1'
                      )}>
                        {/* Payment Method - Only for with_repair */}
                        {deliveryType === 'with_repair' && foundOrder.remaining_value > 0 && (
                          <div className="space-y-2">
                            <Label className="uppercase text-xs font-medium h-4 flex items-center">PAGAMENTO</Label>
                            <TwoClickSelect
                              options={paymentMethods}
                              value={paymentMethod}
                              onValueChange={setPaymentMethod}
                              placeholder="SELECIONE"
                            />
                          </div>
                        )}

                        {/* Warranty Selection - Only for warranty type */}
                        {deliveryType === 'warranty' && (
                          <div className="space-y-2">
                            <Label className="uppercase text-xs font-medium h-4 flex items-center gap-1">
                              <Shield className="w-3 h-3" />
                              GARANTIA
                            </Label>
                            <TwoClickSelect
                              options={warrantyTimeOptions}
                              value={warrantyTime}
                              onValueChange={setWarrantyTime}
                              placeholder="SELECIONE"
                            />
                          </div>
                        )}
                      </div>

                      {/* Finalize Button */}
                      <Button
                        variant={deliveryType === 'with_repair' ? 'default' : deliveryType === 'warranty' ? 'secondary' : 'destructive'}
                        size="lg"
                        className="w-full"
                        onClick={handleFinalize}
                        disabled={isFinalizing || (deliveryType === 'warranty' && warrantyTime === '0')}
                      >
                        {isFinalizing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            FINALIZANDO...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            FINALIZAR
                          </>
                        )}
                      </Button>
                    </>
                  )}

                  {foundOrder.status === 'delivered' && (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground">Esta O.S. já foi entregue</p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Refund Report Download */}
          {lastRefundInfo && (
            <Card className="border-warning/30 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-warning">Estorno Pendente</p>
                    <p className="text-sm text-muted-foreground">
                      O.S. #{lastRefundInfo.orderNumber} - R$ {lastRefundInfo.refundAmount.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateRefundPDF}
                    className="border-warning text-warning hover:bg-warning/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    BAIXAR PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {!foundOrder && !isSearching && !lastRefundInfo && (
            <div className="text-center py-12">
              <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                Busque uma O.S. pelo código para realizar a entrega
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
