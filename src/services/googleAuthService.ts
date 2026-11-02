/**
 * Google Authentication Service
 * Implements Google Identity Services (GSI) with secure JWT parsing,
 * session restoration, and developer/demo simulation fallback.
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
      };
    };
  }
}

const GSI_SCRIPT_URL = 'https://accounts.google.com/gsi/client';

export const googleAuthService = {
  getClientId(): string {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) || '';
    }
    return '';
  },

  isConfigured(): boolean {
    const id = this.getClientId();
    return Boolean(id && id.trim().length > 0 && !id.includes('YOUR_GOOGLE_CLIENT_ID'));
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
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
      given_name: 'Bảo Nam',
      family_name: 'Hồ Ngọc'
    };
  }
};
