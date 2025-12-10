import { useState, useEffect, useCallback, useRef } from 'react';
import { unifiedPrinterService } from '@/services/unifiedPrinterService';
import { usbPermissionManager } from '@/services/usbPermissionManager';

export interface USBDiagnostics {
  permissionStatus: 'ok' | 'pending' | 'denied';
  printerDetected: boolean;
  claimStatus: 'ok' | 'failed' | 'pending' | 'idle';
  queueSize: number;
  retryCount: number;
  maxRetries: number;
  lastError: string | null;
  isNative: boolean;
  connectionStatus: string;
}

interface UseUSBPrinterOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: string) => void;
  autoReconnect?: boolean;
  maxRetries?: number;
  retryInterval?: number;
}

export function useUSBPrinter(options: UseUSBPrinterOptions = {}) {
  const {
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    maxRetries = 15,
    retryInterval = 2500,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [printerModel, setPrinterModel] = useState<string | null>(null);
  const [printerLanguage, setPrinterLanguage] = useState<'escpos' | 'escbema'>('escpos');
  const [usbPort, setUsbPort] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [diagnostics, setDiagnostics] = useState<USBDiagnostics>({
    permissionStatus: 'pending',
    printerDetected: false,
    claimStatus: 'idle',
    queueSize: 0,
    retryCount: 0,
    maxRetries,
    lastError: null,
    isNative: unifiedPrinterService.isNative(),
    connectionStatus: 'disconnected',
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRetryingRef = useRef(false);

  // Clean up retry timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // Listen to connection state changes from UsbPermissionManager
  useEffect(() => {
    const unsubscribe = usbPermissionManager.onConnectionChange((status, error) => {
      console.log('[useUSBPrinter] Connection status changed:', status, error);
      
      const state = unifiedPrinterService.getConnectionState();
      
      setDiagnostics(prev => ({
        ...prev,
        connectionStatus: status,
        lastError: error || null,
        permissionStatus: state.permissionStatus === 'granted' ? 'ok' : 
                         state.permissionStatus === 'denied' ? 'denied' : 'pending',
        claimStatus: status === 'connected' ? 'ok' : 
                    status === 'error' ? 'failed' : 
                    status === 'connecting' ? 'pending' : 'idle',
      }));

      if (status === 'connected') {
        setIsConnected(true);
        setIsReconnecting(false);
        const deviceInfo = unifiedPrinterService.getDeviceInfo();
        if (deviceInfo) {
          setPrinterModel(deviceInfo.name);
          setUsbPort(deviceInfo.port);
          setPrinterLanguage(unifiedPrinterService.getLanguage());
        }
        onConnect?.();
      } else if (status === 'disconnected') {
        setIsConnected(false);
        setIsReconnecting(false);
        onDisconnect?.();
      } else if (status === 'error' && error) {
        setIsConnected(false);
        setIsReconnecting(false);
        onError?.(error);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onConnect, onDisconnect, onError]);

  // USB Device Events Listener
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('usb' in navigator)) return;
    
    const usb = navigator.usb as any;
    if (!usb || typeof usb.addEventListener !== 'function') {
      // WebUSB events not supported, just check existing devices
      checkExistingDevices();
      return;
    }

    const handleConnect = async (event: any) => {
      console.log('USB Device connected:', event.device);
      setDiagnostics(prev => ({ ...prev, printerDetected: true }));
      
      if (autoReconnect && !isConnected) {
        // Wait a moment for the device to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        handleAutoReconnect();
      }
    };

    const handleDisconnect = (event: any) => {
      console.log('USB Device disconnected:', event.device);
      setIsConnected(false);
      setPrinterModel(null);
      setUsbPort(null);
      setDiagnostics(prev => ({
        ...prev,
        printerDetected: false,
        claimStatus: 'idle',
        permissionStatus: 'pending',
      }));
      onDisconnect?.();
    };

    usb.addEventListener('connect', handleConnect);
    usb.addEventListener('disconnect', handleDisconnect);

    // Check for already connected devices
    checkExistingDevices();

    return () => {
      usb.removeEventListener('connect', handleConnect);
      usb.removeEventListener('disconnect', handleDisconnect);
    };
  }, [autoReconnect, isConnected, onDisconnect]);

  // Check for existing paired devices
  const checkExistingDevices = async () => {
    if (!navigator.usb) return;

    try {
      const devices = await navigator.usb.getDevices();
      if (devices.length > 0) {
        setDiagnostics(prev => ({
          ...prev,
          printerDetected: true,
          permissionStatus: 'ok',
        }));
      }
    } catch (error) {
      console.error('Error checking existing devices:', error);
    }
  };

  // Auto reconnect with retry logic
  const handleAutoReconnect = useCallback(async () => {
    if (isRetryingRef.current || isConnected) return;

    isRetryingRef.current = true;
    let currentRetry = 0;

    const attemptReconnect = async (): Promise<boolean> => {
      if (currentRetry >= maxRetries) {
        const isAndroid = /Android/i.test(navigator.userAgent);
        const errorMsg = isAndroid
          ? 'Máximo de tentativas excedido. DESCONECTE o cabo USB, aguarde 5 segundos e reconecte. Depois clique em BUSCAR novamente.'
          : 'Máximo de tentativas excedido. Outro app pode estar usando a impressora.';
        
        setDiagnostics(prev => ({
          ...prev,
          claimStatus: 'failed',
          lastError: errorMsg,
        }));
        onError?.(errorMsg);
        isRetryingRef.current = false;
        return false;
      }

      currentRetry++;
      setDiagnostics(prev => ({
        ...prev,
        retryCount: currentRetry,
        claimStatus: 'pending',
        lastError: null,
      }));

      try {
        const config = await unifiedPrinterService.reconnect();
        
        if (config) {
          setPrinterModel(config.name);
          setUsbPort(config.port);
          setPrinterLanguage(config.language);
          setIsConnected(true);
          setDiagnostics(prev => ({
            ...prev,
            claimStatus: 'ok',
            permissionStatus: 'ok',
            retryCount: 0,
            lastError: null,
          }));
          onConnect?.();
          isRetryingRef.current = false;
          return true;
        }
      } catch (error: any) {
        console.log(`Reconnect attempt ${currentRetry} failed:`, error.message);
        setDiagnostics(prev => ({
          ...prev,
          lastError: error.message,
        }));

        // Check if it's a claim interface error - retry
        if (error.message?.includes('claim') || error.message?.includes('Unable to claim')) {
          retryTimeoutRef.current = setTimeout(async () => {
            await attemptReconnect();
          }, retryInterval);
          return false;
        }
      }

      isRetryingRef.current = false;
      return false;
    };

    await attemptReconnect();
  }, [isConnected, maxRetries, retryInterval, onConnect, onError]);

  // Search for printer with permission request
  const searchPrinter = useCallback(async () => {
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    if (!unifiedPrinterService.isSupported()) {
      const errorMsg = isAndroid
        ? 'USB não suportado. Certifique-se de usar Chrome/Edge e que o OTG está funcionando.'
        : 'USB não é suportado neste dispositivo. Use Chrome ou Edge.';
      setDiagnostics(prev => ({
        ...prev,
        lastError: errorMsg,
      }));
      throw new Error(errorMsg);
    }

    setIsSearching(true);
    setDiagnostics(prev => ({
      ...prev,
      claimStatus: 'pending',
      retryCount: 0,
      lastError: null,
    }));

    try {
      const config = await unifiedPrinterService.searchPrinter();

      if (config) {
        setPrinterModel(config.name);
        setUsbPort(config.port);
        setPrinterLanguage(config.language);
        setIsConnected(true);
        setDiagnostics(prev => ({
          ...prev,
          permissionStatus: 'ok',
          printerDetected: true,
          claimStatus: 'ok',
          lastError: null,
        }));
        onConnect?.();
        return config;
      } else {
        setDiagnostics(prev => ({
          ...prev,
          permissionStatus: 'denied',
        }));
        return null;
      }
    } catch (error: any) {
      setDiagnostics(prev => ({
        ...prev,
        claimStatus: 'failed',
        lastError: error.message,
      }));
      throw error;
    } finally {
      setIsSearching(false);
    }
  }, [onConnect]);

  // Reconnect to saved printer
  const reconnect = useCallback(async () => {
    const savedConfig = unifiedPrinterService.loadConfig();
    if (!savedConfig) {
      throw new Error('Nenhuma impressora configurada. Use "Buscar" primeiro.');
    }

    setIsReconnecting(true);
    setDiagnostics(prev => ({
      ...prev,
      claimStatus: 'pending',
      retryCount: 0,
      lastError: null,
    }));

    let currentRetry = 0;

    while (currentRetry < maxRetries) {
      currentRetry++;
      setDiagnostics(prev => ({ ...prev, retryCount: currentRetry }));

      try {
        const config = await unifiedPrinterService.reconnect();

        if (config) {
          setPrinterModel(config.name);
          setUsbPort(config.port);
          setPrinterLanguage(config.language);
          setIsConnected(true);
          setDiagnostics(prev => ({
            ...prev,
            claimStatus: 'ok',
            retryCount: 0,
            lastError: null,
          }));
          onConnect?.();
          setIsReconnecting(false);
          return config;
        }
      } catch (error: any) {
        console.log(`Reconnect attempt ${currentRetry} failed:`, error.message);
        setDiagnostics(prev => ({
          ...prev,
          lastError: error.message,
        }));

        // If it's a claim interface error and we have more retries, wait and try again
        if (error.message?.includes('claim') && currentRetry < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryInterval));
          continue;
        }

        // If not a claim error or max retries reached, throw
        if (currentRetry >= maxRetries) {
          setDiagnostics(prev => ({
            ...prev,
            claimStatus: 'failed',
            lastError: 'Outro aplicativo pode estar usando a impressora USB. Feche apps de impressão e tente novamente.',
          }));
        }
        setIsReconnecting(false);
        throw error;
      }
    }

    setIsReconnecting(false);
    throw new Error('Máximo de tentativas excedido');
  }, [maxRetries, retryInterval, onConnect]);

  // Force reset USB connection
  const forceResetUSB = useCallback(async () => {
    setIsResetting(true);

    try {
      // Stop any ongoing retries
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      isRetryingRef.current = false;

      await unifiedPrinterService.forceResetUSB();
      
      setIsConnected(false);
      setPrinterModel(null);
      setUsbPort(null);
      setDiagnostics({
        permissionStatus: 'pending',
        printerDetected: false,
        claimStatus: 'idle',
        queueSize: 0,
        retryCount: 0,
        maxRetries,
        lastError: null,
        isNative: unifiedPrinterService.isNative(),
        connectionStatus: 'disconnected',
      });

      // Wait for USB to stabilize
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error: any) {
      setDiagnostics(prev => ({
        ...prev,
        lastError: error.message,
      }));
      throw error;
    } finally {
      setIsResetting(false);
    }
  }, [maxRetries]);

  // Release interface after print job
  const releaseAfterPrint = useCallback(async () => {
    if (!unifiedPrinterService.isConnected()) return;
    
    try {
      // Small delay to ensure print data is fully sent
      await new Promise(resolve => setTimeout(resolve, 500));
      // Note: We don't actually release here to maintain connection
      // This is called to update diagnostics
      setDiagnostics(prev => ({
        ...prev,
        queueSize: Math.max(0, prev.queueSize - 1),
      }));
    } catch (error) {
      console.error('Error in releaseAfterPrint:', error);
    }
  }, []);

  // Update queue size
  const updateQueueSize = useCallback((size: number) => {
    setDiagnostics(prev => ({ ...prev, queueSize: size }));
  }, []);

  // Disconnect when queue is empty
  const disconnectIfQueueEmpty = useCallback(async () => {
    if (diagnostics.queueSize === 0 && isConnected) {
      try {
        await unifiedPrinterService.disconnect();
        console.log('Disconnected after queue empty');
      } catch (error) {
        console.error('Error disconnecting:', error);
      }
    }
  }, [diagnostics.queueSize, isConnected]);

  // Check if ready for print jobs
  const isReadyForPrintJobs = useCallback(() => {
    return unifiedPrinterService.isReadyForPrintJobs();
  }, []);

  return {
    // State
    isConnected,
    printerModel,
    printerLanguage,
    usbPort,
    isSearching,
    isReconnecting,
    isResetting,
    diagnostics,

    // Actions
    searchPrinter,
    reconnect,
    forceResetUSB,
    releaseAfterPrint,
    updateQueueSize,
    disconnectIfQueueEmpty,
    isReadyForPrintJobs,
  };
}
