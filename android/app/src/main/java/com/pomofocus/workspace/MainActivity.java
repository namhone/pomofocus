package com.pomofocus.workspace;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private OnBackPressedCallback appBackCallback;
    private volatile boolean inAppCanGoBack = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        appBackCallback = new OnBackPressedCallback(false) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView != null) {
                    webView.post(() -> webView.evaluateJavascript(
                        "window.dispatchEvent(new CustomEvent('pomofocus:native-back'));",
                        null
                    ));
                    return;
                }
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
            }
        };
        getOnBackPressedDispatcher().addCallback(this, appBackCallback);
        super.onCreate(savedInstanceState);
    }

    @Override
    protected void load() {
        WebView webView = findViewById(com.getcapacitor.android.R.id.webview);
        if (webView != null) {
            webView.addJavascriptInterface(new Object() {
                @JavascriptInterface
                public void setCanGoBackInApp(final boolean canGoBack) {
                    inAppCanGoBack = canGoBack;
                    runOnUiThread(() -> {
                        if (appBackCallback != null) {
                            appBackCallback.setEnabled(inAppCanGoBack);
                        }
                    });
                }
            }, "PomoNativeBack");
        }
        super.load();
    }
}
