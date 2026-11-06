/**
 * Google Authentication Service
 * Implements Google Identity Services (GSI) with secure JWT parsing,
 * OAuth 2.0 Popup/Redirect, and developer/demo simulation fallback.
 */

export interface GoogleUserPayload {
  sub: string;
  id?: string;
  email: string;
  email_verified?: boolean;
  name: string;
  picture?: string;
  avatarUrl?: string;
  given_name?: string;
  family_name?: string;
}

export interface GoogleAuthOptions {
  clientId?: string;
  onSuccess: (payload: GoogleUserPayload) => void;
  onError?: (error: Error) => void;
}

// Global typing for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number | string;
              locale?: string;
            }
          ) => void;
          prompt: (notification?: (notification: { isNotDisplayed: () => boolean; isSkippedMoment: () => boolean }) => void) => void;
          disableAutoSelect: () => void;
        };
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: any; details?: string }) => void;
            error_callback?: (error: any) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
          };
          initCodeClient?: (config: {
            client_id: string;
            scope: string;
            ux_mode?: 'popup' | 'redirect';
            callback: (response: { code?: string; error?: any }) => void;
          }) => {
            requestCode: () => void;
          };
        };
      };
    };
  }
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
export const OFFICIAL_GOOGLE_CLIENT_ID = '935136578653-mfq96ugjbgf0bgg73ei9pask52rm0f09.apps.googleusercontent.com';

export const GOOGLE_OAUTH_GUIDANCE_MESSAGE =
  'Google OAuth yêu cầu thêm domain https://pomofocus-workspace.vercel.app vào Google Cloud Console. Vui lòng kiểm tra cài đặt hoặc sử dụng đăng nhập bằng Email.';

export const googleAuthService = {
  getClientId(): string {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const envId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
      if (envId && envId.trim().length > 0 && !envId.includes('YOUR_GOOGLE_CLIENT_ID')) {
        return envId.trim();
      }
    }
    return OFFICIAL_GOOGLE_CLIENT_ID;
  },

  isConfigured(): boolean {
    const id = this.getClientId();
    return Boolean(id && id.trim().length > 0 && !id.includes('YOUR_GOOGLE_CLIENT_ID'));
  },

  /**
   * Phát hiện thiết bị di động (iOS / Android / màn hình nhỏ) để kích hoạt Full-page Redirect
   */
  isMobileDevice(): boolean {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
  },

  /**
   * Giải mã Google ID Token JWT an toàn và trích xuất thông tin người dùng
   */
  parseJwtPayload(token: string): GoogleUserPayload {
    if (!token || typeof token !== 'string') {
      throw new Error('ID Token không hợp lệ');
    }
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Token không đúng định dạng JWT của Google');
    }

    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);

      if (!parsed.sub || !parsed.email) {
        throw new Error('JWT thiếu các trường bắt buộc (sub hoặc email)');
      }

      return {
        sub: parsed.sub,
        email: parsed.email.toLowerCase(),
        email_verified: Boolean(parsed.email_verified),
        name: parsed.name || parsed.email.split('@')[0],
        picture: parsed.picture,
        given_name: parsed.given_name,
        family_name: parsed.family_name
      };
    } catch (err) {
      throw new Error('Không thể giải mã dữ liệu xác thực Google: ' + (err instanceof Error ? err.message : String(err)));
    }
  },

  /**
   * Tải Google Identity Services script bất đồng bộ
   */
  loadGsiScript(): Promise<void> {
    if (typeof window === 'undefined') return Promise.resolve();
    if (window.google?.accounts?.id) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GSI_SCRIPT_URL}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Lỗi tải Google Identity Services script')));
        return;
      }

      const script = document.createElement('script');
      script.src = GSI_SCRIPT_URL;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Không thể kết nối đến Google Identity Services'));
      document.head.appendChild(script);
    });
  },

  /**
   * Khởi tạo GSI với Client ID và callback
   */
  async initializeGsi(options: GoogleAuthOptions): Promise<boolean> {
    const clientId = options.clientId || this.getClientId();
    if (!clientId) {
      return false;
    }

    try {
      await this.loadGsiScript();
      if (!window.google?.accounts?.id) {
        throw new Error('Google Identity Services chưa sẵn sàng');
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          try {
            const userPayload = this.parseJwtPayload(response.credential);
            options.onSuccess(userPayload);
          } catch (err) {
            if (options.onError) {
              options.onError(err instanceof Error ? err : new Error(String(err)));
            }
          }
        },
        auto_select: false,
        cancel_on_tap_outside: true
      });

      return true;
    } catch (err) {
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(String(err)));
      }
      return false;
    }
  },

  /**
   * Hiển thị Google Sign-In button vào phần tử DOM
   */
  renderButton(element: HTMLElement, options?: { text?: 'continue_with' | 'signin_with' | 'signup_with'; width?: number }): void {
    if (!window.google?.accounts?.id || !element) return;
    window.google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: options?.text || 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      width: options?.width || 280,
      locale: 'vi'
    });
  },

  /**
   * Hiển thị One Tap Prompt của Google
   */
  promptOneTap(): void {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      window.google.accounts.id.prompt();
    }
  },

  /**
   * Mở Popup chọn tài khoản Google thật qua Google Identity Services Token Client
   */
  async signInWithPopup(): Promise<GoogleUserPayload> {
    await this.loadGsiScript();
    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error('Google Client ID chưa được cấu hình.');
    }

    if (window.google?.accounts?.oauth2) {
      return new Promise<GoogleUserPayload>((resolve, reject) => {
        try {
          const client = window.google!.accounts.oauth2!.initTokenClient({
            client_id: clientId,
            scope: 'openid email profile',
            callback: async (tokenResponse) => {
              if (tokenResponse.error) {
                const errDetail = tokenResponse.details || tokenResponse.error;
                if (
                  String(errDetail).includes('redirect_uri_mismatch') ||
                  String(errDetail).includes('origin') ||
                  String(errDetail).includes('idpiframe_initialization_failed')
                ) {
                  return reject(new Error(GOOGLE_OAUTH_GUIDANCE_MESSAGE));
                }
                return reject(new Error(tokenResponse.details || tokenResponse.error || 'Đăng nhập Google bị hủy hoặc thất bại'));
              }
              if (!tokenResponse.access_token) {
                return reject(new Error('Không nhận được Access Token từ Google'));
              }

              try {
                // Lấy thông tin người dùng chính thức từ Google UserInfo API
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                if (!res.ok) {
                  throw new Error(`Google UserInfo API trả về HTTP ${res.status}`);
                }
                const profile = await res.json();
                resolve({
                  sub: profile.sub || `g_${Date.now()}`,
                  email: (profile.email || '').toLowerCase(),
                  email_verified: Boolean(profile.email_verified),
                  name: profile.name || profile.email?.split('@')[0] || 'Người dùng Google',
                  picture: profile.picture,
                  given_name: profile.given_name,
                  family_name: profile.family_name
                });
              } catch (e: any) {
                reject(new Error('Lỗi lấy thông tin tài khoản Google: ' + (e?.message || String(e))));
              }
            },
            error_callback: (err) => {
              const errMsg = err?.message || '';
              if (
                errMsg.includes('redirect_uri_mismatch') ||
                errMsg.includes('origin') ||
                errMsg.includes('idpiframe_initialization_failed')
              ) {
                reject(new Error(GOOGLE_OAUTH_GUIDANCE_MESSAGE));
              } else {
                reject(new Error(err?.message || 'Lỗi cửa sổ popup Google OAuth'));
              }
            }
          });

          client.requestAccessToken({ prompt: 'select_account' });
        } catch (err: any) {
          const errMsg = err?.message || '';
          if (
            errMsg.includes('redirect_uri_mismatch') ||
            errMsg.includes('origin') ||
            errMsg.includes('idpiframe_initialization_failed')
          ) {
            reject(new Error(GOOGLE_OAUTH_GUIDANCE_MESSAGE));
          } else {
            reject(new Error('Không thể khởi chạy cửa sổ Google Sign-In: ' + (err?.message || String(err))));
          }
        }
      });
    }

    // Nếu không có oauth2, chuyển sang Redirect Flow
    const redirectUrl = this.getGoogleOAuthRedirectUrl();
    window.location.href = redirectUrl;
    return new Promise(() => {}); // Chờ redirect
  },

  /**
   * Tạo URL chuyển hướng Google OAuth 2.0 trực tiếp (chuẩn OAuth2)
   * KHÓA CỨNG: Luôn sử dụng origin gốc (https://pomofocus-workspace.vercel.app)
   */
  getGoogleOAuthRedirectUrl(_redirectTo?: string): string {
    const clientId = this.getClientId();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pomofocus-workspace.vercel.app';
    const redirectUri = origin;
    const nonce = Math.random().toString(36).substring(2);
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${nonce}&prompt=select_account`;
  },

  /**
   * Đăng nhập Google giả lập dành cho môi trường phát triển / thử nghiệm hoặc khi chưa gắn Client ID
   */
  async simulateGoogleLogin(mock?: Partial<GoogleUserPayload>): Promise<GoogleUserPayload> {
    // Độ trễ giả lập mạng 500ms
    await new Promise((r) => setTimeout(r, 500));

    return {
      sub: mock?.sub || 'g_usr_10987654321',
      email: (mock?.email || 'nam.studyworkspace@gmail.com').toLowerCase(),
      email_verified: true,
      name: mock?.name || 'Hồ Ngọc Bảo Nam (Google)',
      picture:
        mock?.picture ||
        'https://ui-avatars.com/api/?name=Bao+Nam&background=10b981&color=fff&bold=true',
      given_name: 'Bảo Nam',
      family_name: 'Hồ Ngọc'
    };
  }
};
