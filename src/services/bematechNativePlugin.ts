// Bematech Native Plugin Bridge
// Interface TypeScript para comunicação com o SDK nativo Android (.aar)
// As bibliotecas e1-V02.20.02-release.aar e InterfaceAutomacao-v2.0.0.12.aar
// devem ser integradas ao projeto Android nativo

import { registerPlugin } from '@capacitor/core';

export interface BematechPrinterInfo {
  connected: boolean;
  model: string;
  serialNumber: string;
  firmwareVersion: string;
}

export interface BematechPrintResult {
  success: boolean;
  error?: string;
}

export interface BematechConnectionResult {
  success: boolean;
  printerInfo?: BematechPrinterInfo;
  error?: string;
}

export interface BematechNativePluginInterface {
  /**
   * Inicializa o SDK Bematech
   * Deve ser chamado antes de qualquer operação
   */
  initialize(): Promise<{ success: boolean; error?: string }>;

  /**
   * Busca e conecta à impressora Bematech via USB
   * O SDK lida internamente com permissões USB do Android
   */
  connect(): Promise<BematechConnectionResult>;

  /**
   * Conecta via VID/PID específico
   * Substitui toda lógica de openDevice/claimInterface
   */
  connectUsb(options: { vid: number; pid?: number }): Promise<BematechConnectionResult>;

  /**
   * Envia comandos ESC/POS diretamente
   */
  sendEscPos(options: { command: string }): Promise<{ success: boolean; bytesTransferred?: number; error?: string }>;

  /**
   * Desconecta da impressora
   */
  disconnect(): Promise<{ success: boolean }>;

  /**
   * Verifica se está conectado
   */
  isConnected(): Promise<{ connected: boolean }>;

  /**
   * Obtém informações da impressora conectada
   */
  getPrinterInfo(): Promise<BematechPrinterInfo>;

  /**
   * Envia texto formatado para impressão
   * Suporta formatação ESC/BEMA nativa
   */
  printText(options: { text: string }): Promise<BematechPrintResult>;

  /**
   * Envia comandos ESC/POS raw
   */
  printRaw(options: { data: string }): Promise<BematechPrintResult>;

  /**
   * Envia comandos ESC/BEMA raw
   */
  printRawBema(options: { data: string }): Promise<BematechPrintResult>;

  /**
   * Imprime com formatação (negrito, alinhamento, etc)
   */
  printFormatted(options: {
    text: string;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
    size?: 'normal' | 'double' | 'large';
  }): Promise<BematechPrintResult>;

  /**
   * Avança papel (line feed)
   */
  feedPaper(options: { lines: number }): Promise<BematechPrintResult>;

  /**
   * Corta o papel
   */
  cutPaper(options: { partial?: boolean }): Promise<BematechPrintResult>;

  /**
   * Abre a gaveta de dinheiro (se conectada)
   */
  openCashDrawer(): Promise<BematechPrintResult>;

  /**
   * Imprime código de barras
   */
  printBarcode(options: { 
    data: string; 
    type: 'CODE39' | 'CODE128' | 'EAN13' | 'EAN8' | 'UPCA' | 'UPCE';
    height?: number;
    width?: number;
  }): Promise<BematechPrintResult>;

  /**
   * Imprime QR Code
   */
  printQRCode(options: { 
    data: string; 
    size?: number;
  }): Promise<BematechPrintResult>;

  /**
   * Teste de impressão
   */
  testPrint(): Promise<BematechPrintResult>;

  /**
   * Adiciona listener para eventos de conexão/desconexão
   */
  addListener(
    eventName: 'printerConnected' | 'printerDisconnected' | 'printerError',
    listenerFunc: (data: { message?: string }) => void
  ): Promise<{ remove: () => void }>;
}

// Registra o plugin - será implementado no lado nativo Android
const BematechNativePlugin = registerPlugin<BematechNativePluginInterface>('BematechNativePlugin', {
  web: () => import('./bematechWebFallback').then(m => new m.BematechWebFallback()),
});

export default BematechNativePlugin;
