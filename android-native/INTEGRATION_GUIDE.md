# Guia de Integração - SDK Nativo Bematech para Print Bridge

Este guia descreve como integrar as bibliotecas nativas Bematech (.aar) ao projeto Android do Print Bridge.

## Pré-requisitos

- Android Studio instalado
- Projeto Capacitor sincronizado (`npx cap sync android`)
- Bibliotecas .aar na pasta `android-libs/`

## Passo 1: Copiar bibliotecas .aar

Copie os arquivos para o projeto Android:

```bash
# A partir da raiz do projeto
cp android-libs/*.aar android/app/libs/
```

Se a pasta `libs` não existir:
```bash
mkdir -p android/app/libs
```

## Passo 2: Configurar build.gradle (app level)

Edite `android/app/build.gradle`:

```groovy
android {
    // ... configurações existentes ...
    
    // Adicionar repositório local para .aar
    repositories {
        flatDir {
            dirs 'libs'
        }
    }
}

dependencies {
    // ... dependências existentes ...
    
    // Bibliotecas Bematech
    implementation(name: 'e1-V02.20.02-release', ext: 'aar')
    implementation(name: 'InterfaceAutomacao-v2.0.0.12', ext: 'aar')
    
    // Dependências USB (se necessário)
    implementation 'com.github.mik3y:usb-serial-for-android:3.4.6'
}
```

## Passo 3: Criar Plugin Capacitor Nativo

### 3.1 Criar o arquivo do plugin

Crie `android/app/src/main/java/app/lovable/ossyncprint/BematechNativePlugin.java`:

```java
package app.lovable.ossyncprint;

import android.content.Context;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Imports do SDK Bematech (ajustar conforme documentação do SDK)
// import br.com.bematech.android.printer.*;

@CapacitorPlugin(name = "BematechNativePlugin")
public class BematechNativePlugin extends Plugin {
    private static final String TAG = "BematechNativePlugin";
    
    // Referência ao objeto de impressora do SDK Bematech
    // private BematechPrinter printer;
    private boolean isConnected = false;
    private Context context;
    private UsbManager usbManager;

    @Override
    public void load() {
        super.load();
        context = getContext();
        usbManager = (UsbManager) context.getSystemService(Context.USB_SERVICE);
        Log.d(TAG, "BematechNativePlugin loaded");
    }

    @PluginMethod
    public void initialize(PluginCall call) {
        try {
            // Inicializar SDK Bematech
            // printer = new BematechPrinter(context);
            // printer.initialize();
            
            Log.d(TAG, "SDK Bematech inicializado");
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            Log.e(TAG, "Erro ao inicializar SDK: " + e.getMessage());
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        try {
            // O SDK Bematech geralmente lida internamente com:
            // 1. Busca de dispositivos USB
            // 2. Solicitação de permissão
            // 3. Abertura e claim de interface
            
            // Exemplo (ajustar conforme API do SDK):
            // printer.connect();
            // ou
            // printer.findPrinter();
            // printer.openConnection();
            
            // Verificar dispositivos USB disponíveis
            for (UsbDevice device : usbManager.getDeviceList().values()) {
                // Verificar se é uma impressora Bematech (VendorID: 0x0B1B)
                if (device.getVendorId() == 0x0B1B) {
                    Log.d(TAG, "Impressora Bematech encontrada: " + device.getDeviceName());
                    
                    // O SDK deve lidar com requestPermission internamente
                    // Se não, usar PendingIntent para permissão assíncrona
                    
                    isConnected = true;
                    
                    JSObject printerInfo = new JSObject();
                    printerInfo.put("connected", true);
                    printerInfo.put("model", device.getProductName());
                    printerInfo.put("serialNumber", device.getSerialNumber());
                    printerInfo.put("firmwareVersion", "N/A");
                    
                    JSObject result = new JSObject();
                    result.put("success", true);
                    result.put("printerInfo", printerInfo);
                    call.resolve(result);
                    return;
                }
            }
            
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", "Impressora Bematech não encontrada");
            call.resolve(result);
            
        } catch (Exception e) {
            Log.e(TAG, "Erro ao conectar: " + e.getMessage());
            JSObject result = new JSObject();
            result.put("success", false);
            result.put("error", e.getMessage());
            call.resolve(result);
        }
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        try {
            // printer.disconnect();
            isConnected = false;
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        } catch (Exception e) {
            JSObject result = new JSObject();
            result.put("success", false);
            call.resolve(result);
        }
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", isConnected);
        call.resolve(result);
    }

    @PluginMethod
    public void getPrinterInfo(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", isConnected);
        result.put("model", "Bematech MP-4200 TH");
        result.put("serialNumber", "N/A");
        result.put("firmwareVersion", "N/A");
        call.resolve(result);
    }

    @PluginMethod
    public void printText(PluginCall call) {
        String text = call.getString("text", "");
        
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // Usar API do SDK Bematech para imprimir
            // printer.printText(text);
            
            Log.d(TAG, "Imprimindo texto: " + text.substring(0, Math.min(50, text.length())));
            
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
    public void printRaw(PluginCall call) {
        String data = call.getString("data", "");
        
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // Enviar comandos ESC/POS raw
            // byte[] bytes = data.getBytes("ISO-8859-1");
            // printer.sendRawData(bytes);
            
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
    public void printRawBema(PluginCall call) {
        String data = call.getString("data", "");
        
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // Enviar comandos ESC/BEMA
            // byte[] bytes = data.getBytes("ISO-8859-1");
            // printer.sendBemaData(bytes);
            
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
    public void printFormatted(PluginCall call) {
        String text = call.getString("text", "");
        boolean bold = call.getBoolean("bold", false);
        String align = call.getString("align", "left");
        String size = call.getString("size", "normal");
        
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // Usar formatação do SDK Bematech
            // printer.setBold(bold);
            // printer.setAlign(align);
            // printer.setSize(size);
            // printer.printText(text);
            
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
    public void feedPaper(PluginCall call) {
        int lines = call.getInt("lines", 1);
        
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // printer.feedPaper(lines);
            
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
    public void cutPaper(PluginCall call) {
        boolean partial = call.getBoolean("partial", false);
        
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // printer.cutPaper(partial);
            
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
    public void openCashDrawer(PluginCall call) {
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // printer.openCashDrawer();
            
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
    public void printBarcode(PluginCall call) {
        String data = call.getString("data", "");
        String type = call.getString("type", "CODE128");
        int height = call.getInt("height", 80);
        int width = call.getInt("width", 2);
        
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // printer.printBarcode(data, type, height, width);
            
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
    public void printQRCode(PluginCall call) {
        String data = call.getString("data", "");
        int size = call.getInt("size", 4);
        
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // printer.printQRCode(data, size);
            
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
    public void testPrint(PluginCall call) {
        try {
            if (!isConnected) {
                throw new Exception("Impressora não conectada");
            }
            
            // printer.printText("=== TESTE DE IMPRESSAO ===\n");
            // printer.printText("Print Bridge - OS Sync\n");
            // printer.printText("Comunicacao OK!\n");
            // printer.printText("==========================\n");
            // printer.feedPaper(3);
            // printer.cutPaper(true);
            
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
}
```

### 3.2 Registrar o plugin

Edite `android/app/src/main/java/app/lovable/ossyncprint/MainActivity.java`:

```java
package app.lovable.ossyncprint;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Registrar plugin customizado ANTES de super.onCreate()
        registerPlugin(BematechNativePlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
```

## Passo 4: Configurar permissões USB

Edite `android/app/src/main/AndroidManifest.xml`:

```xml
<manifest ...>
    <!-- Permissões USB -->
    <uses-feature android:name="android.hardware.usb.host" android:required="true"/>
    <uses-permission android:name="android.permission.USB_PERMISSION" />
    
    <application ...>
        <activity ...>
            <!-- Intent filter para conexão automática USB -->
            <intent-filter>
                <action android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"/>
            </intent-filter>
            <meta-data
                android:name="android.hardware.usb.action.USB_DEVICE_ATTACHED"
                android:resource="@xml/usb_device_filter"/>
        </activity>
    </application>
</manifest>
```

Crie `android/app/src/main/res/xml/usb_device_filter.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Bematech -->
    <usb-device vendor-id="2843"/>
    <!-- Epson -->
    <usb-device vendor-id="1208"/>
    <!-- Star Micronics -->
    <usb-device vendor-id="1305"/>
    <!-- Daruma -->
    <usb-device vendor-id="5455"/>
    <!-- USB Serial Adapters -->
    <usb-device vendor-id="6790"/>  <!-- CH340 -->
    <usb-device vendor-id="1659"/>  <!-- Prolific -->
    <usb-device vendor-id="4292"/>  <!-- Silicon Labs -->
    <usb-device vendor-id="1027"/>  <!-- FTDI -->
</resources>
```

## Passo 5: Build e Teste

```bash
# Sincronizar projeto
npx cap sync android

# Abrir no Android Studio
npx cap open android

# Build e deploy para dispositivo
# No Android Studio: Run > Run 'app'
```

## Troubleshooting

### Erro "Unable to claim interface"
- Certifique-se de que nenhum outro app está usando a impressora
- Verifique se o SDK lida com permissões internamente
- Use `forceClaim=true` se implementar manualmente

### SDK não encontra a impressora
- Verifique conexão física OTG
- Confirme que o Vendor ID está no filtro USB
- Verifique logs do Android: `adb logcat | grep Bematech`

### Comandos ESC/BEMA não funcionam
- Verifique a documentação do SDK para o modelo específico
- Alguns modelos podem requerer inicialização especial
- Teste com comandos ESC/POS padrão primeiro
