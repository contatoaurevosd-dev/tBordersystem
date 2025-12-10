// Bematech Printer Service
// Wrapper que usa o SDK nativo quando disponível, com fallback para capacitor-usb-serial

import { Capacitor } from '@capacitor/core';
import BematechNativePlugin, { BematechPrinterInfo, BematechConnectionResult } from './bematechNativePlugin';
import { usbPermissionManager } from './usbPermissionManager';

export interface BematechPrinterConfig {
  connected: boolean;
  model: string;
  usingSdk: boolean;
  serialNumber?: string;
  firmwareVersion?: string;
}

class BematechPrinterService {
  private initialized: boolean = false;
  private connected: boolean = false;
  private usingSdk: boolean = false;
  private printerInfo: BematechPrinterInfo | null = null;
  private connectionListenerRemove: (() => void) | null = null;
  private disconnectionListenerRemove: (() => void) | null = null;
  private errorListenerRemove: (() => void) | null = null;

  /**
   * Verifica se está rodando em Android nativo
   */
  isNative(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  }

  /**
   * Inicializa o SDK Bematech
   */
  async initialize(): Promise<boolean> {
    if (!this.isNative()) {
      console.log('[BematechPrinterService] Não está em Android nativo');
      return false;
    }

    if (this.initialized) {
      return true;
    }

    try {
      console.log('[BematechPrinterService] Inicializando SDK Bematech...');
      
      const result = await BematechNativePlugin.initialize();
      
      if (result.success) {
        this.initialized = true;
        this.usingSdk = true;
        
        // Configurar listeners para eventos de conexão
        await this.setupEventListeners();
        
        console.log('[BematechPrinterService] SDK inicializado com sucesso');
        return true;
      } else {
        console.warn('[BematechPrinterService] Falha ao inicializar SDK:', result.error);
        return false;
      }
    } catch (error: any) {
      console.error('[BematechPrinterService] Erro ao inicializar SDK:', error);
      return false;
    }
  }

  /**
   * Configura listeners para eventos do SDK nativo
   */
  private async setupEventListeners(): Promise<void> {
    try {
      // Listener de conexão
      const connListener = await BematechNativePlugin.addListener('printerConnected', (data) => {
        console.log('[BematechPrinterService] Evento: Impressora conectada', data);
        this.connected = true;
        usbPermissionManager.setConnectionStatus('connected');
      });
      this.connectionListenerRemove = connListener.remove;

      // Listener de desconexão
      const disconnListener = await BematechNativePlugin.addListener('printerDisconnected', (data) => {
        console.log('[BematechPrinterService] Evento: Impressora desconectada', data);
        this.connected = false;
        this.printerInfo = null;
        usbPermissionManager.setConnectionStatus('disconnected');
        
        // Tentar reconectar automaticamente
        this.scheduleAutoReconnect();
      });
      this.disconnectionListenerRemove = disconnListener.remove;

      // Listener de erros
      const errListener = await BematechNativePlugin.addListener('printerError', (data) => {
        console.error('[BematechPrinterService] Evento: Erro na impressora', data);
        usbPermissionManager.setConnectionStatus('error', data.message || 'Erro desconhecido');
      });
      this.errorListenerRemove = errListener.remove;

    } catch (error) {
      console.warn('[BematechPrinterService] Erro ao configurar listeners:', error);
    }
  }

  /**
   * Agenda reconexão automática
   */
  private scheduleAutoReconnect(): void {
    console.log('[BematechPrinterService] Agendando reconexão automática...');
    
    usbPermissionManager.scheduleReconnect(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('[BematechPrinterService] Falha na reconexão automática:', error);
      }
    });
  }

  /**
   * Conecta à impressora Bematech via SDK nativo
   */
  async connect(): Promise<BematechPrinterConfig | null> {
    if (!this.isNative()) {
      throw new Error('SDK Bematech requer Android nativo');
    }

    // Inicializar se necessário
    if (!this.initialized) {
      const initResult = await this.initialize();
      if (!initResult) {
        throw new Error('Falha ao inicializar SDK Bematech');
      }
    }

    console.log('[BematechPrinterService] Conectando via SDK nativo...');
    usbPermissionManager.setConnectionStatus('connecting');

    try {
      const result: BematechConnectionResult = await BematechNativePlugin.connect();
      
      if (result.success && result.printerInfo) {
        this.connected = true;
        this.printerInfo = result.printerInfo;
        
        usbPermissionManager.setConnectionStatus('connected');
        usbPermissionManager.resetReconnectAttempts();
        
        console.log('[BematechPrinterService] Conectado:', result.printerInfo);
        
        return {
          connected: true,
          model: result.printerInfo.model,
          usingSdk: true,
          serialNumber: result.printerInfo.serialNumber,
          firmwareVersion: result.printerInfo.firmwareVersion,
        };
      } else {
        throw new Error(result.error || 'Falha ao conectar');
      }
    } catch (error: any) {
      console.error('[BematechPrinterService] Erro ao conectar:', error);
      this.connected = false;
      usbPermissionManager.setConnectionStatus('error', error.message);
      throw error;
    }
  }

  /**
   * Desconecta da impressora
   */
  async disconnect(): Promise<void> {
    if (!this.usingSdk) return;

    try {
      await BematechNativePlugin.disconnect();
      this.connected = false;
      this.printerInfo = null;
      usbPermissionManager.setConnectionStatus('disconnected');
      console.log('[BematechPrinterService] Desconectado');
    } catch (error) {
      console.error('[BematechPrinterService] Erro ao desconectar:', error);
    }
  }

  /**
   * Verifica se está conectado
   */
  async isConnected(): Promise<boolean> {
    if (!this.usingSdk) return false;

    try {
      const result = await BematechNativePlugin.isConnected();
      this.connected = result.connected;
      return result.connected;
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica se está pronto para receber jobs de impressão
   */
  isReadyForPrintJobs(): boolean {
    return this.connected && this.usingSdk;
  }

  /**
   * Obtém informações da impressora
   */
  async getPrinterInfo(): Promise<BematechPrinterInfo | null> {
    if (!this.usingSdk || !this.connected) return null;

    try {
      this.printerInfo = await BematechNativePlugin.getPrinterInfo();
      return this.printerInfo;
    } catch (error) {
      console.error('[BematechPrinterService] Erro ao obter info:', error);
      return null;
    }
  }

  /**
   * Imprime texto simples
   */
  async printText(text: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Impressora não conectada');
    }

    try {
      const result = await BematechNativePlugin.printText({ text });
      return result.success;
    } catch (error: any) {
      console.error('[BematechPrinterService] Erro ao imprimir:', error);
      throw error;
    }
  }

  /**
   * Envia comandos ESC/POS raw
   */
  async printRaw(data: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Impressora não conectada');
    }

    try {
      const result = await BematechNativePlugin.printRaw({ data });
      return result.success;
    } catch (error: any) {
      console.error('[BematechPrinterService] Erro ao enviar raw:', error);
      throw error;
    }
  }

  /**
   * Envia comandos ESC/BEMA raw
   */
  async printRawBema(data: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Impressora não conectada');
    }

    try {
      const result = await BematechNativePlugin.printRawBema({ data });
      return result.success;
    } catch (error: any) {
      console.error('[BematechPrinterService] Erro ao enviar ESC/BEMA:', error);
      throw error;
    }
  }

  /**
   * Imprime com formatação
   */
  async printFormatted(
    text: string, 
    options: {
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
      size?: 'normal' | 'double' | 'large';
    } = {}
  ): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Impressora não conectada');
    }

    try {
      const result = await BematechNativePlugin.printFormatted({
        text,
        bold: options.bold,
        align: options.align,
        size: options.size,
      });
      return result.success;
    } catch (error: any) {
      console.error('[BematechPrinterService] Erro ao imprimir formatado:', error);
      throw error;
    }
  }

  /**
   * Avança papel
   */
  async feedPaper(lines: number = 3): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const result = await BematechNativePlugin.feedPaper({ lines });
      return result.success;
    } catch (error) {
      console.error('[BematechPrinterService] Erro ao avançar papel:', error);
      return false;
    }
  }

  /**
   * Corta o papel
   */
  async cutPaper(partial: boolean = true): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const result = await BematechNativePlugin.cutPaper({ partial });
      return result.success;
    } catch (error) {
      console.error('[BematechPrinterService] Erro ao cortar papel:', error);
      return false;
    }
  }

  /**
   * Abre gaveta de dinheiro
   */
  async openCashDrawer(): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const result = await BematechNativePlugin.openCashDrawer();
      return result.success;
    } catch (error) {
      console.error('[BematechPrinterService] Erro ao abrir gaveta:', error);
      return false;
    }
  }

  /**
   * Imprime código de barras
   */
  async printBarcode(
    data: string,
    type: 'CODE39' | 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE' = 'CODE128',
    height: number = 80,
    width: number = 2
  ): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const result = await BematechNativePlugin.printBarcode({ data, type, height, width });
      return result.success;
    } catch (error) {
      console.error('[BematechPrinterService] Erro ao imprimir barcode:', error);
      return false;
    }
  }

  /**
   * Imprime QR Code
   */
  async printQRCode(data: string, size: number = 4): Promise<boolean> {
    if (!this.connected) return false;

    try {
      const result = await BematechNativePlugin.printQRCode({ data, size });
      return result.success;
    } catch (error) {
      console.error('[BematechPrinterService] Erro ao imprimir QRCode:', error);
      return false;
    }
  }

  /**
   * Executa teste de impressão
   */
  async testPrint(): Promise<boolean> {
    if (!this.connected) {
      throw new Error('Impressora não conectada');
    }

    try {
      const result = await BematechNativePlugin.testPrint();
      return result.success;
    } catch (error: any) {
      console.error('[BematechPrinterService] Erro no teste:', error);
      throw error;
    }
  }

  /**
   * Limpa listeners ao destruir
   */
  destroy(): void {
    if (this.connectionListenerRemove) {
      this.connectionListenerRemove();
    }
    if (this.disconnectionListenerRemove) {
      this.disconnectionListenerRemove();
    }
    if (this.errorListenerRemove) {
      this.errorListenerRemove();
    }
  }
}

export const bematechPrinterService = new BematechPrinterService();
export default bematechPrinterService;
