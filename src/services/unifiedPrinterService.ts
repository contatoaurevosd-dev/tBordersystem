// Unified Printer Service
// Automatically detects and uses:
// 1. Bematech Native SDK (Android - preferred for Bematech printers)
// 2. Capacitor USB Serial (Android - fallback)
// 3. WebUSB (Browser)
// Implements async USB permission flow for reliable connections

import { Capacitor } from '@capacitor/core';
import { printerService } from './printerService';
import { capacitorPrinterService, type CapacitorPrinterConfig } from './capacitorPrinterService';
import { bematechPrinterService } from './bematechPrinterService';
import { usbPermissionManager } from './usbPermissionManager';
import type { PrinterConfig } from './printerService';

export interface UnifiedPrinterConfig {
  name: string;
  port: string;
  language: 'escpos' | 'escbema';
  isNative: boolean;
  usingSdk?: boolean; // Indica se está usando SDK Bematech nativo
}

class UnifiedPrinterService {
  private useBematechSdk: boolean = false;

  // Check if running on native platform
  isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  // Check if running on Android (where Bematech SDK works)
  isAndroid(): boolean {
    return Capacitor.getPlatform() === 'android';
  }

  // Check if WebUSB is supported
  isWebUSBSupported(): boolean {
    return !this.isNative() && printerService.isSupported();
  }

  // Check if any USB method is available
  isSupported(): boolean {
    return this.isNative() || this.isWebUSBSupported();
  }

  // Check if using Bematech SDK
  isUsingBematechSdk(): boolean {
    return this.useBematechSdk;
  }

  // Get platform info
  getPlatformInfo(): string {
    if (this.isNative()) {
      if (this.useBematechSdk) {
        return `SDK Bematech Nativo (${Capacitor.getPlatform()})`;
      }
      return `Capacitor USB Serial (${Capacitor.getPlatform()})`;
    }
    if (this.isWebUSBSupported()) {
      return 'WebUSB (Browser)';
    }
    return 'Não suportado';
  }

  // Search for printer - Tries Bematech SDK first on Android
  async searchPrinter(): Promise<UnifiedPrinterConfig | null> {
    if (this.isNative() && this.isAndroid()) {
      // Try Bematech SDK first (handles USB permissions internally)
      try {
        console.log('[UnifiedPrinterService] Tentando SDK Bematech nativo...');
        const bematechConfig = await bematechPrinterService.connect();
        
        if (bematechConfig && bematechConfig.connected) {
          this.useBematechSdk = true;
          console.log('[UnifiedPrinterService] Conectado via SDK Bematech');
          return {
            name: bematechConfig.model,
            port: 'SDK Bematech',
            language: 'escbema',
            isNative: true,
            usingSdk: true,
          };
        }
      } catch (bematechError: any) {
        console.warn('[UnifiedPrinterService] SDK Bematech não disponível:', bematechError.message);
        // Fall through to try Capacitor USB Serial
      }

      // Fallback to Capacitor USB Serial
      console.log('[UnifiedPrinterService] Tentando Capacitor USB Serial...');
      try {
        const config = await capacitorPrinterService.searchPrinter();
        if (config) {
          this.useBematechSdk = false;
          return {
            name: config.name,
            port: config.port,
            language: config.language,
            isNative: true,
            usingSdk: false,
          };
        }
      } catch (capacitorError: any) {
        console.error('[UnifiedPrinterService] Capacitor USB Serial falhou:', capacitorError.message);
        throw capacitorError;
      }
      
      return null;
    }

    if (this.isWebUSBSupported()) {
      const config = await printerService.searchPrinter();
      if (config) {
        this.useBematechSdk = false;
        return {
          name: config.name,
          port: config.port,
          language: config.language,
          isNative: false,
          usingSdk: false,
        };
      }
      return null;
    }

    throw new Error('Nenhum método de conexão USB disponível neste dispositivo.');
  }

  // Reconnect to saved printer
  async reconnect(): Promise<UnifiedPrinterConfig | null> {
    if (this.isNative() && this.isAndroid()) {
      // Try Bematech SDK first
      try {
        const bematechConfig = await bematechPrinterService.connect();
        if (bematechConfig && bematechConfig.connected) {
          this.useBematechSdk = true;
          return {
            name: bematechConfig.model,
            port: 'SDK Bematech',
            language: 'escbema',
            isNative: true,
            usingSdk: true,
          };
        }
      } catch (bematechError) {
        console.warn('[UnifiedPrinterService] Reconexão SDK Bematech falhou, tentando Capacitor...');
      }

      // Fallback to Capacitor
      const config = await capacitorPrinterService.reconnect();
      if (config) {
        this.useBematechSdk = false;
        return {
          name: config.name,
          port: config.port,
          language: config.language,
          isNative: true,
          usingSdk: false,
        };
      }
      return null;
    }

    if (this.isWebUSBSupported()) {
      const config = await printerService.reconnect();
      if (config) {
        this.useBematechSdk = false;
        return {
          name: config.name,
          port: config.port,
          language: config.language,
          isNative: false,
          usingSdk: false,
        };
      }
      return null;
    }

    throw new Error('Nenhum método de conexão USB disponível.');
  }

  // Check if connected
  isConnected(): boolean {
    if (this.useBematechSdk) {
      return bematechPrinterService.isReadyForPrintJobs();
    }
    if (this.isNative()) {
      return capacitorPrinterService.isConnected();
    }
    return printerService.isConnected();
  }

  /**
   * Check if ready for print jobs
   * Jobs should call this before attempting to print
   */
  isReadyForPrintJobs(): boolean {
    if (this.useBematechSdk) {
      return bematechPrinterService.isReadyForPrintJobs();
    }
    if (this.isNative()) {
      return capacitorPrinterService.isReadyForPrintJobs();
    }
    return printerService.isConnected();
  }

  /**
   * Get connection state for UI diagnostics
   */
  getConnectionState() {
    if (this.isNative()) {
      return capacitorPrinterService.getConnectionState();
    }
    // For WebUSB, return a compatible state
    return {
      permissionStatus: printerService.isConnected() ? 'granted' : 'unknown',
      connectionStatus: printerService.isConnected() ? 'connected' : 'disconnected',
      device: null,
      lastError: null,
      isPermissionPersisted: false,
    };
  }

  // Disconnect
  async disconnect(): Promise<void> {
    if (this.useBematechSdk) {
      await bematechPrinterService.disconnect();
      this.useBematechSdk = false;
    } else if (this.isNative()) {
      await capacitorPrinterService.disconnect();
    } else {
      await printerService.disconnect();
    }
  }

  // Load saved configuration
  loadConfig(): UnifiedPrinterConfig | null {
    // Check if we have Bematech SDK info stored
    const bematechConnected = localStorage.getItem('using_bematech_sdk') === 'true';
    
    if (this.isNative()) {
      const config = capacitorPrinterService.loadConfig();
      if (config) {
        return {
          name: config.name,
          port: config.port,
          language: config.language,
          isNative: true,
          usingSdk: bematechConnected,
        };
      }
    } else {
      const config = printerService.loadConfig();
      if (config) {
        return {
          name: config.name,
          port: config.port,
          language: config.language,
          isNative: false,
          usingSdk: false,
        };
      }
    }
    return null;
  }

  // Print test page
  async printTestPage(): Promise<void> {
    if (this.useBematechSdk) {
      await bematechPrinterService.testPrint();
    } else if (this.isNative()) {
      await capacitorPrinterService.printTestPage();
    } else {
      await printerService.printTestPage();
    }
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
    terms?: string[];
  }): Promise<void> {
    if (this.useBematechSdk) {
      // Use Bematech SDK para impressão formatada
      await this.printServiceOrderViaBematech(order);
    } else if (this.isNative()) {
      await capacitorPrinterService.printServiceOrder(order);
    } else {
      await printerService.printServiceOrder(order);
    }
  }

  // Print service order using Bematech SDK
  private async printServiceOrderViaBematech(order: {
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
    // Header
    await bematechPrinterService.printFormatted(order.storeName, { align: 'center', bold: true, size: 'double' });
    if (order.storePhone) {
      await bematechPrinterService.printFormatted(order.storePhone, { align: 'center' });
    }
    if (order.storeAddress) {
      await bematechPrinterService.printFormatted(order.storeAddress, { align: 'center' });
    }
    
    await bematechPrinterService.printText('================================');
    await bematechPrinterService.printFormatted(`O.S. #${order.orderNumber}`, { align: 'center', bold: true, size: 'double' });
    await bematechPrinterService.printText('================================');
    
    // Client info
    await bematechPrinterService.printFormatted('CLIENTE', { bold: true });
    await bematechPrinterService.printText(`Nome: ${order.clientName}`);
    await bematechPrinterService.printText(`Telefone: ${order.clientPhone}`);
    
    // Device info
    await bematechPrinterService.printText('--------------------------------');
    await bematechPrinterService.printFormatted('APARELHO', { bold: true });
    await bematechPrinterService.printText(`${order.brand} ${order.model}`);
    await bematechPrinterService.printText(`Cor: ${order.deviceColor}`);
    await bematechPrinterService.printText(`Estado Físico: ${order.physicalCondition}`);
    await bematechPrinterService.printText(`Acessórios: ${order.accessories}`);
    
    // Problem
    await bematechPrinterService.printText('--------------------------------');
    await bematechPrinterService.printFormatted('PROBLEMA', { bold: true });
    await bematechPrinterService.printText(order.problemDescription);
    
    // Password
    if (order.passwordValue) {
      await bematechPrinterService.printText('--------------------------------');
      await bematechPrinterService.printText(`Senha (${order.passwordType}): ${order.passwordValue}`);
    }
    
    // Values
    await bematechPrinterService.printText('================================');
    await bematechPrinterService.printFormatted('VALORES', { bold: true });
    await bematechPrinterService.printText(`Serviço: R$ ${order.serviceValue.toFixed(2)}`);
    await bematechPrinterService.printText(`Entrada: R$ ${order.entryValue.toFixed(2)}`);
    await bematechPrinterService.printFormatted(`Restante: R$ ${order.remainingValue.toFixed(2)}`, { bold: true });
    
    // Delivery
    if (order.estimatedDelivery) {
      await bematechPrinterService.printText('--------------------------------');
      await bematechPrinterService.printText(`Previsão: ${order.estimatedDelivery}`);
    }
    
    // Observations
    if (order.observations) {
      await bematechPrinterService.printText('--------------------------------');
      await bematechPrinterService.printFormatted('OBSERVAÇÕES', { bold: true });
      await bematechPrinterService.printText(order.observations);
    }
    
    // Footer
    await bematechPrinterService.printText('================================');
    await bematechPrinterService.printFormatted(`Atendente: ${order.attendantName}`, { align: 'center' });
    await bematechPrinterService.printFormatted(order.createdAt, { align: 'center' });
    
    // Terms
    if (order.terms && order.terms.length > 0) {
      await bematechPrinterService.printText('--------------------------------');
      await bematechPrinterService.printFormatted('TERMOS', { bold: true });
      for (const term of order.terms) {
        await bematechPrinterService.printText(`• ${term}`);
      }
    }
    
    // Signature line
    await bematechPrinterService.feedPaper(2);
    await bematechPrinterService.printText('________________________________');
    await bematechPrinterService.printFormatted('Assinatura do Cliente', { align: 'center' });
    
    await bematechPrinterService.feedPaper(3);
    await bematechPrinterService.cutPaper(true);
  }

  // Get device info
  getDeviceInfo(): { name: string; port: string; language: string } | null {
    if (this.useBematechSdk) {
      return {
        name: 'Bematech (SDK Nativo)',
        port: 'USB',
        language: 'escbema',
      };
    }
    if (this.isNative()) {
      return capacitorPrinterService.getDeviceInfo();
    }
    return printerService.getDeviceInfo();
  }

  // Get current language
  getLanguage(): 'escpos' | 'escbema' {
    if (this.useBematechSdk) {
      return 'escbema';
    }
    if (this.isNative()) {
      return capacitorPrinterService.getLanguage();
    }
    return printerService.getLanguage();
  }

  // Set language
  setLanguage(lang: 'escpos' | 'escbema'): void {
    if (this.isNative() && !this.useBematechSdk) {
      capacitorPrinterService.setLanguage(lang);
    } else if (!this.isNative()) {
      printerService.setLanguage(lang);
    }
    // Bematech SDK always uses escbema
  }

  // Force reset USB connection (for troubleshooting)
  async forceResetUSB(): Promise<void> {
    if (this.useBematechSdk) {
      await bematechPrinterService.disconnect();
      this.useBematechSdk = false;
    }
    if (this.isNative()) {
      await capacitorPrinterService.forceResetUSB();
    } else {
      await printerService.forceResetUSB();
    }
    usbPermissionManager.forceReset();
    localStorage.removeItem('using_bematech_sdk');
  }
}

// Export singleton instance
export const unifiedPrinterService = new UnifiedPrinterService();
