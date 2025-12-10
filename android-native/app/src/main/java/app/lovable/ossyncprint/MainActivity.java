package app.lovable.ossyncprint;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Register the BematechNativePlugin BEFORE calling super.onCreate()
        // This ensures the plugin is available when Capacitor initializes
        registerPlugin(BematechNativePlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
