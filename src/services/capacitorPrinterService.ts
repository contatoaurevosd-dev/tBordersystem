// Capacitor USB Printer Service for Android OTG thermal printers
// Supports ESC/POS and ESC/BEMA protocols via USB serial
// Implements async USB permission flow for reliable claimInterface

import { Capacitor } from '@capacitor/core';
import { usbPermissionManager, UsbDeviceInfo } from './usbPermissionManager';

// Import types from the plugin
import type { DeviceInfo, DeviceHandler } from 'capacitor-usb-serial';

// Known thermal printer USB Vendor IDs
const KNOWN_PRINTER_VENDORS = [
  { vendorId: 0x0B1B, name: 'Bematech' },
  { vendorId: 0x04B8, name: 'Epson' },
  { vendorId: 0x0519, name: 'Star Micronics' },
  { vendorId: 0x0DD4, name: 'Custom' },
  { vendorId: 0x154F, name: 'Daruma' },
  { vendorId: 0x0FE6, name: 'Kontec' },
  { vendorId: 0x1A86, name: 'QinHeng (CH340)' },
  { vendorId: 0x067B, name: 'Prolific (PL2303)' },
  { vendorId: 0x10C4, name: 'Silicon Labs (CP210x)' },
  { vendorId: 0x0403, name: 'FTDI' },
];

// ESC/POS Commands
const ESC_POS = {
  INIT: '\x1B\x40',
  BOLD_ON: '\x1B\x45\x01',
  BOLD_OFF: '\x1B\x45\x00',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  DOUBLE_SIZE: '\x1B\x21\x30',
  NORMAL_SIZE: '\x1B\x21\x00',
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  LINE_FEED: '\x0A',
  CUT_PAPER: '\x1D\x56\x00',
  CUT_PAPER_PARTIAL: '\x1D\x56\x01',
};

// ESC/BEMA Commands
const ESC_BEMA = {
  INIT: '\x1B\x40',
  BOLD_ON: '\x1B\x45',
  BOLD_OFF: '\x1B\x46',
  UNDERLINE_ON: '\x1B\x2D\x01',
  UNDERLINE_OFF: '\x1B\x2D\x00',
  DOUBLE_SIZE: '\x1B\x21\x30',
  NORMAL_SIZE: '\x1B\x21\x00',
  ALIGN_LEFT: '\x1B\x61\x00',
  ALIGN_CENTER: '\x1B\x61\x01',
  ALIGN_RIGHT: '\x1B\x61\x02',
  LINE_FEED: '\x0A',
  CUT_PAPER: '\x1B\x6D',
  CUT_PAPER_PARTIAL: '\x1B\x6D',
};

export interface CapacitorPrinterConfig {
  deviceId: number;
  name: string;
  port: string;
  language: 'escpos' | 'escbema';
  vendorId: number;
  productId: number;
}

class CapacitorPrinterService {
  private deviceHandler: DeviceHandler | null = null;
  private connectedDevice: DeviceInfo | null = null;
  private language: 'escpos' | 'escbema' = 'escpos';
  private isOpen: boolean = false;
  private getDeviceHandlers: (() => Promise<DeviceHandler[]>) | null = null;
  private isConnecting: boolean = false;
  private connectionCheckInterval: ReturnType<typeof setInterval> | null = null;

  // Check if running on native platform
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  // Check if running on Android
  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  // Initialize the USB Serial plugin
  private async initPlugin(): Promise<boolean> {
    if (!this.isNative()) {
      return false;
    }

    if (this.getDeviceHandlers) {
      return true;
    }

    try {
      const { getDeviceHandlers } = await import('capacitor-usb-serial');
      this.getDeviceHandlers = getDeviceHandlers;
      return true;
    } catch (error) {
      console.error('Failed to load USB Serial plugin:', error);
      return false;
    }
  }

  // List available USB devices
  async listDevices(): Promise<DeviceInfo[]> {
    const initialized = await this.initPlugin();
    if (!initialized || !this.getDeviceHandlers) {
      throw new Error('USB Serial não disponível. Execute em um dispositivo Android.');
    }

    try {
      const handlers = await this.getDeviceHandlers();
      return handlers.map(h => h.device);
    } catch (error: any) {
      console.error('Error listing devices:', error);
      throw new Error('Erro ao listar dispositivos USB: ' + error.message);
    }
  }

  /**
   * STEP 1: Request USB Access
   * Localiza a impressora e verifica permissão.
   * Se permissão não existir, solicita e INTERROMPE a execução.
   * A conexão real só ocorre em onPermissionGranted.
   */
  async requestUsbAccess(): Promise<{ needsPermission: boolean; handler: DeviceHandler | null }> {
    console.log('[CapacitorPrinterService] requestUsbAccess: Starting...');
    
    if (this.isConnecting) {
      console.log('[CapacitorPrinterService] Connection already in progress');
      return { needsPermission: false, handler: null };
    }

    this.isConnecting = true;
    usbPermissionManager.setConnectionStatus('connecting');

    try {
      const initialized = await this.initPlugin();
      if (!initialized || !this.getDeviceHandlers) {
        throw new Error('USB Serial não disponível.');
      }

      const handlers = await this.getDeviceHandlers();
      
      if (handlers.length === 0) {
        throw new Error('Nenhum dispositivo USB encontrado. Verifique a conexão OTG.');
      }

      // Find known printer
      const printerHandlers = handlers.filter(h => 
        KNOWN_PRINTER_VENDORS.some(v => v.vendorId === h.device.vendorId)
      );
      const targetHandler = printerHandlers.length > 0 ? printerHandlers[0] : handlers[0];

      const deviceInfo: UsbDeviceInfo = {
        deviceId: targetHandler.device.deviceId,
        vendorId: targetHandler.device.vendorId,
        productId: targetHandler.device.productId,
        deviceName: targetHandler.device.deviceName || 'USB Printer',
      };

      // Check if permission already persisted
      const hasPersistedPermission = usbPermissionManager.checkExistingPermission(deviceInfo);
      
      if (hasPersistedPermission) {
        console.log('[CapacitorPrinterService] Permission already persisted, proceeding to connect');
        // Permission exists, proceed directly to connection
        await this.onPermissionGranted(targetHandler);
        return { needsPermission: false, handler: targetHandler };
      }

      // Permission not persisted - the connect() call on the handler will trigger
      // Android's USB permission dialog. We'll handle this by attempting connection
      // and catching permission errors.
      console.log('[CapacitorPrinterService] No persisted permission, attempting connection (will trigger permission dialog)...');
      
      return { needsPermission: true, handler: targetHandler };
    } catch (error: any) {
      console.error('[CapacitorPrinterService] requestUsbAccess error:', error);
      this.isConnecting = false;
      usbPermissionManager.setConnectionStatus('error', error.message);
      throw error;
    }
  }

  /**
   * STEP 2: On Permission Granted
   * Chamado APÓS permissão ser concedida.
   * Executa openDevice e claimInterface com forceClaim=true.
   */
  async onPermissionGranted(handler: DeviceHandler): Promise<CapacitorPrinterConfig | null> {
    console.log('[CapacitorPrinterService] onPermissionGranted: Establishing connection...');

    try {
      // 1. Connect to device (this calls openDevice + claimInterface internally)
      // The capacitor-usb-serial plugin handles this, but we ensure forceClaim behavior
      await handler.connect();

      console.log('[CapacitorPrinterService] Device connection established successfully');

      // Store references
      this.deviceHandler = handler;
      this.connectedDevice = handler.device;
      this.isOpen = true;
      this.isConnecting = false;

      // Determine language based on vendor
      const vendor = KNOWN_PRINTER_VENDORS.find(v => v.vendorId === handler.device.vendorId);
      if (vendor?.name === 'Bematech') {
        this.language = 'escbema';
      } else {
        this.language = 'escpos';
      }

      const deviceInfo: UsbDeviceInfo = {
        deviceId: handler.device.deviceId,
        vendorId: handler.device.vendorId,
        productId: handler.device.productId,
        deviceName: handler.device.deviceName || vendor?.name || 'USB Printer',
      };

      // Persist permission for auto-reconnect
      usbPermissionManager.setPermissionGranted(deviceInfo);
      usbPermissionManager.setConnectionStatus('connected');
      usbPermissionManager.resetReconnectAttempts();

      const config: CapacitorPrinterConfig = {
        deviceId: handler.device.deviceId,
        name: deviceInfo.deviceName,
        port: `USB ${handler.device.vendorId.toString(16).toUpperCase()}:${handler.device.productId.toString(16).toUpperCase()}`,
        language: this.language,
        vendorId: handler.device.vendorId,
        productId: handler.device.productId,
      };

      // Save configuration for reconnect
      this.saveConfig(config);
      
      // Start connection monitor for device detach detection
      this.startConnectionMonitor();

      return config;
    } catch (error: any) {
      console.error('[CapacitorPrinterService] onPermissionGranted error:', error);
      this.isConnecting = false;
      this.isOpen = false;
      
      const errorMsg = error.message || 'Erro ao conectar';
      
      // Check if it's a claimInterface error
      if (errorMsg.includes('claim') || errorMsg.includes('interface')) {
        usbPermissionManager.setConnectionStatus('error', 'Unable to claim interface. Verifique se outro app está usando a impressora.');
      } else {
        usbPermissionManager.setConnectionStatus('error', errorMsg);
      }
      
      // Schedule reconnect attempt if permission is persisted
      const deviceInfo: UsbDeviceInfo = {
        deviceId: handler.device.deviceId,
        vendorId: handler.device.vendorId,
        productId: handler.device.productId,
        deviceName: handler.device.deviceName || 'USB Printer',
      };
      
      if (usbPermissionManager.checkExistingPermission(deviceInfo)) {
        usbPermissionManager.scheduleReconnect(() => this.reconnect());
      }
      
      throw error;
    }
  }

  /**
   * Search and connect to a printer
   * Main entry point that uses the async permission flow
   */
  async searchPrinter(): Promise<CapacitorPrinterConfig | null> {
    if (!this.isNative()) {
      throw new Error('Esta função requer execução nativa no Android.');
    }

    try {
      const { needsPermission, handler } = await this.requestUsbAccess();
      
      if (handler) {
        if (needsPermission) {
          // Attempt connection - this will trigger Android's permission dialog
          // If user grants, connection proceeds. If denied, error is thrown.
          return await this.onPermissionGranted(handler);
        }
        // Permission was already granted, connection already established in requestUsbAccess
        return this.loadConfig();
      }
      
      return null;
    } catch (error: any) {
      console.error('[CapacitorPrinterService] searchPrinter error:', error);
      throw error;
    }
  }

  /**
   * Start connection monitor for Print Bridge persistence
   * Detects device detach and triggers reconnect on reattach
   */
  private startConnectionMonitor(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
    }

    console.log('[CapacitorPrinterService] Starting connection monitor...');

    this.connectionCheckInterval = setInterval(async () => {
      if (!this.isOpen || !this.deviceHandler) return;

      try {
        // Check if device is still available
        const handlers = this.getDeviceHandlers ? await this.getDeviceHandlers() : [];
        const stillConnected = handlers.some(h => 
          h.device.vendorId === this.connectedDevice?.vendorId &&
          h.device.productId === this.connectedDevice?.productId
        );

        if (!stillConnected && this.isOpen) {
          console.log('[CapacitorPrinterService] Device detached detected');
          this.handleDeviceDetached();
        }
      } catch (error) {
        console.warn('[CapacitorPrinterService] Connection monitor error:', error);
      }
    }, 3000); // Check every 3 seconds
  }

  /**
   * Stop connection monitor
   */
  private stopConnectionMonitor(): void {
    if (this.connectionCheckInterval) {
      clearInterval(this.connectionCheckInterval);
      this.connectionCheckInterval = null;
    }
  }

  /**
   * Handle device detach event (ACTION_USB_DEVICE_DETACHED equivalent)
   */
  private handleDeviceDetached(): void {
    console.log('[CapacitorPrinterService] handleDeviceDetached');
    
    this.isOpen = false;
    this.deviceHandler = null;
    // Keep connectedDevice reference for reconnect
    
    usbPermissionManager.setConnectionStatus('disconnected');
    
    // Schedule reconnect attempt when device is reattached
    if (this.connectedDevice) {
      const deviceInfo: UsbDeviceInfo = {
        deviceId: this.connectedDevice.deviceId,
        vendorId: this.connectedDevice.vendorId,
        productId: this.connectedDevice.productId,
        deviceName: this.connectedDevice.deviceName || 'USB Printer',
      };
      
      if (usbPermissionManager.checkExistingPermission(deviceInfo)) {
        console.log('[CapacitorPrinterService] Permission persisted, will auto-reconnect on device reattach');
        // Start watching for device reattach
        this.watchForDeviceReattach();
      }
    }
  }

  /**
   * Watch for device reattachment (ACTION_USB_DEVICE_ATTACHED equivalent)
   */
  private watchForDeviceReattach(): void {
    const checkInterval = setInterval(async () => {
      if (this.isOpen) {
        clearInterval(checkInterval);
        return;
      }

      try {
        const initialized = await this.initPlugin();
        if (!initialized || !this.getDeviceHandlers) return;

        const handlers = await this.getDeviceHandlers();
        const reattached = handlers.find(h => 
          h.device.vendorId === this.connectedDevice?.vendorId &&
          h.device.productId === this.connectedDevice?.productId
        );

        if (reattached) {
          console.log('[CapacitorPrinterService] Device reattached, auto-reconnecting...');
          clearInterval(checkInterval);
          
          // Auto-reconnect since permission persists
          await this.onPermissionGranted(reattached);
        }
      } catch (error) {
        console.warn('[CapacitorPrinterService] Reattach watch error:', error);
      }
    }, 2000); // Check every 2 seconds

    // Stop watching after 5 minutes
    setTimeout(() => {
      clearInterval(checkInterval);
    }, 5 * 60 * 1000);
  }

  // Disconnect
  async disconnect(): Promise<void> {
    console.log('[CapacitorPrinterService] Disconnecting...');
    
    this.stopConnectionMonitor();
    
    if (this.deviceHandler && this.isOpen) {
      try {
        await this.deviceHandler.disconnect();
      } catch (e) {
        console.log('Error disconnecting:', e);
      }
    }
    
    this.deviceHandler = null;
    this.connectedDevice = null;
    this.isOpen = false;
    this.isConnecting = false;
    
    usbPermissionManager.setConnectionStatus('disconnected');
  }

  // Check if connected
  isConnected(): boolean {
    return this.isOpen && this.deviceHandler !== null;
  }

  /**
   * Check if ready for print jobs
   * Jobs should call this before attempting to print
   */
  isReadyForPrintJobs(): boolean {
    return usbPermissionManager.isConnectionReady() && this.isConnected();
  }

  // Save configuration
  private saveConfig(config: CapacitorPrinterConfig) {
    localStorage.setItem('capacitor_printer_config', JSON.stringify(config));
  }

  // Load configuration
  loadConfig(): CapacitorPrinterConfig | null {
    const saved = localStorage.getItem('capacitor_printer_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Reconnect to saved device
  async reconnect(): Promise<CapacitorPrinterConfig | null> {
    console.log('[CapacitorPrinterService] reconnect: Attempting...');
    
    const savedConfig = this.loadConfig();
    if (!savedConfig) {
      throw new Error('Nenhuma impressora configurada.');
    }

    if (this.isConnecting) {
      console.log('[CapacitorPrinterService] Reconnect already in progress');
      return null;
    }

    this.isConnecting = true;
    usbPermissionManager.setConnectionStatus('connecting');

    try {
      const initialized = await this.initPlugin();
      if (!initialized || !this.getDeviceHandlers) {
        throw new Error('USB Serial não disponível.');
      }

      const handlers = await this.getDeviceHandlers();
      const handler = handlers.find(h => 
        h.device.vendorId === savedConfig.vendorId && 
        h.device.productId === savedConfig.productId
      );

      if (!handler) {
        throw new Error('Impressora não encontrada. Verifique a conexão USB.');
      }

      // Since we have saved config, permission should be persisted
      return await this.onPermissionGranted(handler);
    } catch (error: any) {
      console.error('[CapacitorPrinterService] reconnect error:', error);
      this.isConnecting = false;
      usbPermissionManager.setConnectionStatus('error', error.message);
      
      // Schedule another reconnect attempt
      usbPermissionManager.scheduleReconnect(() => this.reconnect());
      
      throw error;
    }
  }

  /**
   * Get connection state for UI display
   */
  getConnectionState() {
    return usbPermissionManager.getState();
  }

  /**
   * Force USB reset for troubleshooting
   */
  async forceResetUSB(): Promise<void> {
    console.log('[CapacitorPrinterService] Forcing USB reset...');
    
    await this.disconnect();
    usbPermissionManager.forceReset();
    localStorage.removeItem('capacitor_printer_config');
  }

  // Get commands based on language
  private getCommands() {
    return this.language === 'escbema' ? ESC_BEMA : ESC_POS;
  }

  // Send data to printer
  async sendData(data: string): Promise<void> {
    if (!this.deviceHandler || !this.isOpen) {
      throw new Error('Impressora não conectada');
    }

    await this.deviceHandler.write(data);
  }

  // Print test page
  async printTestPage(): Promise<void> {
    const cmd = this.getCommands();
    
    const testData = [
      cmd.INIT,
      cmd.ALIGN_CENTER,
      cmd.DOUBLE_SIZE,
      'TESTE DE IMPRESSAO',
      cmd.LINE_FEED,
      cmd.NORMAL_SIZE,
      cmd.LINE_FEED,
      '================================',
      cmd.LINE_FEED,
      cmd.ALIGN_LEFT,
      cmd.LINE_FEED,
      'Impressora: ' + (this.connectedDevice?.deviceName || 'USB Printer'),
      cmd.LINE_FEED,
      'Protocolo: ' + this.language.toUpperCase(),
      cmd.LINE_FEED,
      'Data/Hora: ' + new Date().toLocaleString('pt-BR'),
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.ALIGN_CENTER,
      '================================',
      cmd.LINE_FEED,
      cmd.BOLD_ON,
      'CONEXAO OK!',
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      '================================',
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.CUT_PAPER_PARTIAL,
    ].join('');

    await this.sendData(testData);
  }

  // Print service order
  async printServiceOrder(order: {
    orderNumber: string;
    clientName: string;
    clientPhone: string;
    brand: string;
    model: string;
    deviceColor: string;
    problemDescription: string;
    accessories: string;
    physicalCondition: string;
    passwordType: string;
    passwordValue?: string;
    serviceValue: number;
    entryValue: number;
    remainingValue: number;
    estimatedDelivery?: string;
    observations?: string;
    storeName: string;
    storePhone?: string;
    storeAddress?: string;
    attendantName: string;
    createdAt: string;
  }): Promise<void> {
    const cmd = this.getCommands();
    const line = '----------------------------------------';
    const doubleLine = '========================================';
    
    const formatCurrency = (value: number) => {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const parts: string[] = [
      cmd.INIT,
      cmd.ALIGN_CENTER,
      cmd.BOLD_ON,
      cmd.DOUBLE_SIZE,
      order.storeName,
      cmd.LINE_FEED,
      cmd.NORMAL_SIZE,
      cmd.BOLD_OFF,
    ];

    if (order.storePhone) {
      parts.push(order.storePhone, cmd.LINE_FEED);
    }
    if (order.storeAddress) {
      parts.push(order.storeAddress, cmd.LINE_FEED);
    }

    parts.push(
      doubleLine,
      cmd.LINE_FEED,
      cmd.BOLD_ON,
      'ORDEM DE SERVICO',
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      cmd.DOUBLE_SIZE,
      '#' + order.orderNumber,
      cmd.NORMAL_SIZE,
      cmd.LINE_FEED,
      doubleLine,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      
      // Client info
      cmd.ALIGN_LEFT,
      cmd.BOLD_ON,
      'CLIENTE',
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      line,
      cmd.LINE_FEED,
      'Nome: ' + order.clientName,
      cmd.LINE_FEED,
      'Telefone: ' + order.clientPhone,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      
      // Device info
      cmd.BOLD_ON,
      'APARELHO',
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      line,
      cmd.LINE_FEED,
      'Marca: ' + order.brand,
      cmd.LINE_FEED,
      'Modelo: ' + order.model,
      cmd.LINE_FEED,
      'Cor: ' + order.deviceColor,
      cmd.LINE_FEED,
      'Acessorios: ' + (order.accessories || 'Nenhum'),
      cmd.LINE_FEED,
      'Condicao: ' + order.physicalCondition,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      
      // Problem
      cmd.BOLD_ON,
      'PROBLEMA RELATADO',
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      line,
      cmd.LINE_FEED,
      order.problemDescription,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      
      // Password
      cmd.BOLD_ON,
      'SENHA',
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      line,
      cmd.LINE_FEED,
      'Tipo: ' + order.passwordType,
      cmd.LINE_FEED,
    );

    if (order.passwordValue) {
      parts.push('Senha: ' + order.passwordValue, cmd.LINE_FEED);
    }

    parts.push(
      cmd.LINE_FEED,
      
      // Values
      cmd.BOLD_ON,
      'VALORES',
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      line,
      cmd.LINE_FEED,
      'Valor do Servico: ' + formatCurrency(order.serviceValue),
      cmd.LINE_FEED,
      'Valor de Entrada: ' + formatCurrency(order.entryValue),
      cmd.LINE_FEED,
      'Valor Restante: ' + formatCurrency(order.remainingValue),
      cmd.LINE_FEED,
      cmd.LINE_FEED,
    );

    if (order.estimatedDelivery) {
      parts.push(
        cmd.BOLD_ON,
        'PREVISAO DE ENTREGA',
        cmd.BOLD_OFF,
        cmd.LINE_FEED,
        line,
        cmd.LINE_FEED,
        order.estimatedDelivery,
        cmd.LINE_FEED,
        cmd.LINE_FEED,
      );
    }

    if (order.observations) {
      parts.push(
        cmd.BOLD_ON,
        'OBSERVACOES',
        cmd.BOLD_OFF,
        cmd.LINE_FEED,
        line,
        cmd.LINE_FEED,
        order.observations,
        cmd.LINE_FEED,
        cmd.LINE_FEED,
      );
    }

    parts.push(
      doubleLine,
      cmd.LINE_FEED,
      cmd.ALIGN_CENTER,
      'Data: ' + order.createdAt,
      cmd.LINE_FEED,
      'Atendente: ' + order.attendantName,
      cmd.LINE_FEED,
      doubleLine,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.CUT_PAPER_PARTIAL,
    );

    await this.sendData(parts.join(''));
  }

  // Get language
  getLanguage(): 'escpos' | 'escbema' {
    return this.language;
  }

  // Set language
  setLanguage(lang: 'escpos' | 'escbema') {
    this.language = lang;
  }

  // Get device info
  getDeviceInfo(): { name: string; port: string; language: string } | null {
    if (!this.connectedDevice) return null;
    
    const vendor = KNOWN_PRINTER_VENDORS.find(v => v.vendorId === this.connectedDevice?.vendorId);
    return {
      name: this.connectedDevice.deviceName || vendor?.name || 'USB Printer',
      port: `USB ${this.connectedDevice.vendorId.toString(16).toUpperCase()}:${this.connectedDevice.productId.toString(16).toUpperCase()}`,
      language: this.language.toUpperCase(),
    };
  }
}

// Export singleton instance
export const capacitorPrinterService = new CapacitorPrinterService();
