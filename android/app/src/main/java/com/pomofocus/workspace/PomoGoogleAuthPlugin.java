package com.pomofocus.workspace;

import android.content.MutableContextWrapper;
import android.os.CancellationSignal;
import androidx.core.content.ContextCompat;
import androidx.credentials.CredentialManager;
import androidx.credentials.CredentialManagerCallback;
import androidx.credentials.GetCredentialRequest;
import androidx.credentials.GetCredentialResponse;
import androidx.credentials.ClearCredentialStateRequest;
import androidx.credentials.exceptions.GetCredentialException;
import androidx.credentials.exceptions.GetCredentialCancellationException;
import androidx.credentials.exceptions.ClearCredentialException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption;
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential;

/** Android account picker; only Supabase verifies the returned Google ID token. */
@CapacitorPlugin(name = "PomoGoogleAuth")
public class PomoGoogleAuthPlugin extends Plugin {
    private CancellationSignal pendingSignIn;

    @PluginMethod
    public void signIn(PluginCall call) {
        String serverClientId = call.getString("serverClientId");
        String nonce = call.getString("nonce");
        if (serverClientId == null || nonce == null || nonce.length() != 64) {
            call.reject("Không thể mở đăng nhập Google lúc này.", "CONFIGURATION_ERROR");
            return;
        }
        getActivity().runOnUiThread(() -> {
            if (pendingSignIn != null) {
                call.reject("Đăng nhập đang được xử lý.", "SIGN_IN_PENDING");
                return;
            }
            pendingSignIn = new CancellationSignal();
            GetSignInWithGoogleOption option = new GetSignInWithGoogleOption.Builder(serverClientId)
                .setNonce(nonce).build();
            GetCredentialRequest request = new GetCredentialRequest.Builder().addCredentialOption(option).build();
            CredentialManager.create(getContext()).getCredentialAsync(
                new MutableContextWrapper(getActivity()), request, pendingSignIn,
                ContextCompat.getMainExecutor(getContext()),
                new CredentialManagerCallback<GetCredentialResponse, GetCredentialException>() {
                    @Override public void onResult(GetCredentialResponse response) {
                        pendingSignIn = null;
                        try {
                            if (!GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL.equals(response.getCredential().getType())) {
                                call.reject("Không nhận được tài khoản Google hợp lệ.", "INVALID_CREDENTIAL");
                                return;
                            }
                            GoogleIdTokenCredential credential = GoogleIdTokenCredential.createFrom(response.getCredential().getData());
                            JSObject result = new JSObject();
                            result.put("idToken", credential.getIdToken());
                            call.resolve(result);
                        } catch (Exception error) {
                            call.reject("Không thể đọc thông tin đăng nhập Google.", "INVALID_CREDENTIAL");
                        }
                    }
                    @Override public void onError(GetCredentialException error) {
                        pendingSignIn = null;
                        boolean cancelled = error instanceof GetCredentialCancellationException;
                        call.reject(cancelled ? "Đã hủy đăng nhập Google." : "Không thể đăng nhập Google. Vui lòng thử lại hoặc dùng email.",
                            cancelled ? "SIGN_IN_CANCELLED" : "GOOGLE_SIGN_IN_FAILED");
                    }
                }
            );
        });
    }

    @PluginMethod
    public void clearCredentialState(PluginCall call) {
        CredentialManager.create(getContext()).clearCredentialStateAsync(
            new ClearCredentialStateRequest(), null, ContextCompat.getMainExecutor(getContext()),
            new CredentialManagerCallback<Void, ClearCredentialException>() {
                @Override public void onResult(Void result) { call.resolve(); }
                @Override public void onError(ClearCredentialException error) {
                    call.reject("Không thể đóng phiên chọn tài khoản.", "CLEAR_CREDENTIAL_FAILED");
                }
            }
        );
    }

    @Override protected void handleOnDestroy() {
        if (pendingSignIn != null) pendingSignIn.cancel();
        pendingSignIn = null;
    }
}
