package com.pomofocus.workspace;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.webkit.WebSettingsCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private OnBackPressedCallback appBackCallback;
    private volatile boolean inAppCanGoBack = false;
    private long lastBackPressedTime = 0;

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

        // Android 8.0+ (API 26+) Notification Channel with IMPORTANCE_HIGH
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            android.app.NotificationManager notificationManager = getSystemService(android.app.NotificationManager.class);
            if (notificationManager != null) {
                String channelId = "pomofocus_timer_channel";
                CharSequence name = "Pomodoro Timer Alerts";
                String description = "Thông báo kết thúc hiệp Pomodoro và chuông báo thức";
                int importance = android.app.NotificationManager.IMPORTANCE_HIGH;
                android.app.NotificationChannel channel = new android.app.NotificationChannel(channelId, name, importance);
                channel.setDescription(description);
                channel.enableVibration(true);
                channel.enableLights(true);
                channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
                notificationManager.createNotificationChannel(channel);
            }
        }

        // Android 15 Edge-to-Edge WindowInsets Listener (injects --sat-native and --sab-native into CSS)
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            float density = getResources().getDisplayMetrics().density;
            int topDp = Math.round(systemBars.top / density);
            int bottomDp = Math.round(systemBars.bottom / density);
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.post(() -> {
                    String script = String.format(
                        "document.documentElement.style.setProperty('--sat-native', '%dpx');" +
                        "document.documentElement.style.setProperty('--sab-native', '%dpx');",
                        topDp, bottomDp
                    );
                    webView.evaluateJavascript(script, null);
                });
            }
            return insets;
        });
    }

    @Override
    public void onBackPressed() {
        if (!inAppCanGoBack) {
            long currentTime = System.currentTimeMillis();
            if (currentTime - lastBackPressedTime < 2000) {
                finishAffinity();
                return;
            }
            lastBackPressedTime = currentTime;
            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                webView.post(() -> webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('pomofocus:native-back'));",
                    null
                ));
                return;
            }
        }
        super.onBackPressed();
    }

    @Override
    protected void load() {
        WebView webView = findViewById(com.getcapacitor.android.R.id.webview);
        if (webView != null) {
            // Xiaomi MIUI Force Dark Inversion Prevention
            if (WebViewFeature.isFeatureSupported(WebViewFeature.FORCE_DARK)) {
                WebSettingsCompat.setForceDark(webView.getSettings(), WebSettingsCompat.FORCE_DARK_OFF);
            }

            Object bridgeInterface = new Object() {
                @JavascriptInterface
                public void setCanGoBackInApp(final boolean canGoBack) {
                    inAppCanGoBack = canGoBack;
                    runOnUiThread(() -> {
                        if (appBackCallback != null) {
                            appBackCallback.setEnabled(inAppCanGoBack);
                        }
                    });
                }

                @JavascriptInterface
                public void exitApp() {
                    runOnUiThread(() -> {
                        finishAffinity();
                    });
                }

                @JavascriptInterface
                public void openExternalUrl(final String url) {
                    if (url != null && !url.isEmpty()) {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (Exception e) {
                            e.printStackTrace();
                        }
                    }
                }
            };

            webView.addJavascriptInterface(bridgeInterface, "PomoNativeBack");
            webView.addJavascriptInterface(bridgeInterface, "PomoNativeBridge");
        }
        super.load();
    }
}
