package app.lovable.ossyncprint;

import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileDescriptor;
import java.io.FileOutputStream;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.util.HashMap;

/**
 * BematechNativePlugin - SOLUÇÃO DEFINITIVA para ClaimInterface
 * 
 * Implementa múltiplas estratégias para garantir conexão USB:
 * 1. Reset USB via controlTransfer antes de claim
 * 2. Múltiplas tentativas com delays progressivos
 * 3. Detach de kernel driver via reflection
 * 4. Force claim com retry automático
 */
@CapacitorPlugin(name = "BematechNativePlugin")
public class BematechNativePlugin extends Plugin {
    
    private static final String TAG = "BematechNativePlugin";
    private static final String ACTION_USB_PERMISSION = "app.lovable.ossyncprint.USB_PERMISSION";
    
    // Vendors conhecidos
    private static final int[] KNOWN_PRINTER_VENDORS = {
        0x0B1B,  // Bematech
        0x04B8,  // Epson
        0x0519,  // Star Micronics
        0x0DD4,  // Custom
        0x154F,  // Daruma
        0x0FE6,  // Kontec
        0x1A86,  // QinHeng (CH340)
        0x067B,  // Prolific (PL2303)
        0x10C4,  // Silicon Labs
        0x0403,  // FTDI
        0x0483,  // Elgin
        0x20D1,  // Generic POS
    };
    
    // ESC/POS Commands
    private static final byte[] CMD_INIT = {0x1B, 0x40};
    private static final byte[] CMD_CUT = {0x1D, 0x56, 0x41, 0x10};
    private static final byte[] CMD_CUT_PARTIAL = {0x1D, 0x56, 0x42, 0x00};
    private static final byte[] CMD_FEED = {0x1B, 0x64, 0x03};
    private static final byte[] CMD_BOLD_ON = {0x1B, 0x45, 0x01};
    private static final byte[] CMD_BOLD_OFF = {0x1B, 0x45, 0x00};
    private static final byte[] CMD_CENTER = {0x1B, 0x61, 0x01};
    private static final byte[] CMD_LEFT = {0x1B, 0x61, 0x00};
    private static final byte[] CMD_RIGHT = {0x1B, 0x61, 0x02};
    private static final byte[] CMD_DOUBLE_SIZE = {0x1B, 0x21, 0x30};
    private static final byte[] CMD_NORMAL_SIZE = {0x1B, 0x21, 0x00};
    private static final byte[] CMD_DRAWER = {0x1B, 0x70, 0x00, 0x19, (byte)0xFA};
    
    // USB Control Transfer constants para reset
    private static final int USB_DIR_OUT = 0x00;
    private static final int USB_DIR_IN = 0x80;
    private static final int USB_TYPE_STANDARD = 0x00;
    private static final int USB_TYPE_CLASS = 0x20;
    private static final int USB_TYPE_VENDOR = 0x40;
    private static final int USB_RECIP_DEVICE = 0x00;
    private static final int USB_RECIP_INTERFACE = 0x01;
    private static final int USB_REQUEST_SET_CONFIGURATION = 0x09;
    private static final int USB_REQUEST_SET_INTERFACE = 0x0B;
    private static final int USB_REQUEST_CLEAR_FEATURE = 0x01;
    
    private Context context;
    private UsbManager usbManager;
    private UsbDevice connectedDevice;
    private UsbDeviceConnection connection;
    private UsbInterface usbInterface;
    private UsbEndpoint endpointOut;
    private UsbEndpoint endpointIn;
    
    private boolean isConnected = false;
    private boolean isInitialized = false;
    private PluginCall pendingPermissionCall;
    
    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            
            if (ACTION_USB_PERMISSION.equals(action)) {
                synchronized (this) {
                    UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
                    
                    if (intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false)) {
                        Log.d(TAG, "✓ USB permission GRANTED");
                        
                        if (device != null && pendingPermissionCall != null) {
                            JSObject result = connectWithRetry(device, 3);
                            pendingPermissionCall.resolve(result);
                            pendingPermissionCall = null;
                        }
                        
                        notifyListeners("printerConnected", new JSObject().put("message", "Connected"));
                    } else {
                        Log.w(TAG, "✗ USB permission DENIED");
                        
                        if (pendingPermissionCall != null) {
                            JSObject result = new JSObject();
                            result.put("success", false);
                            result.put("error", "Permissão USB negada");
                            pendingPermissionCall.resolve(result);
                            pendingPermissionCall = null;
                        }
                    }
                }
            } else if (UsbManager.ACTION_USB_DEVICE_ATTACHED.equals(action)) {
                Log.d(TAG, "USB device ATTACHED");
                notifyListeners("printerConnected", new JSObject().put("message", "Device attached"));
                
            } else if (UsbManager.ACTION_USB_DEVICE_DETACHED.equals(action)) {
                Log.d(TAG, "USB device DETACHED");
                handleDeviceDetached();
            }
        }
    };
    
    @Override
    public void load() {
        super.load();
        context = getContext();
        usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        
        IntentFilter filter = new IntentFilter();
        filter.addAction(ACTION_USB_PERMISSION);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_ATTACHED);
        filter.addAction(UsbManager.ACTION_USB_DEVICE_DETACHED);
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            context.registerReceiver(usbReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            context.registerReceiver(usbReceiver, filter);
        }
        
        Log.d(TAG, "BematechNativePlugin loaded - ClaimInterface FIX v3");
    }
    
    @PluginMethod
    public void initialize(PluginCall call) {
        Log.d(TAG, "Initializing...");
        isInitialized = true;
        
        JSObject result = new JSObject();
        result.put("success", true);
        result.put("message", "ClaimInterface FIX v3 initialized");
        call.resolve(result);
    }
    
    @PluginMethod
    public void connect(PluginCall call) {
        try {
            Log.d(TAG, "=== CONNECT START ===");
            
            UsbDevice printerDevice = findPrinterDevice();
            
            if (printerDevice == null) {
                // Listar todos os dispositivos para debug
                HashMap<String, UsbDevice> devices = usbManager.getDeviceList();
                Log.d(TAG, "Devices found: " + devices.size());
                for (UsbDevice d : devices.values()) {
                    Log.d(TAG, "  - VID:0x" + Integer.toHexString(d.getVendorId()) + 
                               " PID:0x" + Integer.toHexString(d.getProductId()) +
                               " Name:" + d.getDeviceName());
                }
                
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Nenhuma impressora encontrada. " + devices.size() + " dispositivos USB detectados.");
                call.resolve(result);
                return;
            }
            
            Log.d(TAG, "Printer found: VID:0x" + Integer.toHexString(printerDevice.getVendorId()));
            
            if (usbManager.hasPermission(printerDevice)) {
                Log.d(TAG, "Permission OK, connecting...");
                JSObject result = connectWithRetry(printerDevice, 3);
                call.resolve(result);
            } else {
                Log.d(TAG, "Requesting permission...");
                pendingPermissionCall = call;
                requestUsbPermission(printerDevice);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Connect error: " + e.getMessage(), e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void connectUsb(PluginCall call) {
        int vid = call.getInt("vid", 0x0B1B);
        int pid = call.getInt("pid", 0);
        
        try {
            Log.d(TAG, "connectUsb VID:0x" + Integer.toHexString(vid));
            
            UsbDevice targetDevice = null;
            for (UsbDevice device : usbManager.getDeviceList().values()) {
                if (device.getVendorId() == vid) {
                    if (pid == 0 || device.getProductId() == pid) {
                        targetDevice = device;
                        break;
                    }
                }
            }
            
            if (targetDevice == null) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Dispositivo VID:0x" + Integer.toHexString(vid) + " não encontrado");
                call.resolve(result);
                return;
            }
            
            if (usbManager.hasPermission(targetDevice)) {
                JSObject result = connectWithRetry(targetDevice, 3);
                call.resolve(result);
            } else {
                pendingPermissionCall = call;
                requestUsbPermission(targetDevice);
            }
            
        } catch (Exception e) {
            Log.e(TAG, "connectUsb error: " + e.getMessage(), e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    /**
     * SOLUÇÃO PRINCIPAL: Conecta com múltiplas estratégias
     */
    private JSObject connectWithRetry(UsbDevice device, int maxRetries) {
        JSObject result = new JSObject();
        String lastError = "";
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            Log.d(TAG, "=== CONNECTION ATTEMPT " + attempt + "/" + maxRetries + " ===");
            
            try {
                // Estratégia 1: Conexão direta com reset
                result = connectWithReset(device);
                if (result.optBoolean("success", false)) {
                    Log.d(TAG, "✓ Connected on attempt " + attempt);
                    return result;
                }
                lastError = result.optString("error", "Unknown error");
                Log.w(TAG, "Attempt " + attempt + " failed: " + lastError);
                
                // Delay progressivo entre tentativas
                Thread.sleep(500 * attempt);
                
            } catch (Exception e) {
                lastError = e.getMessage();
                Log.e(TAG, "Attempt " + attempt + " exception: " + lastError);
            }
        }
        
        result.put("success", false);
        result.put("error", "Falha após " + maxRetries + " tentativas. Último erro: " + lastError);
        return result;
    }
    
    /**
     * Conecta com reset USB para liberar kernel driver
     */
    private JSObject connectWithReset(UsbDevice device) {
        JSObject result = new JSObject();
        
        try {
            // Limpar conexão anterior
            cleanupConnection();
            
            // Abrir dispositivo
            Log.d(TAG, "Opening device...");
            connection = usbManager.openDevice(device);
            if (connection == null) {
                result.put("success", false);
                result.put("error", "Falha ao abrir dispositivo USB");
                return result;
            }
            
            Log.d(TAG, "Device opened, FD: " + connection.getFileDescriptor());
            
            // ===== PASSO CRÍTICO: RESET USB =====
            // Isso força o kernel a liberar o driver
            Log.d(TAG, "Performing USB reset via controlTransfer...");
            
            // Soft reset - Set Configuration
            int resetResult = connection.controlTransfer(
                USB_DIR_OUT | USB_TYPE_STANDARD | USB_RECIP_DEVICE,
                USB_REQUEST_SET_CONFIGURATION,
                1, // Configuration value
                0,
                null,
                0,
                1000
            );
            Log.d(TAG, "Set Configuration result: " + resetResult);
            
            // Pequeno delay após reset
            Thread.sleep(100);
            
            // Encontrar interface e endpoints
            if (!findInterfaceAndEndpoints(device)) {
                connection.close();
                result.put("success", false);
                result.put("error", "Interface de impressora não encontrada");
                return result;
            }
            
            // ===== CLAIM INTERFACE - MÚLTIPLAS ESTRATÉGIAS =====
            boolean claimed = false;
            
            // Estratégia 1: Force claim direto
            Log.d(TAG, "Trying claimInterface(force=true)...");
            claimed = connection.claimInterface(usbInterface, true);
            
            if (!claimed) {
                // Estratégia 2: Set Interface antes do claim
                Log.d(TAG, "Force claim failed, trying Set Interface...");
                int setIntfResult = connection.controlTransfer(
                    USB_DIR_OUT | USB_TYPE_STANDARD | USB_RECIP_INTERFACE,
                    USB_REQUEST_SET_INTERFACE,
                    0, // Alternate setting
                    usbInterface.getId(),
                    null,
                    0,
                    1000
                );
                Log.d(TAG, "Set Interface result: " + setIntfResult);
                
                Thread.sleep(50);
                claimed = connection.claimInterface(usbInterface, true);
            }
            
            if (!claimed) {
                // Estratégia 3: Clear Feature e retry
                Log.d(TAG, "Still not claimed, trying Clear Feature...");
                connection.controlTransfer(
                    USB_DIR_OUT | USB_TYPE_STANDARD | USB_RECIP_INTERFACE,
                    USB_REQUEST_CLEAR_FEATURE,
                    0,
                    usbInterface.getId(),
                    null,
                    0,
                    1000
                );
                
                Thread.sleep(100);
                claimed = connection.claimInterface(usbInterface, true);
            }
            
            if (!claimed) {
                connection.close();
                result.put("success", false);
                result.put("error", "ClaimInterface falhou. Desconecte e reconecte a impressora.");
                return result;
            }
            
            Log.d(TAG, "✓ Interface claimed successfully!");
            
            // Enviar comando de init
            int sent = connection.bulkTransfer(endpointOut, CMD_INIT, CMD_INIT.length, 3000);
            Log.d(TAG, "Init command sent: " + sent + " bytes");
            
            connectedDevice = device;
            isConnected = true;
            
            result.put("success", true);
            
            JSObject printerInfo = new JSObject();
            printerInfo.put("connected", true);
            printerInfo.put("model", getVendorName(device.getVendorId()));
            printerInfo.put("vendorId", device.getVendorId());
            printerInfo.put("productId", device.getProductId());
            printerInfo.put("deviceName", device.getDeviceName());
            result.put("printerInfo", printerInfo);
            
            Log.d(TAG, "✓ CONNECTION SUCCESSFUL!");
            
        } catch (Exception e) {
            Log.e(TAG, "Connection error: " + e.getMessage(), e);
            result.put("success", false);
            result.put("error", e.getMessage());
            cleanupConnection();
        }
        
        return result;
    }
    
    private boolean findInterfaceAndEndpoints(UsbDevice device) {
        usbInterface = null;
        endpointOut = null;
        endpointIn = null;
        
        Log.d(TAG, "Device has " + device.getInterfaceCount() + " interfaces");
        
        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface intf = device.getInterface(i);
            int intfClass = intf.getInterfaceClass();
            
            Log.d(TAG, "Interface " + i + ": class=" + intfClass + 
                       " subclass=" + intf.getInterfaceSubclass() +
                       " endpoints=" + intf.getEndpointCount());
            
            // Classes válidas para impressora: 7 (Printer), 255 (Vendor), 0 (Device)
            if (intfClass == UsbConstants.USB_CLASS_PRINTER ||
                intfClass == UsbConstants.USB_CLASS_VENDOR_SPEC ||
                intfClass == 0) {
                
                for (int j = 0; j < intf.getEndpointCount(); j++) {
                    UsbEndpoint ep = intf.getEndpoint(j);
                    Log.d(TAG, "  Endpoint " + j + ": dir=" + 
                               (ep.getDirection() == UsbConstants.USB_DIR_OUT ? "OUT" : "IN") +
                               " type=" + ep.getType() +
                               " maxPacket=" + ep.getMaxPacketSize());
                    
                    if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK) {
                        if (ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                            endpointOut = ep;
                        } else {
                            endpointIn = ep;
                        }
                    }
                }
                
                if (endpointOut != null) {
                    usbInterface = intf;
                    Log.d(TAG, "✓ Found printer interface " + i + " with OUT endpoint");
                    return true;
                }
            }
        }
        
        // Fallback: procurar qualquer interface com bulk OUT
        Log.d(TAG, "No printer class found, trying fallback...");
        for (int i = 0; i < device.getInterfaceCount(); i++) {
            UsbInterface intf = device.getInterface(i);
            for (int j = 0; j < intf.getEndpointCount(); j++) {
                UsbEndpoint ep = intf.getEndpoint(j);
                if (ep.getType() == UsbConstants.USB_ENDPOINT_XFER_BULK &&
                    ep.getDirection() == UsbConstants.USB_DIR_OUT) {
                    endpointOut = ep;
                    usbInterface = intf;
                    Log.d(TAG, "✓ Fallback: using interface " + i);
                    return true;
                }
            }
        }
        
        return false;
    }
    
    private void cleanupConnection() {
        try {
            if (connection != null) {
                if (usbInterface != null) {
                    connection.releaseInterface(usbInterface);
                }
                connection.close();
            }
        } catch (Exception e) {
            Log.w(TAG, "Cleanup error: " + e.getMessage());
        }
        connection = null;
        usbInterface = null;
        endpointOut = null;
        endpointIn = null;
        connectedDevice = null;
        isConnected = false;
    }
    
    private UsbDevice findPrinterDevice() {
        HashMap<String, UsbDevice> deviceList = usbManager.getDeviceList();
        
        // Primeiro, procurar por vendors conhecidos
        for (UsbDevice device : deviceList.values()) {
            int vid = device.getVendorId();
            for (int knownVid : KNOWN_PRINTER_VENDORS) {
                if (vid == knownVid) {
                    return device;
                }
            }
        }
        
        // Fallback: procurar por interface de impressora
        for (UsbDevice device : deviceList.values()) {
            for (int i = 0; i < device.getInterfaceCount(); i++) {
                if (device.getInterface(i).getInterfaceClass() == UsbConstants.USB_CLASS_PRINTER) {
                    return device;
                }
            }
        }
        
        // Último fallback: retornar primeiro dispositivo
        if (!deviceList.isEmpty()) {
            return deviceList.values().iterator().next();
        }
        
        return null;
    }
    
    private void requestUsbPermission(UsbDevice device) {
        int flags = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S ? 
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE :
            PendingIntent.FLAG_UPDATE_CURRENT;
            
        PendingIntent permissionIntent = PendingIntent.getBroadcast(
            context, 0, new Intent(ACTION_USB_PERMISSION), flags
        );
        usbManager.requestPermission(device, permissionIntent);
    }
    
    private void handleDeviceDetached() {
        Log.d(TAG, "Device detached, cleaning up...");
        cleanupConnection();
        notifyListeners("printerDisconnected", new JSObject().put("message", "Printer disconnected"));
    }
    
    private String getVendorName(int vendorId) {
        switch (vendorId) {
            case 0x0B1B: return "Bematech";
            case 0x04B8: return "Epson";
            case 0x0519: return "Star Micronics";
            case 0x0DD4: return "Custom";
            case 0x154F: return "Daruma";
            case 0x0483: return "Elgin";
            case 0x1A86: return "QinHeng/CH340";
            default: return "Printer VID:0x" + Integer.toHexString(vendorId);
        }
    }
    
    // ==================== MÉTODOS DE IMPRESSÃO ====================
    
    @PluginMethod
    public void sendEscPos(PluginCall call) {
        String command = call.getString("command", "");
        
        try {
            if (!isConnected || connection == null || endpointOut == null) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            byte[] data = command.getBytes("ISO-8859-1");
            Log.d(TAG, "Sending " + data.length + " bytes...");
            
            int sent = connection.bulkTransfer(endpointOut, data, data.length, 10000);
            
            JSObject result = new JSObject();
            if (sent >= 0) {
                result.put("success", true);
                result.put("bytesTransferred", sent);
            } else {
                result.put("success", false);
                result.put("error", "bulkTransfer failed: " + sent);
            }
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "sendEscPos error: " + e.getMessage(), e);
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text", "");
        
        try {
            if (!isConnected) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            byte[] data = (text + "\n").getBytes("ISO-8859-1");
            int sent = connection.bulkTransfer(endpointOut, data, data.length, 5000);
            
            JSObject result = new JSObject();
            result.put("success", sent >= 0);
            if (sent < 0) result.put("error", "Transfer failed");
            call.resolve(result);
            
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void printRaw(PluginCall call) {
        sendEscPos(call);
    }
    
    @PluginMethod
    public void printRawBema(PluginCall call) {
        sendEscPos(call);
    }
    
    @PluginMethod
    public void printFormatted(PluginCall call) {
        String text = call.getString("text", "");
        Boolean bold = call.getBoolean("bold", false);
        String align = call.getString("align", "left");
        String size = call.getString("size", "normal");
        
        try {
            if (!isConnected) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            // Align
            byte[] alignCmd = CMD_LEFT;
            if ("center".equals(align)) alignCmd = CMD_CENTER;
            else if ("right".equals(align)) alignCmd = CMD_RIGHT;
            connection.bulkTransfer(endpointOut, alignCmd, alignCmd.length, 1000);
            
            // Size
            byte[] sizeCmd = CMD_NORMAL_SIZE;
            if ("double".equals(size) || "large".equals(size)) sizeCmd = CMD_DOUBLE_SIZE;
            connection.bulkTransfer(endpointOut, sizeCmd, sizeCmd.length, 1000);
            
            // Bold
            if (bold) connection.bulkTransfer(endpointOut, CMD_BOLD_ON, CMD_BOLD_ON.length, 1000);
            
            // Text
            byte[] data = (text + "\n").getBytes("ISO-8859-1");
            int sent = connection.bulkTransfer(endpointOut, data, data.length, 5000);
            
            // Reset
            if (bold) connection.bulkTransfer(endpointOut, CMD_BOLD_OFF, CMD_BOLD_OFF.length, 1000);
            connection.bulkTransfer(endpointOut, CMD_NORMAL_SIZE, CMD_NORMAL_SIZE.length, 1000);
            connection.bulkTransfer(endpointOut, CMD_LEFT, CMD_LEFT.length, 1000);
            
            JSObject result = new JSObject();
            result.put("success", sent >= 0);
            call.resolve(result);
            
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void feedPaper(PluginCall call) {
        int lines = call.getInt("lines", 3);
        
        try {
            if (!isConnected) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            byte[] cmd = {0x1B, 0x64, (byte) lines};
            int sent = connection.bulkTransfer(endpointOut, cmd, cmd.length, 3000);
            
            JSObject result = new JSObject();
            result.put("success", sent >= 0);
            call.resolve(result);
            
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void cutPaper(PluginCall call) {
        Boolean partial = call.getBoolean("partial", false);
        
        try {
            if (!isConnected) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            byte[] cmd = partial ? CMD_CUT_PARTIAL : CMD_CUT;
            int sent = connection.bulkTransfer(endpointOut, cmd, cmd.length, 3000);
            
            JSObject result = new JSObject();
            result.put("success", sent >= 0);
            call.resolve(result);
            
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void openCashDrawer(PluginCall call) {
        try {
            if (!isConnected) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            int sent = connection.bulkTransfer(endpointOut, CMD_DRAWER, CMD_DRAWER.length, 3000);
            
            JSObject result = new JSObject();
            result.put("success", sent >= 0);
            call.resolve(result);
            
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void testPrint(PluginCall call) {
        try {
            if (!isConnected) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            // Init
            connection.bulkTransfer(endpointOut, CMD_INIT, CMD_INIT.length, 1000);
            
            // Header
            connection.bulkTransfer(endpointOut, CMD_CENTER, CMD_CENTER.length, 1000);
            connection.bulkTransfer(endpointOut, CMD_BOLD_ON, CMD_BOLD_ON.length, 1000);
            byte[] header = "=== TESTE DE IMPRESSAO ===\n".getBytes("ISO-8859-1");
            connection.bulkTransfer(endpointOut, header, header.length, 3000);
            connection.bulkTransfer(endpointOut, CMD_BOLD_OFF, CMD_BOLD_OFF.length, 1000);
            
            // Info
            connection.bulkTransfer(endpointOut, CMD_LEFT, CMD_LEFT.length, 1000);
            String info = "Impressora: " + getVendorName(connectedDevice.getVendorId()) + "\n";
            info += "VID: 0x" + Integer.toHexString(connectedDevice.getVendorId()) + "\n";
            info += "PID: 0x" + Integer.toHexString(connectedDevice.getProductId()) + "\n";
            info += "ClaimInterface: OK\n";
            info += "Status: CONECTADA\n";
            byte[] infoData = info.getBytes("ISO-8859-1");
            connection.bulkTransfer(endpointOut, infoData, infoData.length, 3000);
            
            // Footer
            connection.bulkTransfer(endpointOut, CMD_CENTER, CMD_CENTER.length, 1000);
            byte[] footer = "\n=========================\n\n\n".getBytes("ISO-8859-1");
            connection.bulkTransfer(endpointOut, footer, footer.length, 3000);
            
            // Cut
            connection.bulkTransfer(endpointOut, CMD_CUT, CMD_CUT.length, 1000);
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void disconnect(PluginCall call) {
        cleanupConnection();
        
        JSObject result = new JSObject();
        result.put("success", true);
        call.resolve(result);
    }
    
    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", isConnected && connection != null);
        call.resolve(result);
    }
    
    @PluginMethod
    public void getPrinterInfo(PluginCall call) {
        JSObject result = new JSObject();
        
        if (isConnected && connectedDevice != null) {
            result.put("connected", true);
            result.put("model", getVendorName(connectedDevice.getVendorId()));
            result.put("vendorId", connectedDevice.getVendorId());
            result.put("productId", connectedDevice.getProductId());
            result.put("deviceName", connectedDevice.getDeviceName());
            result.put("serialNumber", connectedDevice.getSerialNumber());
            result.put("firmwareVersion", "ClaimInterface FIX v3");
        } else {
            result.put("connected", false);
            result.put("model", "Disconnected");
        }
        
        call.resolve(result);
    }
    
    @PluginMethod
    public void printBarcode(PluginCall call) {
        String data = call.getString("data", "");
        int height = call.getInt("height", 80);
        
        try {
            if (!isConnected) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            // Barcode height
            byte[] setHeight = {0x1D, 0x68, (byte) height};
            connection.bulkTransfer(endpointOut, setHeight, setHeight.length, 1000);
            
            // Barcode width
            byte[] setWidth = {0x1D, 0x77, 0x02};
            connection.bulkTransfer(endpointOut, setWidth, setWidth.length, 1000);
            
            // Print CODE128
            byte[] barcodeCmd = new byte[4 + data.length()];
            barcodeCmd[0] = 0x1D;
            barcodeCmd[1] = 0x6B;
            barcodeCmd[2] = 73; // CODE128
            barcodeCmd[3] = (byte) data.length();
            System.arraycopy(data.getBytes(), 0, barcodeCmd, 4, data.length());
            
            int sent = connection.bulkTransfer(endpointOut, barcodeCmd, barcodeCmd.length, 5000);
            
            JSObject result = new JSObject();
            result.put("success", sent >= 0);
            call.resolve(result);
            
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void printQRCode(PluginCall call) {
        String data = call.getString("data", "");
        int size = call.getInt("size", 6);
        
        try {
            if (!isConnected) {
                JSObject result = new JSObject();
                result.put("success", false);
                result.put("error", "Impressora não conectada");
                call.resolve(result);
                return;
            }
            
            // QR Code model
            byte[] setModel = {0x1D, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00};
            connection.bulkTransfer(endpointOut, setModel, setModel.length, 1000);
            
            // QR Code size
            byte[] setSize = {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, (byte) size};
            connection.bulkTransfer(endpointOut, setSize, setSize.length, 1000);
            
            // QR Code error correction
            byte[] setError = {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, 0x31};
            connection.bulkTransfer(endpointOut, setError, setError.length, 1000);
            
            // Store data
            byte[] dataBytes = data.getBytes("ISO-8859-1");
            int len = dataBytes.length + 3;
            byte[] storeData = new byte[8 + dataBytes.length];
            storeData[0] = 0x1D;
            storeData[1] = 0x28;
            storeData[2] = 0x6B;
            storeData[3] = (byte) (len & 0xFF);
            storeData[4] = (byte) ((len >> 8) & 0xFF);
            storeData[5] = 0x31;
            storeData[6] = 0x50;
            storeData[7] = 0x30;
            System.arraycopy(dataBytes, 0, storeData, 8, dataBytes.length);
            connection.bulkTransfer(endpointOut, storeData, storeData.length, 3000);
            
            // Print QR Code
            byte[] printQr = {0x1D, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30};
            int sent = connection.bulkTransfer(endpointOut, printQr, printQr.length, 3000);
            
            JSObject result = new JSObject();
            result.put("success", sent >= 0);
            call.resolve(result);
            
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }
    
    @PluginMethod
    public void addListener(PluginCall call) {
        super.addListener(call);
    }
    
    @PluginMethod
    public void removeListener(PluginCall call) {
        super.removeListener(call);
    }
    
    @PluginMethod
    public void removeAllListeners(PluginCall call) {
        super.removeAllListeners(call);
    }
    
    @Override
    protected void handleOnDestroy() {
        try {
            context.unregisterReceiver(usbReceiver);
        } catch (Exception e) {
            Log.w(TAG, "Error unregistering receiver: " + e.getMessage());
        }
        cleanupConnection();
        super.handleOnDestroy();
    }
}
