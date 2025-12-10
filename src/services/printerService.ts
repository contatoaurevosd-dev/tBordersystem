// ADDED: import do mutex USB (linha inserida por você)
import { usbSessionLock } from './usbSessionLock';

// Printer Service for Bematech MP-4200 HS and compatible thermal printers
// Supports ESC/POS and ESC/BEMA protocols

// WebUSB types declaration
declare global {
  interface Navigator {
    usb: USB;
  }

  interface USB {
    getDevices(): Promise<USBDevice[]>;
    requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
  }

  interface USBDeviceRequestOptions {
    filters?: USBDeviceFilter[];
  }

  interface USBDeviceFilter {
    vendorId?: number;
    productId?: number;
    classCode?: number;
    subclassCode?: number;
    protocolCode?: number;
    serialNumber?: string;
  }

  interface USBDevice {
    vendorId: number;
    productId: number;
    productName?: string;
    manufacturerName?: string;
    serialNumber?: string;
    configuration?: USBConfiguration;
    opened: boolean;
    open(): Promise<void>;
    close(): Promise<void>;
    selectConfiguration(configurationValue: number): Promise<void>;
    claimInterface(interfaceNumber: number): Promise<void>;
    releaseInterface(interfaceNumber: number): Promise<void>;
    selectAlternateInterface(interfaceNumber: number, alternateSetting: number): Promise<void>;
    transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    transferIn(endpointNumber: number, length: number): Promise<USBInTransferResult>;
  }

  interface USBConfiguration {
    configurationValue: number;
    interfaces: USBInterface[];
  }

  interface USBInterface {
    interfaceNumber: number;
    alternates: USBAlternateInterface[];
  }

  interface USBAlternateInterface {
    alternateSetting: number;
    interfaceClass: number;
    endpoints: USBEndpoint[];
  }

  interface USBEndpoint {
    endpointNumber: number;
    direction: 'in' | 'out';
    type: 'bulk' | 'interrupt' | 'isochronous';
    packetSize: number;
  }

  interface USBOutTransferResult {
    bytesWritten: number;
    status: 'ok' | 'stall' | 'babble';
  }

  interface USBInTransferResult {
    data?: DataView;
    status: 'ok' | 'stall' | 'babble';
  }
}

export interface PrinterDevice {
  device: USBDevice;
  name: string;
  vendorId: number;
  productId: number;
}

export interface PrinterConfig {
  device: USBDevice | null;
  name: string;
  port: string;
  language: 'escpos' | 'escbema';
  endpointOut: number;
  interfaceNumber: number;
}

// Known thermal printer USB Vendor IDs
const KNOWN_PRINTER_VENDORS = [
  { vendorId: 0x0B1B, name: 'Bematech' },
  { vendorId: 0x04B8, name: 'Epson' },
  { vendorId: 0x0519, name: 'Star Micronics' },
  { vendorId: 0x0DD4, name: 'Custom' },
  { vendorId: 0x154F, name: 'Daruma' },
  { vendorId: 0x0FE6, name: 'Kontec' },
  { vendorId: 0x1A86, name: 'QinHeng' },
  { vendorId: 0x067B, name: 'Prolific' },
];

// Common ESC/POS Commands
const ESC_POS_COMMANDS = {
  INIT: new Uint8Array([0x1B, 0x40]),
  BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),
  BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
  UNDERLINE_ON: new Uint8Array([0x1B, 0x2D, 0x01]),
  UNDERLINE_OFF: new Uint8Array([0x1B, 0x2D, 0x00]),
  DOUBLE_HEIGHT: new Uint8Array([0x1B, 0x21, 0x10]),
  DOUBLE_WIDTH: new Uint8Array([0x1B, 0x21, 0x20]),
  DOUBLE_SIZE: new Uint8Array([0x1B, 0x21, 0x30]),
  NORMAL_SIZE: new Uint8Array([0x1B, 0x21, 0x00]),
  ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
  LINE_FEED: new Uint8Array([0x0A]),
  CARRIAGE_RETURN: new Uint8Array([0x0D]),
  CUT_PAPER: new Uint8Array([0x1D, 0x56, 0x00]),
  CUT_PAPER_PARTIAL: new Uint8Array([0x1D, 0x56, 0x01]),
  FEED_LINES: (n: number) => new Uint8Array([0x1B, 0x64, n]),
  OPEN_DRAWER: new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]),
};

// ESC/BEMA Commands (Bematech specific)
const ESC_BEMA_COMMANDS = {
  INIT: new Uint8Array([0x1B, 0x40]),
  BOLD_ON: new Uint8Array([0x1B, 0x45]),
  BOLD_OFF: new Uint8Array([0x1B, 0x46]),
  UNDERLINE_ON: new Uint8Array([0x1B, 0x2D, 0x01]),
  UNDERLINE_OFF: new Uint8Array([0x1B, 0x2D, 0x00]),
  DOUBLE_SIZE: new Uint8Array([0x1B, 0x21, 0x30]),
  NORMAL_SIZE: new Uint8Array([0x1B, 0x21, 0x00]),
  EXPANDED_ON: new Uint8Array([0x1B, 0x57, 0x01]),
  EXPANDED_OFF: new Uint8Array([0x1B, 0x57, 0x00]),
  CONDENSED_ON: new Uint8Array([0x0F]),
  CONDENSED_OFF: new Uint8Array([0x12]),
  ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
  ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
  ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
  LINE_FEED: new Uint8Array([0x0A]),
  CUT_PAPER: new Uint8Array([0x1B, 0x6D]),
  CUT_PAPER_PARTIAL: new Uint8Array([0x1B, 0x6D]),
  FEED_LINES: (n: number) => new Uint8Array([0x1B, 0x64, n]),
};

// Export command sets
export const ESC_POS = ESC_POS_COMMANDS;
export const ESC_BEMA = ESC_BEMA_COMMANDS;

class PrinterService {
  private device: USBDevice | null = null;
  private endpointOut: number = 0;
  private interfaceNumber: number = 0;
  private language: 'escpos' | 'escbema' = 'escpos';
  
  // Check if WebUSB is supported
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'usb' in navigator;
  }

  // Request and connect to a USB printer
  async searchPrinter(): Promise<PrinterConfig | null> {
    if (!this.isSupported()) {
      throw new Error('WebUSB não é suportado neste navegador. Use Chrome ou Edge.');
    }

    try {
      const filters = KNOWN_PRINTER_VENDORS.map(v => ({ vendorId: v.vendorId }));
      
      const device = await navigator.usb.requestDevice({ 
        filters: filters.length > 0 ? filters : undefined 
      });

      if (!device) {
        return null;
      }

      // Connect to the device with retry logic
      const config = await this.connectToDevice(device);
      return config;
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        return null;
      }
      throw error;
    }
  }

  // Connect to a USB device with proper interface claiming
  private async connectToDevice(device: USBDevice): Promise<PrinterConfig> {
    try {
      // Close if already open
      if (device.opened) {
        try {
          await device.close();
        } catch (e) {
          console.log('Device was already open, closed it');
        }
      }

      // Open the device
      await device.open();

      // Select configuration if needed
      if (device.configuration === null) {
        await device.selectConfiguration(1);
      }

      // Find the bulk out endpoint
      let foundEndpoint = false;
      let interfaceNum = 0;
      let endpointNum = 0;

      if (device.configuration) {
        for (const iface of device.configuration.interfaces) {
          for (const alternate of iface.alternates) {
            for (const endpoint of alternate.endpoints) {
              if (endpoint.direction === 'out' && endpoint.type === 'bulk') {
                interfaceNum = iface.interfaceNumber;
                endpointNum = endpoint.endpointNumber;
                foundEndpoint = true;
                break;
              }
            }
            if (foundEndpoint) break;
          }
          if (foundEndpoint) break;
        }
      }

      if (!foundEndpoint) {
        await device.close();
        throw new Error('Não foi possível encontrar endpoint de saída na impressora.');
      }

      // Try to claim the interface with retry
      await this.claimInterfaceWithRetry(device, interfaceNum);

      this.device = device;
      this.endpointOut = endpointNum;
      this.interfaceNumber = interfaceNum;

      const vendor = KNOWN_PRINTER_VENDORS.find(v => v.vendorId === device.vendorId);
      if (vendor?.name === 'Bematech') {
        this.language = 'escbema';
      } else {
        this.language = 'escpos';
      }

      const config: PrinterConfig = {
        device: device,
        name: device.productName || vendor?.name || `USB Printer (${device.vendorId.toString(16)}:${device.productId.toString(16)})`,
        port: `USB ${device.vendorId.toString(16).toUpperCase()}:${device.productId.toString(16).toUpperCase()}`,
        language: this.language,
        endpointOut: this.endpointOut,
        interfaceNumber: this.interfaceNumber,
      };

      this.saveConfig(config);

      return config;
    } catch (error: any) {
      // Clean up on error
      if (device.opened) {
        try {
          await device.close();
        } catch (e) {
          // Ignore close errors
        }
      }
      throw error;
    }
  }

  // Claim interface with retry logic for Android OTG compatibility
  private async claimInterfaceWithRetry(
    device: USBDevice, 
    interfaceNumber: number, 
    maxRetries: number = 15,
    onRetry?: (attempt: number, maxRetries: number) => void
  ): Promise<void> {
    let lastError: Error | null = null;
    const isAndroid = /Android/i.test(navigator.userAgent);
    const baseDelay = isAndroid ? 1500 : 1000; // Longer delays for Android

    console.log(`[USB] Iniciando claim interface ${interfaceNumber} (Android: ${isAndroid})`);

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        console.log(`[USB] Tentativa ${attempt + 1}/${maxRetries} de claim interface...`);
        onRetry?.(attempt + 1, maxRetries);

        // Progressive delay - longer waits on each retry
        if (attempt > 0) {
          const delay = baseDelay + (attempt * 500);
          console.log(`[USB] Aguardando ${delay}ms antes de retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        // On Android, try to reset device state more aggressively
        if (isAndroid && attempt > 0) {
          try {
            // Close and reopen device
            if (device.opened) {
              console.log('[USB] Android: Fechando device para reset...');
              try {
                await device.releaseInterface(interfaceNumber);
              } catch (e) {
                // Ignore - interface might not be claimed
              }
              await device.close();
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log('[USB] Android: Reabrindo device...');
            await device.open();
            
            if (device.configuration === null) {
              await device.selectConfiguration(1);
            }
            
            // Wait for device to stabilize
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch (e) {
            console.log('[USB] Android reset parcial falhou:', e);
          }
        }

        // On first attempt or after reset, try device.reset() if available
        if (attempt === 0 || (isAndroid && attempt % 3 === 0)) {
          try {
            if ('reset' in device && typeof (device as any).reset === 'function') {
              console.log('[USB] Executando device.reset()...');
              await (device as any).reset();
              await new Promise(resolve => setTimeout(resolve, 500));
            }
          } catch (e) {
            console.log('[USB] Device reset não suportado ou falhou:', e);
          }
        }

        // Always try to release first in case it's claimed by us
        try {
          await device.releaseInterface(interfaceNumber);
          console.log('[USB] Interface liberada antes de claim');
          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (e) {
          // Interface might not be claimed, ignore
        }

        // For Android, try selecting alternate interface before claim
        if (isAndroid) {
          try {
            const iface = device.configuration?.interfaces.find(i => i.interfaceNumber === interfaceNumber);
            if (iface && iface.alternates?.length > 0) {
              await device.selectAlternateInterface(interfaceNumber, 0);
              console.log('[USB] Android: Alternate interface selecionada');
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (e) {
            // Might not be supported, ignore
          }
        }

        // Attempt to claim
        await device.claimInterface(interfaceNumber);
        console.log('[USB] ✓ Interface claimed com sucesso!');
        return; // Success!
        
      } catch (error: any) {
        lastError = error;
        console.log(`[USB] ✗ Claim interface tentativa ${attempt + 1} falhou:`, error.message);

        // If interface is busy on Android, try a more aggressive approach
        if (isAndroid && error.message?.includes('Unable to claim')) {
          console.log('[USB] Android: Interface busy, tentando abordagem alternativa...');
          
          try {
            // Full disconnect and wait
            if (device.opened) {
              await device.close();
            }
            
            // Wait longer for kernel to release
            const kernelWait = 3000 + (attempt * 500);
            console.log(`[USB] Android: Aguardando ${kernelWait}ms para kernel liberar...`);
            await new Promise(resolve => setTimeout(resolve, kernelWait));
            
            // Reopen
            await device.open();
            if (device.configuration === null) {
              await device.selectConfiguration(1);
            }
          } catch (e) {
            console.log('[USB] Android: Abordagem alternativa falhou:', e);
          }
        }
      }
    }

    // All retries failed
    let errorMessage = 'ClaimInterface falhou após ' + maxRetries + ' tentativas. ';

    if (isAndroid) {
      errorMessage +=
        'No Android com OTG, isso geralmente significa que o kernel ainda está usando a impressora. ' +
        'TENTE: 1) Desconectar fisicamente o cabo USB, aguardar 5 segundos e reconectar. ' +
        '2) Fechar TODOS os apps (incluindo em segundo plano). ' +
        '3) Reiniciar o dispositivo se o problema persistir.';
    } else {
      errorMessage +=
        'Verifique se outro programa está usando a impressora. ' +
        'Feche outros aplicativos e tente novamente.';
    }

    throw new Error(errorMessage);
  }

  // Release interface after print job (for proper cleanup)
  async releaseInterface(): Promise<void> {
    if (this.device && this.device.opened) {
      try {
        await this.device.releaseInterface(this.interfaceNumber);
        console.log('[USB] Interface liberada');
      } catch (e) {
        console.log('[USB] Erro ao liberar interface:', e);
      }
    }
  }

  // Close USB connection completely
  async closeConnection(): Promise<void> {
    if (this.device) {
      try {
        if (this.device.opened) {
          await this.releaseInterface();
          await this.device.close();
          console.log('[USB] Conexão fechada');
        }
      } catch (e) {
        console.log('[USB] Erro ao fechar conexão:', e);
      }
      this.device = null;
    }
  }

  // Force reset USB connection (for troubleshooting)
  async forceResetUSB(): Promise<void> {
    console.log('Forcing USB reset...');
    
    // Disconnect current device if any
    if (this.device) {
      try {
        if (this.device.opened) {
          try {
            await this.device.releaseInterface(this.interfaceNumber);
          } catch (e) {
            console.log('Release failed:', e);
          }
          await this.device.close();
        }
      } catch (e) {
        console.log('Close failed:', e);
      }
      this.device = null;
    }

    // Clear saved config
    localStorage.removeItem('printer_config');
    
    // Wait for USB to fully reset
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('USB reset complete. Ready for new connection.');
  }

  // Save printer configuration
  private saveConfig(config: PrinterConfig) {
    const savedConfig = {
      name: config.name,
      port: config.port,
      language: config.language,
      vendorId: config.device?.vendorId,
      productId: config.device?.productId,
    };
    localStorage.setItem('printer_config', JSON.stringify(savedConfig));
  }

  // Load saved configuration
  loadConfig(): { name: string; port: string; language: 'escpos' | 'escbema' } | null {
    const saved = localStorage.getItem('printer_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  }

  // Reconnect to saved printer
  async reconnect(): Promise<PrinterConfig | null> {
    if (!this.isSupported()) {
      throw new Error('WebUSB não é suportado neste navegador.');
    }

    const savedConfig = this.loadConfig();
    if (!savedConfig) {
      throw new Error('Nenhuma impressora configurada. Use "Buscar" primeiro.');
    }

    try {
      const devices = await navigator.usb.getDevices();
      
      if (devices.length === 0) {
        throw new Error('Nenhum dispositivo pareado encontrado. Use "Buscar" para parear novamente.');
      }

      for (const device of devices) {
        try {
          // Use the same connection logic with retry
          const config = await this.connectToDevice(device);
          // Override language from saved config
          this.language = savedConfig.language;
          return {
            ...config,
            language: savedConfig.language,
          };
        } catch (e) {
          console.log('Failed to connect to device:', e);
          continue;
        }
      }

      throw new Error('Não foi possível reconectar à impressora. Verifique a conexão USB.');
    } catch (error) {
      throw error;
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.device !== null && this.device.opened;
  }

  // Disconnect
  async disconnect() {
    if (this.device && this.device.opened) {
      try {
        await this.device.releaseInterface(this.interfaceNumber);
        await this.device.close();
      } catch (e) {
        console.log('Error disconnecting:', e);
      }
    }
    this.device = null;
  }

  // Send raw data to printer
  async sendData(data: Uint8Array): Promise<void> {
    if (!this.device || !this.device.opened) {
      throw new Error('Impressora não conectada');
    }

    // Convert to ArrayBuffer to avoid TypeScript issues with SharedArrayBuffer
    const buffer = new ArrayBuffer(data.length);
    const view = new Uint8Array(buffer);
    view.set(data);
    await this.device.transferOut(this.endpointOut, buffer);
  }

  // Convert string to Uint8Array with proper encoding
  textToBytes(text: string): Uint8Array {
    const encoder = new TextEncoder();
    return encoder.encode(text);
  }

  // Combine multiple byte arrays
  combineBytes(...arrays: Uint8Array[]): Uint8Array {
    const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const arr of arrays) {
      result.set(arr, offset);
      offset += arr.length;
    }
    return result;
  }

  // Get commands based on language
  getCommands() {
    return this.language === 'escbema' ? ESC_BEMA_COMMANDS : ESC_POS_COMMANDS;
  }

  // Print test page
  async printTestPage(): Promise<void> {
    const cmd = this.getCommands();
    
    const testContent = this.combineBytes(
      cmd.INIT,
      cmd.ALIGN_CENTER,
      cmd.DOUBLE_SIZE,
      this.textToBytes('TESTE DE IMPRESSAO'),
      cmd.LINE_FEED,
      cmd.NORMAL_SIZE,
      cmd.LINE_FEED,
      this.textToBytes('================================'),
      cmd.LINE_FEED,
      cmd.ALIGN_LEFT,
      cmd.LINE_FEED,
      this.textToBytes('Impressora: ' + (this.device?.productName || 'USB Printer')),
      cmd.LINE_FEED,
      this.textToBytes('Protocolo: ' + this.language.toUpperCase()),
      cmd.LINE_FEED,
      this.textToBytes('Data/Hora: ' + new Date().toLocaleString('pt-BR')),
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.ALIGN_CENTER,
      this.textToBytes('================================'),
      cmd.LINE_FEED,
      cmd.BOLD_ON,
      this.textToBytes('CONEXAO OK!'),
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      this.textToBytes('================================'),
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      cmd.CUT_PAPER_PARTIAL,
    );

    await this.sendData(testContent);
  }

  // Print service order receipt
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
    terms?: string[]; 
  }): Promise<void> {
    const cmd = this.getCommands();
    const line = '----------------------------------------';
    const doubleLine = '========================================';
    
    const formatCurrency = (value: number) => {
      return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const content = this.combineBytes(
      cmd.INIT,
      cmd.ALIGN_CENTER,
      cmd.BOLD_ON,
      cmd.DOUBLE_SIZE,
      this.textToBytes(order.storeName),
      cmd.LINE_FEED,
      cmd.NORMAL_SIZE,
      cmd.BOLD_OFF,
      order.storePhone ? this.combineBytes(this.textToBytes(order.storePhone), cmd.LINE_FEED) : new Uint8Array(),
      order.storeAddress ? this.combineBytes(this.textToBytes(order.storeAddress), cmd.LINE_FEED) : new Uint8Array(),
      this.textToBytes(doubleLine),
      cmd.LINE_FEED,
      cmd.BOLD_ON,
      this.textToBytes('ORDEM DE SERVICO'),
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      cmd.DOUBLE_SIZE,
      this.textToBytes('#' + order.orderNumber),
      cmd.NORMAL_SIZE,
      cmd.LINE_FEED,
      this.textToBytes(doubleLine),
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      
      // Client info
      cmd.ALIGN_LEFT,
      cmd.BOLD_ON,
      this.textToBytes('CLIENTE'),
      cmd.BOLD_OFF,
      cmd.LINE_FEED,
      this.textToBytes(line),
      cmd.LINE_FEED,
      this.textToBytes('Nome: ' + order.clientName),
      cmd.LINE_FEED,
      this.textToBytes('Telefone: ' + order.clientPhone),
      cmd.LINE_FEED,
      cmd.LINE_FEED,
      
      // Device info
The message truncated; but user likely wants full file returned with import. I provided it. Need to finish with brief instruction: Tell them the exact added line and where to paste. But must avoid extra redundant steps. Keep short apology and confirm next action. Provide final.
