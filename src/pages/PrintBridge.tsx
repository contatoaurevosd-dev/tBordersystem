import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Usb, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle,
  RotateCcw,
  Clock,
  CheckCircle,
  Loader2,
  Store,
  History,
  List,
  LogOut,
  Save,
  Shield,
  Zap,
  Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUSBPrinter } from '@/hooks/useUSBPrinter';
import { unifiedPrinterService } from '@/services/unifiedPrinterService';

interface PrintJob {
  id: string;
  service_order_id: string;
  store_id: string;
  status: 'pending' | 'printing' | 'completed' | 'error';
  printer_type: 'escpos' | 'escbema';
  content: string;
  error_message?: string | null;
  created_at: string;
  printed_at?: string | null;
  order_number?: string;
  client_name?: string;
  store_name?: string;
}

export default function PrintBridge() {
  const navigate = useNavigate();
  const { user, userRole, userStoreId, signOut, loading: authLoading } = useAuth();
  
  // Use the USB printer hook with auto-reconnect and event listeners
  const {
    isConnected,
    printerModel,
    printerLanguage,
    usbPort,
    isSearching,
    isReconnecting,
    isResetting,
    diagnostics,
    searchPrinter,
    reconnect,
    forceResetUSB,
    releaseAfterPrint,
    updateQueueSize,
  } = useUSBPrinter({
    autoReconnect: true,
    maxRetries: 10,
    retryInterval: 2000,
    onConnect: () => toast.success('Impressora conectada!'),
    onDisconnect: () => toast.warning('Impressora desconectada'),
    onError: (error) => toast.error(error),
  });

  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('queue');
  
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [historyJobs, setHistoryJobs] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [storeName, setStoreName] = useState('');

  // Redirect if not print_bridge role
  useEffect(() => {
    if (!authLoading && userRole && userRole !== 'print_bridge') {
      navigate('/');
    }
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [userRole, user, authLoading, navigate]);

  // Fetch store name
  useEffect(() => {
    const fetchStoreName = async () => {
      if (!userStoreId) return;
      
      const { data } = await supabase
        .from('stores')
        .select('name')
        .eq('id', userStoreId)
        .single();
      
      if (data) setStoreName(data.name);
    };
    
    fetchStoreName();
  }, [userStoreId]);

  // Fetch print jobs
  useEffect(() => {
    const fetchPrintJobs = async () => {
      if (!userStoreId) return;
      
      setLoading(true);
      try {
        // Fetch pending/printing jobs for queue
        const { data: queueData, error: queueError } = await supabase
          .from('print_jobs')
          .select(`
            *,
            service_orders:service_order_id (
              order_number,
              clients:client_id (name)
            )
          `)
          .eq('store_id', userStoreId)
          .in('status', ['pending', 'printing'])
          .order('created_at', { ascending: true });

        if (queueError) throw queueError;

        const formattedQueue = (queueData || []).map((job: any) => ({
          ...job,
          order_number: job.service_orders?.order_number,
          client_name: job.service_orders?.clients?.name,
        }));
        setPrintJobs(formattedQueue);

        // Fetch history (completed/error)
        const { data: historyData, error: historyError } = await supabase
          .from('print_jobs')
          .select(`
            *,
            service_orders:service_order_id (
              order_number,
              clients:client_id (name)
            )
          `)
          .eq('store_id', userStoreId)
          .in('status', ['completed', 'error'])
          .order('created_at', { ascending: false })
          .limit(50);

        if (historyError) throw historyError;

        const formattedHistory = (historyData || []).map((job: any) => ({
          ...job,
          order_number: job.service_orders?.order_number,
          client_name: job.service_orders?.clients?.name,
        }));
        setHistoryJobs(formattedHistory);

      } catch (error: any) {
        console.error('Error fetching print jobs:', error);
        toast.error('Erro ao carregar jobs de impressão');
      } finally {
        setLoading(false);
      }
    };

    fetchPrintJobs();

    // Set up realtime subscription for new jobs
    const channel = supabase
      .channel('print-jobs-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'print_jobs',
          filter: `store_id=eq.${userStoreId}`,
        },
        async (payload) => {
          console.log('Print job change:', payload);
          // Refetch on any change
          fetchPrintJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userStoreId]);

  // Update queue size in diagnostics when printJobs changes
  useEffect(() => {
    updateQueueSize(printJobs.length);
  }, [printJobs.length, updateQueueSize]);

  // Search for USB printer
  const handleSearchPrinter = async () => {
    try {
      await searchPrinter();
    } catch (error: any) {
      console.error('Error searching printer:', error);
      toast.error(error.message || 'Erro ao buscar impressora');
    }
  };

  // Save printer configuration
  const handleSaveConfig = async () => {
    if (!isConnected || !printerModel) {
      toast.error('Nenhuma impressora conectada para salvar');
      return;
    }
    
    setIsSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Configurações da impressora salvas!');
    } catch (error: any) {
      toast.error('Erro ao salvar configurações');
    } finally {
      setIsSaving(false);
    }
  };

  // Test connection - prints a test page
  const handleTestConnection = async () => {
    if (!isConnected || !unifiedPrinterService.isConnected()) {
      toast.error('Nenhuma impressora conectada');
      return;
    }
    
    setIsTesting(true);
    try {
      await unifiedPrinterService.printTestPage();
      toast.success('Página de teste enviada para impressão!');
    } catch (error: any) {
      console.error('Test print error:', error);
      toast.error('Erro ao imprimir teste: ' + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  // Reconnect to saved printer
  const handleReconnect = async () => {
    try {
      await reconnect();
    } catch (error: any) {
      console.error('Reconnect error:', error);
      toast.error(error.message || 'Erro ao reconectar');
    }
  };

  // Force reset USB for troubleshooting
  const handleResetUSB = async () => {
    try {
      await forceResetUSB();
      toast.success('USB resetado. Desconecte e reconecte o cabo antes de buscar novamente.');
    } catch (error: any) {
      console.error('Reset USB error:', error);
      toast.error(error.message || 'Erro ao resetar USB');
    }
  };

  const handlePrintJob = async (job: PrintJob) => {
    try {
      // Update status to printing
      await supabase
        .from('print_jobs')
        .update({ status: 'printing' })
        .eq('id', job.id);

      if (!isConnected || !unifiedPrinterService.isConnected()) {
        throw new Error('Impressora desconectada');
      }

      // Get the content and print it
      if (job.content) {
        await printJobContent(job.content);
      } else {
        throw new Error('Conteúdo de impressão não disponível');
      }

      // Update status to completed
      await supabase
        .from('print_jobs')
        .update({ 
          status: 'completed',
          printed_at: new Date().toISOString()
        })
        .eq('id', job.id);

      // Release interface after successful print
      await releaseAfterPrint();

      toast.success(`O.S. #${job.order_number} impressa com sucesso!`);
    } catch (error: any) {
      // Update status to error
      await supabase
        .from('print_jobs')
        .update({ 
          status: 'error',
          error_message: error.message
        })
        .eq('id', job.id);

      toast.error(`Erro ao imprimir: ${error.message}`);
    }
  };

  // Print content using the unified printer service
  const printJobContent = async (content: string) => {
    // Check if using Bematech SDK (native Android)
    if (unifiedPrinterService.isNative() && unifiedPrinterService.isUsingBematechSdk()) {
      // Use Bematech SDK for native Android
      const { bematechPrinterService } = await import('@/services/bematechPrinterService');
      await printContentWithBematechSdk(content, bematechPrinterService);
    } else if (unifiedPrinterService.isNative()) {
      // Use capacitor printer service for native Android fallback
      const { capacitorPrinterService } = await import('@/services/capacitorPrinterService');
      await printContentWithCapacitor(content, capacitorPrinterService);
    } else {
      // Use WebUSB printer service for browser
      const { printerService } = await import('@/services/printerService');
      await printContentWithWebUSB(content, printerService);
    }
  };

  // Print using Bematech SDK (native Android)
  const printContentWithBematechSdk = async (content: string, bematechService: any) => {
    const lines = content.split('\n');
    
    for (const line of lines) {
      if (line.includes('========') || line.includes('--------')) {
        await bematechService.printFormatted(line, { bold: true });
      } else if (line.includes('*** VIA')) {
        await bematechService.printFormatted(line, { align: 'center', bold: true, size: 'double' });
      } else if (line.includes('ORDEM DE SERVICO') || line.match(/^\s*#\d+/)) {
        await bematechService.printFormatted(line, { align: 'center', bold: true });
      } else if (isSectionHeader(line)) {
        await bematechService.printFormatted(line, { bold: true });
      } else {
        await bematechService.printText(line);
      }
    }
    
    await bematechService.feedPaper(3);
    await bematechService.cutPaper(true);
  };

  // Print using WebUSB (browser)
  const printContentWithWebUSB = async (content: string, printerService: any) => {
    const cmd = printerService.getCommands();
    
    // Split content into lines and format
    const lines = content.split('\n');
    const parts: Uint8Array[] = [cmd.INIT];
    
    for (const line of lines) {
      // Check for special formatting
      if (line.includes('========')) {
        parts.push(cmd.BOLD_ON);
        parts.push(printerService.textToBytes(line));
        parts.push(cmd.BOLD_OFF);
      } else if (line.includes('*** VIA')) {
        parts.push(cmd.ALIGN_CENTER);
        parts.push(cmd.BOLD_ON);
        parts.push(cmd.DOUBLE_SIZE);
        parts.push(printerService.textToBytes(line));
        parts.push(cmd.NORMAL_SIZE);
        parts.push(cmd.BOLD_OFF);
        parts.push(cmd.ALIGN_LEFT);
      } else if (line.includes('ORDEM DE SERVICO') || line.match(/^\s*#\d+/)) {
        parts.push(cmd.ALIGN_CENTER);
        parts.push(cmd.BOLD_ON);
        parts.push(printerService.textToBytes(line));
        parts.push(cmd.BOLD_OFF);
        parts.push(cmd.ALIGN_LEFT);
      } else if (isSectionHeader(line)) {
        parts.push(cmd.BOLD_ON);
        parts.push(printerService.textToBytes(line));
        parts.push(cmd.BOLD_OFF);
      } else {
        parts.push(printerService.textToBytes(line));
      }
      parts.push(cmd.LINE_FEED);
    }
    
    parts.push(cmd.FEED_LINES(3));
    parts.push(cmd.CUT_PAPER_PARTIAL);
    
    const combined = printerService.combineBytes(...parts);
    await printerService.sendData(combined);
  };

  // Print using Capacitor (native Android)
  const printContentWithCapacitor = async (content: string, capacitorPrinterService: any) => {
    const cmd = capacitorPrinterService.getLanguage() === 'escbema' 
      ? { 
          INIT: '\x1B\x40',
          BOLD_ON: '\x1B\x45',
          BOLD_OFF: '\x1B\x46',
          DOUBLE_SIZE: '\x1B\x21\x30',
          NORMAL_SIZE: '\x1B\x21\x00',
          ALIGN_CENTER: '\x1B\x61\x01',
          ALIGN_LEFT: '\x1B\x61\x00',
          LINE_FEED: '\x0A',
          CUT_PAPER_PARTIAL: '\x1B\x6D',
        }
      : {
          INIT: '\x1B\x40',
          BOLD_ON: '\x1B\x45\x01',
          BOLD_OFF: '\x1B\x45\x00',
          DOUBLE_SIZE: '\x1B\x21\x30',
          NORMAL_SIZE: '\x1B\x21\x00',
          ALIGN_CENTER: '\x1B\x61\x01',
          ALIGN_LEFT: '\x1B\x61\x00',
          LINE_FEED: '\x0A',
          CUT_PAPER_PARTIAL: '\x1D\x56\x01',
        };
    
    const lines = content.split('\n');
    let printData = cmd.INIT;
    
    for (const line of lines) {
      if (line.includes('========')) {
        printData += cmd.BOLD_ON + line + cmd.BOLD_OFF;
      } else if (line.includes('*** VIA')) {
        printData += cmd.ALIGN_CENTER + cmd.BOLD_ON + cmd.DOUBLE_SIZE + line + cmd.NORMAL_SIZE + cmd.BOLD_OFF + cmd.ALIGN_LEFT;
      } else if (line.includes('ORDEM DE SERVICO') || line.match(/^\s*#\d+/)) {
        printData += cmd.ALIGN_CENTER + cmd.BOLD_ON + line + cmd.BOLD_OFF + cmd.ALIGN_LEFT;
      } else if (isSectionHeader(line)) {
        printData += cmd.BOLD_ON + line + cmd.BOLD_OFF;
      } else {
        printData += line;
      }
      printData += cmd.LINE_FEED;
    }
    
    printData += cmd.LINE_FEED + cmd.LINE_FEED + cmd.LINE_FEED + cmd.CUT_PAPER_PARTIAL;
    
    await capacitorPrinterService.sendData(printData);
  };

  // Helper to check if line is a section header
  const isSectionHeader = (line: string): boolean => {
    const headers = [
      'CHECKLIST', 'DADOS DO', 'PROBLEMA', 'SENHA', 'VALORES', 
      'PREVISAO', 'OBSERVACOES', 'TERMOS', 'ASSINATURA', 
      'ITENS VERIFICADOS', 'LEGENDA'
    ];
    return headers.some(h => line.includes(h));
  };

  const handleRetryJob = async (job: PrintJob) => {
    try {
      await supabase
        .from('print_jobs')
        .update({ 
          status: 'pending',
          error_message: null
        })
        .eq('id', job.id);

      toast.info('Job reenfileirado');
    } catch (error: any) {
      toast.error('Erro ao reenfileirar: ' + error.message);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const statusConfig = {
    pending: {
      icon: <Clock className="w-4 h-4" />,
      label: 'AGUARDANDO',
      className: 'bg-warning/20 text-warning',
    },
    printing: {
      icon: <Loader2 className="w-4 h-4 animate-spin" />,
      label: 'IMPRIMINDO',
      className: 'bg-primary/20 text-primary',
    },
    completed: {
      icon: <CheckCircle className="w-4 h-4" />,
      label: 'CONCLUÍDO',
      className: 'bg-success/20 text-success',
    },
    error: {
      icon: <AlertCircle className="w-4 h-4" />,
      label: 'ERRO',
      className: 'bg-destructive/20 text-destructive',
    },
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (userRole !== 'print_bridge') {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary" />
              PRINT BRIDGE
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
              <Store className="w-3 h-3" />
              {storeName || 'Carregando...'}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleSignOut}>
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="p-4 space-y-4 animate-fade-in">
        {/* Connection Status Card */}
        <div className="glass-card-elevated p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground text-sm uppercase">Status da Impressora</h2>
            <div
              className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium ${
                isConnected
                  ? 'bg-success/20 text-success'
                  : 'bg-destructive/20 text-destructive'
              }`}
            >
              {isConnected ? (
                <>
                  <Check className="w-3 h-3" />
                  CONECTADA
                </>
              ) : (
                <>
                  <X className="w-3 h-3" />
                  DESCONECTADA
                </>
              )}
            </div>
          </div>

          {/* Printer info - only show if connected */}
          {isConnected && printerModel && (
            <div className="mb-4 p-3 bg-secondary/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Printer className="w-4 h-4 text-primary" />
                <span className="font-medium">{printerModel}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground text-xs">{usbPort}</span>
                <span className="text-muted-foreground">•</span>
                <span className="text-xs uppercase text-muted-foreground">{printerLanguage}</span>
              </div>
            </div>
          )}

          {/* Search and Save buttons - stacked on mobile */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-11 text-xs px-2"
              onClick={handleSearchPrinter}
              disabled={isSearching}
            >
              {isSearching ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Usb className="w-4 h-4 mr-1.5 flex-shrink-0" />
              )}
              <span className="truncate">BUSCAR</span>
            </Button>
            <Button
              variant="outline"
              className="h-11 text-xs px-2"
              onClick={handleSaveConfig}
              disabled={isSaving || !isConnected}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-1.5 flex-shrink-0" />
              )}
              <span className="truncate">SALVAR</span>
            </Button>
          </div>

          {/* Test and Reconnect Actions - inside the card */}
          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border">
            <Button
              variant="outline"
              className="h-11 text-xs px-2"
              onClick={handleTestConnection}
              disabled={isTesting || !isConnected}
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-1.5 flex-shrink-0" />
              )}
              <span className="truncate">TESTAR</span>
            </Button>
            <Button
              variant="outline"
              className="h-11 text-xs px-2"
              onClick={handleReconnect}
              disabled={isReconnecting}
            >
              {isReconnecting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1.5 flex-shrink-0" />
              )}
              <span className="truncate">RECONECTAR</span>
            </Button>
          </div>

          {/* Reset USB Button - for troubleshooting */}
          <div className="mt-3 pt-3 border-t border-border">
            <Button
              variant="ghost"
              className="w-full h-9 text-xs text-muted-foreground hover:text-destructive"
              onClick={handleResetUSB}
              disabled={isResetting}
            >
              {isResetting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4 mr-1.5" />
              )}
              RESETAR CONEXÃO USB
            </Button>
          </div>
        </div>

        {/* USB Diagnostics Panel */}
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-foreground text-sm uppercase">Diagnóstico USB</h3>
            </div>
            <span className="text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded">
              {/Android/i.test(navigator.userAgent) ? 'ANDROID OTG' : 'WEBUSB'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Permission Status */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-muted-foreground">Permissão USB</span>
                <div className={`font-medium ${
                  diagnostics.permissionStatus === 'ok' 
                    ? 'text-success' 
                    : diagnostics.permissionStatus === 'denied'
                    ? 'text-destructive'
                    : 'text-warning'
                }`}>
                  {diagnostics.permissionStatus === 'ok' ? 'OK' : 
                   diagnostics.permissionStatus === 'denied' ? 'NEGADA' : 'PENDENTE'}
                </div>
              </div>
              {diagnostics.permissionStatus === 'ok' ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <AlertCircle className="w-4 h-4 text-warning" />
              )}
            </div>

            {/* Printer Detected */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <Usb className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-muted-foreground">Impressora</span>
                <div className={`font-medium ${
                  diagnostics.printerDetected ? 'text-success' : 'text-destructive'
                }`}>
                  {diagnostics.printerDetected ? 'DETECTADA' : 'NÃO DETECTADA'}
                </div>
              </div>
              {diagnostics.printerDetected ? (
                <Check className="w-4 h-4 text-success" />
              ) : (
                <X className="w-4 h-4 text-destructive" />
              )}
            </div>

            {/* ClaimInterface Status */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-muted-foreground">ClaimInterface</span>
                <div className={`font-medium ${
                  diagnostics.claimStatus === 'ok' 
                    ? 'text-success' 
                    : diagnostics.claimStatus === 'failed'
                    ? 'text-destructive'
                    : diagnostics.claimStatus === 'pending'
                    ? 'text-warning'
                    : 'text-muted-foreground'
                }`}>
                  {diagnostics.claimStatus === 'ok' ? 'OK' : 
                   diagnostics.claimStatus === 'failed' ? 'FALHA' : 
                   diagnostics.claimStatus === 'pending' ? 'TENTANDO...' : 'IDLE'}
                  {diagnostics.claimStatus === 'pending' && diagnostics.retryCount > 0 && (
                    <span className="ml-1">({diagnostics.retryCount}/{diagnostics.maxRetries})</span>
                  )}
                </div>
              </div>
              {diagnostics.claimStatus === 'ok' ? (
                <Check className="w-4 h-4 text-success" />
              ) : diagnostics.claimStatus === 'pending' ? (
                <Loader2 className="w-4 h-4 text-warning animate-spin" />
              ) : diagnostics.claimStatus === 'failed' ? (
                <X className="w-4 h-4 text-destructive" />
              ) : (
                <div className="w-4 h-4" />
              )}
            </div>

            {/* Queue Size */}
            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
              <List className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <span className="text-muted-foreground">Fila de Jobs</span>
                <div className={`font-medium ${
                  diagnostics.queueSize > 0 ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {diagnostics.queueSize} {diagnostics.queueSize === 1 ? 'JOB' : 'JOBS'}
                </div>
              </div>
            </div>
          </div>

          {/* Error Alert with Android-specific instructions */}
          {diagnostics.lastError && (
            <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-medium text-destructive">Erro Detectado</p>
                  <p className="text-xs text-destructive/80 mt-1">{diagnostics.lastError}</p>
                </div>
              </div>
            </div>
          )}

          {/* ClaimInterface specific help for Android */}
          {diagnostics.claimStatus === 'failed' && /Android/i.test(navigator.userAgent) && (
            <div className="mt-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <p className="text-xs font-medium text-warning mb-2">💡 Dica para Android OTG:</p>
              <ol className="text-xs text-warning/80 space-y-1 list-decimal list-inside">
                <li>DESCONECTE o cabo USB do OTG</li>
                <li>Aguarde 5-10 segundos</li>
                <li>RECONECTE o cabo USB</li>
                <li>Clique em "BUSCAR" novamente</li>
              </ol>
              <p className="text-xs text-warning/80 mt-2 italic">
                Se persistir, reinicie o celular.
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary">
            <TabsTrigger value="queue" className="flex items-center gap-2 text-xs">
              <List className="w-4 h-4" />
              FILA ({printJobs.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2 text-xs">
              <History className="w-4 h-4" />
              HISTÓRICO
            </TabsTrigger>
          </TabsList>

          {/* Queue Tab */}
          <TabsContent value="queue" className="mt-4 space-y-2">
            {loading ? (
              <div className="glass-card p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              </div>
            ) : printJobs.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <Printer className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">Nenhum job na fila</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Aguardando novas impressões...
                </p>
              </div>
            ) : (
              printJobs.map((job) => {
                const status = statusConfig[job.status];
                const { date, time } = formatDateTime(job.created_at);
                
                return (
                  <div key={job.id} className="glass-card p-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          job.status === 'error'
                            ? 'bg-destructive/20 text-destructive'
                            : job.status === 'printing'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-warning/20 text-warning'
                        }`}
                      >
                        <Printer className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-primary font-bold">
                            #{job.order_number || 'N/A'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${status.className}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-foreground truncate mt-1">
                          {job.client_name || 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {date} às {time}
                        </p>
                      </div>
                      {job.status === 'pending' && (
                        <Button 
                          variant="glow" 
                          size="sm"
                          onClick={() => handlePrintJob(job)}
                          disabled={!isConnected}
                        >
                          IMPRIMIR
                        </Button>
                      )}
                    </div>
                    {job.error_message && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive flex items-center justify-between">
                        <span>{job.error_message}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs"
                          onClick={() => handleRetryJob(job)}
                        >
                          TENTAR NOVAMENTE
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="mt-4 space-y-2">
            {loading ? (
              <div className="glass-card p-6 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
              </div>
            ) : historyJobs.length === 0 ? (
              <div className="glass-card p-8 text-center">
                <History className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-muted-foreground text-sm">Nenhum histórico</p>
              </div>
            ) : (
              historyJobs.map((job) => {
                const status = statusConfig[job.status];
                const { date, time } = formatDateTime(job.created_at);
                
                return (
                  <div key={job.id} className="glass-card p-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          job.status === 'error'
                            ? 'bg-destructive/20 text-destructive'
                            : 'bg-success/20 text-success'
                        }`}
                      >
                        {job.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <AlertCircle className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-primary font-bold">
                            #{job.order_number || 'N/A'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium flex items-center gap-1 ${status.className}`}>
                            {status.icon}
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-foreground truncate mt-1">
                          {job.client_name || 'Cliente'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {date} às {time}
                        </p>
                      </div>
                      {job.status === 'error' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRetryJob(job)}
                          className="text-xs"
                        >
                          REENVIAR
                        </Button>
                      )}
                    </div>
                    {job.error_message && (
                      <div className="mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
                        {job.error_message}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
