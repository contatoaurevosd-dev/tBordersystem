import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Printer, 
  Usb, 
  Check, 
  X, 
  RefreshCw, 
  Zap,
  FileText,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import BematechNativePlugin from '@/services/bematechNativePlugin';

interface PrinterInfo {
  connected: boolean;
  model: string;
  vendorId?: number;
  productId?: number;
  deviceName?: string;
  firmwareVersion?: string;
}

type ConnectionMethod = 'none' | 'native' | 'capacitor' | 'webusb';

export default function PrinterPage() {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();
  
  const [printerInfo, setPrinterInfo] = useState<PrinterInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [connectionMethod, setConnectionMethod] = useState<ConnectionMethod>('none');
  const [customText, setCustomText] = useState('');
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('pt-BR');
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 49)]);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
    if (!loading && userRole !== 'admin') {
      navigate('/');
      toast.error('Acesso restrito a administradores');
    }
  }, [user, userRole, loading, navigate]);

  useEffect(() => {
    checkPrinterStatus();
  }, []);

  const checkPrinterStatus = async () => {
    try {
      addLog('Verificando status da impressora...');
      
      // Tentar plugin nativo primeiro
      const result = await BematechNativePlugin.isConnected();
      if (result.connected) {
        const info = await BematechNativePlugin.getPrinterInfo();
        setPrinterInfo(info);
        setConnectionMethod('native');
        addLog(`✓ Conectado via SDK Nativo: ${info.model}`);
      } else {
        setPrinterInfo(null);
        setConnectionMethod('none');
        addLog('Impressora desconectada');
      }
    } catch (error) {
      addLog('SDK Nativo não disponível, usando fallback');
      setPrinterInfo(null);
      setConnectionMethod('none');
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    addLog('=== INICIANDO CONEXÃO ===');
    
    try {
      // Inicializar plugin
      addLog('Inicializando plugin...');
      const initResult = await BematechNativePlugin.initialize();
      addLog(`Init: ${initResult.success ? '✓ OK' : '✗ FALHOU'} - ${initResult.error || ''}`);
      
      // Conectar
      addLog('Conectando à impressora...');
      const connectResult = await BematechNativePlugin.connect();
      
      if (connectResult.success && connectResult.printerInfo) {
        const info = connectResult.printerInfo;
        setPrinterInfo({
          connected: info.connected,
          model: info.model,
          vendorId: (info as any).vendorId,
          productId: (info as any).productId,
          deviceName: (info as any).deviceName,
          firmwareVersion: info.firmwareVersion
        });
        setConnectionMethod('native');
        addLog(`✓ CONECTADO: ${info.model}`);
        addLog(`VID: 0x${((info as any).vendorId || 0).toString(16).toUpperCase()}`);
        addLog(`PID: 0x${((info as any).productId || 0).toString(16).toUpperCase()}`);
        toast.success('Impressora conectada com sucesso!');
      } else {
        addLog(`✗ FALHA: ${connectResult.error}`);
        toast.error(connectResult.error || 'Falha na conexão');
      }
    } catch (error: any) {
      addLog(`✗ ERRO: ${error.message}`);
      toast.error(error.message || 'Erro ao conectar');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      addLog('Desconectando...');
      await BematechNativePlugin.disconnect();
      setPrinterInfo(null);
      setConnectionMethod('none');
      addLog('✓ Desconectado');
      toast.success('Impressora desconectada');
    } catch (error: any) {
      addLog(`✗ Erro: ${error.message}`);
    }
  };

  const handleTestPrint = async () => {
    if (!printerInfo?.connected) {
      toast.error('Impressora não conectada');
      return;
    }
    
    setIsPrinting(true);
    addLog('Executando teste de impressão...');
    
    try {
      const result = await BematechNativePlugin.testPrint();
      
      if (result.success) {
        addLog('✓ Teste impresso com sucesso');
        toast.success('Teste impresso!');
      } else {
        addLog(`✗ Falha: ${result.error}`);
        toast.error(result.error || 'Falha ao imprimir');
      }
    } catch (error: any) {
      addLog(`✗ Erro: ${error.message}`);
      toast.error(error.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintCustom = async () => {
    if (!printerInfo?.connected) {
      toast.error('Impressora não conectada');
      return;
    }
    
    if (!customText.trim()) {
      toast.error('Digite o texto para imprimir');
      return;
    }
    
    setIsPrinting(true);
    addLog('Imprimindo texto personalizado...');
    
    try {
      // Comandos ESC/POS
      const ESC = '\x1B';
      const GS = '\x1D';
      
      let content = '';
      content += ESC + '@'; // Init
      content += ESC + 'a' + '\x01'; // Center
      content += ESC + 'E' + '\x01'; // Bold on
      content += '=== IMPRESSAO LOCAL ===\n';
      content += ESC + 'E' + '\x00'; // Bold off
      content += ESC + 'a' + '\x00'; // Left
      content += '\n';
      content += customText;
      content += '\n\n\n';
      content += GS + 'V' + 'A' + '\x10'; // Cut
      
      const result = await BematechNativePlugin.sendEscPos({ command: content });
      
      if (result.success) {
        addLog(`✓ Impresso: ${result.bytesTransferred} bytes`);
        toast.success('Texto impresso!');
        setCustomText('');
      } else {
        addLog(`✗ Falha: ${result.error}`);
        toast.error(result.error || 'Falha ao imprimir');
      }
    } catch (error: any) {
      addLog(`✗ Erro: ${error.message}`);
      toast.error(error.message);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenDrawer = async () => {
    if (!printerInfo?.connected) {
      toast.error('Impressora não conectada');
      return;
    }
    
    try {
      addLog('Abrindo gaveta...');
      const result = await BematechNativePlugin.openCashDrawer();
      
      if (result.success) {
        addLog('✓ Gaveta aberta');
        toast.success('Gaveta aberta!');
      } else {
        addLog(`✗ Falha: ${result.error}`);
        toast.error(result.error || 'Falha ao abrir gaveta');
      }
    } catch (error: any) {
      addLog(`✗ Erro: ${error.message}`);
      toast.error(error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || userRole !== 'admin') return null;

  const isConnected = printerInfo?.connected;

  return (
    <AppLayout>
      <div className="p-4 space-y-4 pb-24 animate-fade-in">
        {/* Header */}
        <div className="pt-2">
          <h1 className="text-2xl font-bold text-foreground">IMPRESSORA LOCAL</h1>
          <p className="text-sm text-muted-foreground">
            Conexão direta USB - Impressão local
          </p>
        </div>

        {/* Status Card */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Printer className="w-5 h-5" />
                STATUS
              </CardTitle>
              <Badge 
                variant={isConnected ? "default" : "secondary"}
                className={isConnected ? "bg-green-600" : "bg-destructive"}
              >
                {isConnected ? (
                  <><Wifi className="w-3 h-3 mr-1" /> CONECTADA</>
                ) : (
                  <><WifiOff className="w-3 h-3 mr-1" /> DESCONECTADA</>
                )}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {isConnected && printerInfo ? (
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-muted-foreground">Modelo:</div>
                <div className="font-medium">{printerInfo.model}</div>
                
                <div className="text-muted-foreground">VID:</div>
                <div className="font-mono">0x{printerInfo.vendorId?.toString(16).toUpperCase()}</div>
                
                <div className="text-muted-foreground">PID:</div>
                <div className="font-mono">0x{printerInfo.productId?.toString(16).toUpperCase()}</div>
                
                <div className="text-muted-foreground">Método:</div>
                <div className="font-medium text-primary">{connectionMethod.toUpperCase()}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertCircle className="w-4 h-4" />
                <span>Nenhuma impressora conectada</span>
              </div>
            )}

            {/* Connection Buttons */}
            <div className="flex gap-2 pt-2">
              {!isConnected ? (
                <Button 
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="flex-1"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Usb className="w-4 h-4 mr-2" />
                  )}
                  {isConnecting ? 'CONECTANDO...' : 'CONECTAR USB'}
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline"
                    onClick={checkPrinterStatus}
                    className="flex-1"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    ATUALIZAR
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={handleDisconnect}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Print Actions */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Zap className="w-5 h-5" />
              AÇÕES DE IMPRESSÃO
            </CardTitle>
            <CardDescription>
              Comandos diretos para a impressora
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={handleTestPrint}
                disabled={!isConnected || isPrinting}
                className="h-12"
              >
                <FileText className="w-4 h-4 mr-2" />
                TESTE
              </Button>
              <Button
                variant="outline"
                onClick={handleOpenDrawer}
                disabled={!isConnected || isPrinting}
                className="h-12"
              >
                <Check className="w-4 h-4 mr-2" />
                GAVETA
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Custom Print */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="w-5 h-5" />
              IMPRIMIR TEXTO
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Digite o texto para imprimir..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              className="min-h-[100px] uppercase"
            />
            <Button
              onClick={handlePrintCustom}
              disabled={!isConnected || isPrinting || !customText.trim()}
              className="w-full"
            >
              {isPrinting ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-2" />
              )}
              {isPrinting ? 'IMPRIMINDO...' : 'IMPRIMIR'}
            </Button>
          </CardContent>
        </Card>

        {/* Logs */}
        <Card className="border-border/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">LOGS</CardTitle>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setLogs([])}
              >
                LIMPAR
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs space-y-1">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">Nenhum log ainda...</div>
              ) : (
                logs.map((log, i) => (
                  <div 
                    key={i} 
                    className={
                      log.includes('✓') ? 'text-green-500' :
                      log.includes('✗') ? 'text-destructive' :
                      log.includes('===') ? 'text-primary font-bold' :
                      'text-foreground'
                    }
                  >
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
