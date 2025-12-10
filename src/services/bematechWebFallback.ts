// Web fallback para o plugin Bematech quando não está no Android nativo
// Retorna erros apropriados indicando que a funcionalidade requer Android

import type { 
  BematechNativePluginInterface, 
  BematechPrinterInfo, 
  BematechPrintResult, 
  BematechConnectionResult 
} from './bematechNativePlugin';

export class BematechWebFallback implements BematechNativePluginInterface {
  private throwNotSupported(): never {
    throw new Error('SDK Bematech requer execução nativa no Android. Use o Print Bridge em um dispositivo Android com a impressora conectada via OTG.');
  }

  async initialize(): Promise<{ success: boolean; error?: string }> {
    console.warn('[BematechWebFallback] SDK não disponível no ambiente web');
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async connect(): Promise<BematechConnectionResult> {
    console.warn('[BematechWebFallback] Conexão não disponível no ambiente web');
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async connectUsb(options: { vid: number; pid?: number }): Promise<BematechConnectionResult> {
    console.warn('[BematechWebFallback] connectUsb não disponível no ambiente web');
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async sendEscPos(options: { command: string }): Promise<{ success: boolean; bytesTransferred?: number; error?: string }> {
    console.warn('[BematechWebFallback] sendEscPos não disponível no ambiente web');
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async disconnect(): Promise<{ success: boolean }> {
    return { success: true };
  }

  async isConnected(): Promise<{ connected: boolean }> {
    return { connected: false };
  }

  async getPrinterInfo(): Promise<BematechPrinterInfo> {
    return {
      connected: false,
      model: 'N/A',
      serialNumber: 'N/A',
      firmwareVersion: 'N/A',
    };
  }

  async printText(options: { text: string }): Promise<BematechPrintResult> {
    console.log('[BematechWebFallback] printText:', options.text);
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async printRaw(options: { data: string }): Promise<BematechPrintResult> {
    console.log('[BematechWebFallback] printRaw:', options.data.length, 'bytes');
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async printRawBema(options: { data: string }): Promise<BematechPrintResult> {
    console.log('[BematechWebFallback] printRawBema:', options.data.length, 'bytes');
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async printFormatted(options: {
    text: string;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    size?: 'normal' | 'double' | 'large';
  }): Promise<BematechPrintResult> {
    console.log('[BematechWebFallback] printFormatted:', options);
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async feedPaper(options: { lines: number }): Promise<BematechPrintResult> {
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async cutPaper(options: { partial?: boolean }): Promise<BematechPrintResult> {
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async openCashDrawer(): Promise<BematechPrintResult> {
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async printBarcode(options: { 
    data: string; 
    type: 'CODE39' | 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE';
    height?: number;
    width?: number;
  }): Promise<BematechPrintResult> {
    console.log('[BematechWebFallback] printBarcode:', options);
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async printQRCode(options: { 
    data: string; 
    size?: number;
  }): Promise<BematechPrintResult> {
    console.log('[BematechWebFallback] printQRCode:', options);
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async testPrint(): Promise<BematechPrintResult> {
    console.log('[BematechWebFallback] testPrint');
    return { success: false, error: 'SDK Bematech requer Android nativo' };
  }

  async addListener(
    eventName: 'printerConnected' | 'printerDisconnected' | 'printerError',
    listenerFunc: (data: { message?: string }) => void
  ): Promise<{ remove: () => void }> {
    console.log('[BematechWebFallback] addListener:', eventName);
    return { remove: () => {} };
  }
}
