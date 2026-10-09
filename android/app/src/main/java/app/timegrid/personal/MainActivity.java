package app.timegrid.personal;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TimegridAlarmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
