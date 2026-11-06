import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useRouter } from '../services/router';
import { googleAuthService } from '../services/googleAuthService';
import { PomoFocusLogo } from './PomoFocusLogo';
import {
  Lock,
  Mail,
  User,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  X,
  KeyRound
} from 'lucide-react';

interface AuthViewProps {
  initialMode?: 'login' | 'signup';
}

export const AuthView: React.FC<AuthViewProps> = ({ initialMode = 'login' }) => {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isGoogleLoadingLocal, setIsGoogleLoadingLocal] = useState(false);

  const {
    login,
    signup,
    loginWithGoogle,
    isLoading,
    isGoogleLoading,
    error,
    clearError,
    user,
    requires2Fa,
    pending2FaUser,
    verify2FaLogin,
    cancel2FaLogin,
    sendPasswordResetOtp,
    verifyPasswordResetOtp
  } = useAuthStore();

  const [totpCode, setTotpCode] = useState('');
  const [totpError, setTotpError] = useState('');
  const [isVerifying2Fa, setIsVerifying2Fa] = useState(false);

  // Quên mật khẩu qua OTP Email
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<'request' | 'verify'>('request');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotMsg, setForgotMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isSendingForgotOtp, setIsSendingForgotOtp] = useState(false);

  const handleRequestForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotMsg({ type: 'error', text: 'Vui lòng nhập địa chỉ email hợp lệ.' });
      return;
    }
    setIsSendingForgotOtp(true);
    const res = await sendPasswordResetOtp(forgotEmail);
    setIsSendingForgotOtp(false);
    if (res.success) {
      setForgotStep('verify');
      setForgotMsg({ type: 'success', text: res.message });
      // Hỗ trợ điền sẵn demo OTP nếu có trả về
      if (res.otp) {
        setForgotOtp(res.otp);
      }
    } else {
      setForgotMsg({ type: 'error', text: res.message });
    }
  };

  const handleVerifyForgotOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMsg(null);
    if (!forgotOtp.trim()) {
      setForgotMsg({ type: 'error', text: 'Vui lòng nhập mã OTP 6 số từ email.' });
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotMsg({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    setIsSendingForgotOtp(true);
    const res = await verifyPasswordResetOtp(forgotEmail, forgotOtp, forgotNewPassword);
    setIsSendingForgotOtp(false);
    if (res.success) {
      setSuccessMsg('Đã đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay bằng mật khẩu mới.');
      setEmail(forgotEmail);
      setPassword(forgotNewPassword);
      setShowForgotPasswordModal(false);
      setForgotMsg(null);
    } else {
      setForgotMsg({ type: 'error', text: res.message });
    }
  };

  const handleVerify2Fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setTotpError('');
    if (!totpCode.trim()) {
      setTotpError('Vui lòng nhập mã xác thực 6 số.');
      return;
    }
    setIsVerifying2Fa(true);
    const res = await verify2FaLogin(totpCode.trim());
    setIsVerifying2Fa(false);
    if (res.success) {
      setSuccessMsg('Xác thực 2 bước thành công! Đang chuyển hướng...');
      setTimeout(() => router.navigate('/app'), 500);
    } else {
      setTotpError(res.message || 'Mã xác thực không chính xác.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSuccessMsg('');

    if (mode === 'login') {
      const ok = await login(email, password);
      if (ok) {
        setSuccessMsg('Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => router.navigate('/app'), 600);
      }
    } else {
      const ok = await signup(email, password, displayName);
      if (ok) {
        setSuccessMsg('Đăng ký tài khoản thành công! Dữ liệu của bạn đã được liên kết.');
        setTimeout(() => router.navigate('/app'), 600);
      }
    }
  };

  // Khởi tạo Google One Tap khi mở màn hình AuthView
  useEffect(() => {
    let isMounted = true;
    if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
      googleAuthService
        .initializeGsi({
          onSuccess: async (payload) => {
            if (!isMounted) return;
            const ok = await loginWithGoogle(payload);
            if (ok) {
              setSuccessMsg('Đăng nhập Google thành công! Đang chuyển hướng...');
              setTimeout(() => router.navigate('/app'), 400);
            }
          },
          onError: (err) => {
            console.warn('[Google One Tap] Thông báo:', err?.message);
          }
        })
        .then((ready) => {
          if (ready && isMounted) {
            googleAuthService.promptOneTap();
          }
        })
        .catch(console.warn);
    }
    return () => {
      isMounted = false;
    };
  }, []);

  // Đăng nhập Google OAuth (Redirect trên Mobile, Popup trên Desktop)
  const handleGoogleSignIn = async () => {
    clearError();
    setSuccessMsg('');
    setIsGoogleLoadingLocal(true);

    try {
      const isMobile = googleAuthService.isMobileDevice();
      const clientId = googleAuthService.getClientId();
      const origin =
        typeof window !== 'undefined'
          ? window.location.origin
          : 'https://pomofocus-workspace.vercel.app';
      const redirectUri = `${origin}/app`;

      // 1. Trên Mobile: Trình duyệt di động mặc định chặn popup ngầm -> BẮT BUỘC dùng Full-page Redirect
      if (isMobile) {
        const nonce = Date.now().toString();
        const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
          clientId
        )}&redirect_uri=${encodeURIComponent(
          redirectUri
        )}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${nonce}&prompt=select_account`;
        window.location.href = googleOAuthUrl;
        return;
      }

      // 2. Trên Desktop: Thử popup flow của Google Identity Services trước
      if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
        try {
          const googleUser = await googleAuthService.signInWithPopup();
          if (googleUser && googleUser.email) {
            const ok = await loginWithGoogle(googleUser);
            if (ok) {
              setSuccessMsg('Đăng nhập Google thành công! Đang chuyển hướng...');
              setTimeout(() => router.navigate('/app'), 400);
              return;
            }
          }
        } catch (popupErr: any) {
          console.warn(
            '[Google Sign-In] Popup thất bại hoặc bị chặn, chuyển sang Full-page Redirect:',
            popupErr?.message
          );
          const nonce = Date.now().toString();
          const googleOAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
            clientId
          )}&redirect_uri=${encodeURIComponent(
            redirectUri
          )}&response_type=token%20id_token&scope=openid%20email%20profile&nonce=${nonce}&prompt=select_account`;
          window.location.href = googleOAuthUrl;
          return;
        }
      }

      // 3. Fallback cho môi trường test offline / unit tests
      const simulated = await googleAuthService.simulateGoogleLogin({
        email: 'nam.studyworkspace@gmail.com',
        name: 'Hồ Ngọc Bảo Nam (Google)',
        picture:
          'https://ui-avatars.com/api/?name=Bao+Nam&background=10b981&color=fff&bold=true'
      });
      const ok = await loginWithGoogle(simulated);
      if (ok) {
        setSuccessMsg('Đăng nhập Google thành công! Đang chuyển hướng...');
        setTimeout(() => router.navigate('/app'), 500);
      }
    } catch (err: any) {
      console.error('Lỗi đăng nhập Google:', err);
      setIsGoogleLoadingLocal(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-neutral-950 via-[#0d111a] to-neutral-950 text-neutral-100 select-none">
      <div className="w-full max-w-md rounded-3xl border border-white/15 bg-neutral-900/80 p-7 shadow-2xl backdrop-blur-2xl">
        {/* Header navigation */}
        <div className="flex items-center justify-between mb-5">
          <button
            type="button"
            onClick={() => router.navigate('/app')}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Vào Không Gian</span>
          </button>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/25 text-[11px] font-medium text-emerald-300">
            <Sparkles size={12} />
            <span>Đồng bộ Cloud & VIP</span>
          </div>
        </div>

        {/* Brand title */}
        <div className="text-center mb-6 flex flex-col items-center">
          <PomoFocusLogo size={42} showWordmark={true} showSubtitle={false} wordmarkClassName="text-xl font-bold" className="mb-2" />
          <h1 className="text-xl font-bold tracking-tight text-white">
            {mode === 'login' ? 'Đăng Nhập' : 'Tạo Tài Khoản Mới'}
          </h1>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 p-3 text-xs text-emerald-300">
            <CheckCircle2 size={15} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {requires2Fa && pending2FaUser ? (
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 shadow-lg shadow-emerald-500/10">
              <ShieldCheck size={28} />
            </div>

            <h2 className="text-lg font-bold text-white mb-1.5">
              Xác Thực 2 Bước (2FA)
            </h2>
            <p className="text-xs text-neutral-400 max-w-xs mb-5">
              Tài khoản <span className="font-semibold text-white">{pending2FaUser.email}</span> đã được bảo vệ bằng 2FA. Nhập mã 6 chữ số từ app Authenticator hoặc mã dự phòng:
            </p>

            {totpError && (
              <div className="w-full mb-4 flex items-center gap-2 rounded-xl bg-rose-500/15 border border-rose-500/30 p-3 text-xs text-rose-300 text-left">
                <AlertCircle size={15} className="shrink-0" />
                <span>{totpError}</span>
              </div>
            )}

            <form onSubmit={handleVerify2Fa} className="w-full flex flex-col gap-3">
              <div>
                <input
                  type="text"
                  autoFocus
                  data-testid="input-login-totp-code"
                  value={totpCode}
                  onChange={(e) => {
                    setTotpCode(e.target.value.replace(/\s+/g, ''));
                    setTotpError('');
                  }}
                  placeholder="000000"
                  maxLength={10}
                  className="w-full text-center font-mono text-2xl tracking-[0.35em] font-bold py-3 px-4 rounded-xl bg-white/5 border border-emerald-500/40 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/30 text-white placeholder-neutral-600 outline-none transition-all"
                />
              </div>

              <button
                type="submit"
                data-testid="btn-submit-2fa-login"
                disabled={isVerifying2Fa || !totpCode.trim()}
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-1"
              >
                {isVerifying2Fa ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Đang kiểm tra mã...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} />
                    <span>Xác Nhận & Đăng Nhập</span>
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="btn-cancel-2fa-login"
                onClick={() => {
                  setTotpCode('');
                  setTotpError('');
                  cancel2FaLogin();
                }}
                className="w-full py-2 text-xs text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                Hủy & Đổi Tài Khoản Khác
              </button>
            </form>
          </div>
        ) : (
          <>
            {/* =========================================================================
                NÚT TIẾP TỤC VỚI GOOGLE (NỔI BẬT TRÊN CÙNG)
               ========================================================================= */}
            <div className="mb-4">
              <button
                type="button"
                data-testid="btn-google-signin"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isGoogleLoadingLocal || isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-200 text-xs font-semibold flex items-center justify-center gap-3 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isGoogleLoading || isGoogleLoadingLocal ? (
                  <Loader2 size={16} className="animate-spin text-neutral-700" />
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>
                  {isGoogleLoading || isGoogleLoadingLocal
                    ? 'Đang kết nối tài khoản Google...'
                    : 'Tiếp tục với Google'}
                </span>
              </button>
            </div>

            {/* Dải phân cách mỏng "hoặc" */}
            <div className="relative flex items-center justify-center my-4">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-neutral-900 px-3 text-[11px] text-neutral-400 shrink-0 font-medium">
                hoặc
              </span>
              <div className="border-t border-white/10 w-full" />
            </div>

            {/* Tab switch */}
            <div className="flex rounded-xl bg-black/40 p-1 mb-3.5 border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  clearError();
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white/15 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Đăng Nhập
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  clearError();
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white/15 text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Tạo Tài Khoản Mới
              </button>
            </div>

            {/* Form Email / Password */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-3">
              {mode === 'signup' && (
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Tên hiển thị
                  </label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ví dụ: Hoàng Nam"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 pl-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Địa chỉ Email
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tenban@domain.com"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 pl-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-neutral-300">
                    Mật khẩu
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      data-testid="btn-forgot-password"
                      onClick={() => {
                        setShowForgotPasswordModal(true);
                        setForgotEmail(email);
                        setForgotOtp('');
                        setForgotNewPassword('');
                        setForgotStep('request');
                        setForgotMsg(null);
                      }}
                      className="text-[11px] text-neutral-400 hover:text-emerald-400 transition-colors cursor-pointer"
                    >
                      Quên mật khẩu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ít nhất 6 ký tự"
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 pl-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                data-testid="btn-auth-submit"
                disabled={isLoading || isGoogleLoading || isGoogleLoadingLocal}
                className="mt-1.5 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {isLoading
                  ? 'Đang xử lý...'
                  : mode === 'login'
                  ? 'Đăng Nhập Email'
                  : 'Tạo Tài Khoản Mới'}
              </button>
            </form>
          </>
        )}

        {user && (
          <div className="mt-3.5 text-center">
            <span className="text-[11px] text-neutral-400">
              Đang đăng nhập: <strong className="text-white">{user.displayName}</strong> ({user.plan.toUpperCase()})
            </span>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL QUÊN MẬT KHẨU QUA MÃ OTP EMAIL
         ========================================================================= */}
      {showForgotPasswordModal && (
        <div
          data-testid="modal-forgot-password"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowForgotPasswordModal(false);
          }}
        >
          <div className="relative w-full max-w-sm rounded-3xl border border-white/15 bg-neutral-900/95 p-6 shadow-2xl backdrop-blur-xl text-neutral-100">
            <button
              type="button"
              data-testid="btn-close-forgot-modal"
              onClick={() => setShowForgotPasswordModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <KeyRound size={18} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Đặt Lại Mật Khẩu</h3>
                <p className="text-[11px] text-neutral-400">Xác minh mã 6 số gửi qua Email</p>
              </div>
            </div>

            {forgotMsg && (
              <div
                className={`mb-4 flex items-start gap-2 rounded-xl p-3 text-xs border ${
                  forgotMsg.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
                }`}
              >
                {forgotMsg.type === 'success' ? (
                  <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                )}
                <span>{forgotMsg.text}</span>
              </div>
            )}

            {forgotStep === 'request' ? (
              <form onSubmit={handleRequestForgotOtp} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Nhập Email tài khoản của bạn:
                  </label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                    <input
                      type="email"
                      required
                      autoFocus
                      data-testid="input-forgot-email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="tenban@domain.com"
                      className="w-full rounded-xl bg-white/5 border border-white/10 px-3.5 py-2 pl-10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSendingForgotOtp}
                  data-testid="btn-submit-send-otp"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs tracking-wide transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSendingForgotOtp ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang gửi mã...</span>
                    </>
                  ) : (
                    <span>Gửi Mã Xác Minh 6 Số Về Email</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyForgotOtp} className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Mã OTP 6 số từ Email ({forgotEmail}):
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    maxLength={6}
                    data-testid="input-forgot-otp"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\s+/g, ''))}
                    placeholder="123456"
                    className="w-full text-center font-mono text-lg font-bold tracking-widest rounded-xl bg-white/5 border border-emerald-500/40 px-3 py-2 text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                    Mật khẩu mới (Tối thiểu 6 ký tự):
                  </label>
                  <input
                    type="password"
                    required
                    data-testid="input-forgot-new-password"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder="Mật khẩu mới an toàn..."
                    className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSendingForgotOtp}
                  data-testid="btn-submit-reset-password"
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs tracking-wide transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
                >
                  {isSendingForgotOtp ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang cập nhật...</span>
                    </>
                  ) : (
                    <span>Xác Nhận & Đặt Lại Mật Khẩu</span>
                  )}
                </button>

                <div className="flex justify-between items-center pt-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep('request');
                      setForgotMsg(null);
                    }}
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    ← Gửi lại mã khác
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForgotPasswordModal(false)}
                    className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
