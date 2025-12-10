/**
 * USB Permission Manager
 * Gerencia o fluxo assíncrono de permissões USB para Android
 * Implementa padrão BroadcastReceiver para eventos USB
 */

export type UsbPermissionStatus = 'unknown' | 'pending' | 'granted' | 'denied';
export type UsbConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface UsbDeviceInfo {
  deviceId: number;
  vendorId: number;
  productId: number;
  deviceName: string;
}

export interface UsbConnectionState {
  permissionStatus: UsbPermissionStatus;
  connectionStatus: UsbConnectionStatus;
  device: UsbDeviceInfo | null;
  lastError: string | null;
  isPermissionPersisted: boolean;
}

type ConnectionCallback = (status: UsbConnectionStatus, error?: string) => void;

class UsbPermissionManager {
  private state: UsbConnectionState = {
    permissionStatus: 'unknown',
    connectionStatus: 'disconnected',
    device: null,
    lastError: null,
    isPermissionPersisted: false,
  };

  private connectionCallbacks: ConnectionCallback[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Verifica se já existe permissão persistida para o dispositivo
   */
  checkExistingPermission(device: UsbDeviceInfo): boolean {
    const permissionKey = `usb_permission_${device.vendorId}_${device.productId}`;
    return localStorage.getItem(permissionKey) === 'granted';
  }

  /**
   * Persiste a permissão após ser concedida
   */
  persistPermission(device: UsbDeviceInfo): void {
    const permissionKey = `usb_permission_${device.vendorId}_${device.productId}`;
    localStorage.setItem(permissionKey, 'granted');
    this.state.isPermissionPersisted = true;
  }

  /**
   * Atualiza estado de permissão
   */
  setPermissionGranted(device: UsbDeviceInfo): void {
    this.state.permissionStatus = 'granted';
    this.state.device = device;
    this.persistPermission(device);
  }

  /**
   * Atualiza estado de conexão
   */
  setConnectionStatus(status: UsbConnectionStatus, error?: string): void {
    this.state.connectionStatus = status;
    if (error) this.state.lastError = error;
    this.connectionCallbacks.forEach(cb => cb(status, error));
  }

  /**
   * Verifica se conexão está pronta para jobs
   */
  isConnectionReady(): boolean {
    return this.state.connectionStatus === 'connected' && this.state.permissionStatus === 'granted';
  }

  /**
   * Retorna estado atual
   */
  getState(): UsbConnectionState {
    return { ...this.state };
  }

  /**
   * Registra callback para eventos de conexão
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Agenda reconexão automática
   */
  scheduleReconnect(reconnectFn: () => Promise<any>): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('[UsbPermissionManager] Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    console.log(`[UsbPermissionManager] Scheduling reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(async () => {
      await reconnectFn();
    }, delay);
  }

  /**
   * Reseta contagem de reconexão
   */
  resetReconnectAttempts(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Força reset
   */
  forceReset(): void {
    this.state = {
      permissionStatus: 'unknown',
      connectionStatus: 'disconnected',
      device: null,
      lastError: null,
      isPermissionPersisted: false,
    };
    this.resetReconnectAttempts();
    this.connectionCallbacks.forEach(cb => cb('disconnected'));
  }

  /**
   * Limpa permissões persistidas
   */
  clearPersistedPermissions(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith('usb_permission_'));
    keys.forEach(k => localStorage.removeItem(k));
    this.state.isPermissionPersisted = false;
  }
}

export const usbPermissionManager = new UsbPermissionManager();
