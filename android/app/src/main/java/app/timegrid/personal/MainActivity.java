package app.timegrid.personal;

import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TimegridAlarmPlugin.class);
        super.onCreate(savedInstanceState);

        // Back closes an open task/settings window (window.tgBack in app.js) and only
        // leaves the app when nothing is open.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView wv = getBridge() == null ? null : getBridge().getWebView();
                if (wv == null) { leave(); return; }
                wv.evaluateJavascript("!!(window.tgBack && window.tgBack())", closed -> {
                    Log.d("TimegridBack", "page closed a window: " + closed);
                    if (!"true".equals(closed)) leave();
                });
            }

            private void leave() {
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }
}
