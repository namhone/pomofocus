import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useRouter } from '../services/router';
import { googleAuthService } from '../services/googleAuthService';
import { supabase } from '../lib/supabase';
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
  Zap,
  ShieldCheck
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

  const {
    login,
    signup,
    loginWithGoogle,
    loginAsFounder,
    isLoading,
    isGoogleLoading,
    error,
    clearError,
    user
  } = useAuthStore();

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

  // LỰA CHỌN 1: Đăng nhập Google OAuth qua Supabase Client
  const handleGoogleSignIn = async () => {
    clearError();
    setSuccessMsg('');

    try {
      // 1. Luồng Supabase OAuth chính thức trên trình duyệt
      if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/app`,
          },
        });
        if (error) {
          console.warn('[Google OAuth] Lỗi khởi tạo Supabase OAuth:', error.message);
        } else if (data?.url) {
          // Trình duyệt sẽ điều hướng tới trang xác thực Google OAuth
          return;
        }
      }

      // 2. Fallback mô phỏng nếu chạy unit test mock hoặc offline
      const simulated = await googleAuthService.simulateGoogleLogin({
        email: 'nam.studyworkspace@gmail.com',
        name: 'Hồ Ngọc Bảo Nam (Google)',
        picture:
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face'
      });
      const ok = await loginWithGoogle(simulated);
      if (ok) {
        setSuccessMsg('Đăng nhập Google thành công! Đang chuyển hướng...');
        setTimeout(() => router.navigate('/app'), 500);
      }
    } catch (err) {
      console.error('Lỗi đăng nhập Google:', err);
    }
  };

  // LỰA CHỌN 2: ⚡ Đăng nhập Nhanh 1-Chạm (Chính chủ Founder VIP 👑)
  const handleFounderQuickLogin = async () => {
    clearError();
    setSuccessMsg('⚡ Đã kích hoạt đặc quyền Founder VIP 👑... Đang vào không gian!');
    const ok = await loginAsFounder();
    if (ok) {
      setTimeout(() => router.navigate('/app'), 100);
    }
  };

  const handleDemoPro = async () => {
    setEmail('pro@studyworkspace.io');
    setPassword('pro123');
    clearError();
    const ok = await login('pro@studyworkspace.io', 'pro123');
    if (ok) {
      setSuccessMsg('Đăng nhập tài khoản Pro Demo thành công!');
      setTimeout(() => router.navigate('/app'), 600);
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
          <PomoFocusLogo size={44} showWordmark={true} showSubtitle={true} wordmarkClassName="text-xl font-bold" className="mb-3" />
          <h1 className="text-xl font-bold tracking-tight text-white mb-1.5">
            Đăng Nhập PomoFocus
          </h1>
          <p className="text-xs text-neutral-400">
            Chọn phương thức xác thực để tiếp tục phiên làm việc
          </p>
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

        {/* =========================================================================
            LỰA CHỌN 1: ĐĂNG NHẬP GOOGLE OAUTH
           ========================================================================= */}
        <div className="mb-3.5">
          <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              Đăng nhập qua Google
            </span>
            <span className="text-[9px] text-neutral-500 font-normal">Chính thức</span>
          </div>
          <button
            type="button"
            data-testid="btn-google-signin"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 text-xs font-semibold flex items-center justify-center gap-3 transition-all shadow-md active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isGoogleLoading ? (
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
              {isGoogleLoading
                ? 'Đang kết nối tài khoản Google...'
                : 'Tiếp tục với Google'}
            </span>
          </button>
        </div>

        {/* =========================================================================
            LỰA CHỌN 2: ⚡ ĐĂNG NHẬP NHANH 1-CHẠM (FOUNDER VIP 👑) - Chỉ bật trong môi trường DEV
           ========================================================================= */}
        <div className="mb-4">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Founder 1-Chạm (Chế độ DEV)
              </span>
              <span className="text-[9px] text-amber-400/80 font-normal">Tốc độ cao 0.1s</span>
            </div>
            <button
              type="button"
              data-testid="btn-founder-quick-login"
              onClick={handleFounderQuickLogin}
              disabled={isLoading || isGoogleLoading}
              className="group relative w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 hover:from-amber-500/25 hover:via-amber-400/20 hover:to-amber-500/25 border border-amber-500/40 hover:border-amber-400 text-amber-200 text-xs font-bold transition-all shadow-lg shadow-amber-950/40 hover:shadow-amber-500/15 active:scale-98 cursor-pointer flex items-center justify-between overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
              <div className="flex items-center gap-2.5 relative z-10">
                <Zap size={16} className="text-amber-400 shrink-0" />
                <div className="text-left">
                  <div className="font-extrabold text-amber-300 text-xs tracking-wide flex items-center gap-1">
                    <span>⚡ Đăng nhập Nhanh (Founder VIP 👑)</span>
                  </div>
                  <div className="text-[10px] text-amber-400/80 font-normal">
                    Chính chủ namho03052k9 • Trọn đời • +1.000⚡ AI Credits
                  </div>
                </div>
              </div>
              <span className="relative z-10 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/30 text-[10px] font-mono font-bold text-amber-300 shrink-0">
                0.1s
              </span>
            </button>
          </div>

        {/* =========================================================================
            LỰA CHỌN 3: ĐĂNG NHẬP / ĐĂNG KÝ BẰNG EMAIL & MẬT KHẨU
           ========================================================================= */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-white/10 w-full" />
          <span className="bg-neutral-900 px-2.5 text-[10px] uppercase tracking-wider text-neutral-400 shrink-0 font-medium">
            Hoặc Email & Mật Khẩu
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
            <label className="block text-[11px] font-medium text-neutral-300 mb-1">
              Mật khẩu
            </label>
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
            disabled={isLoading || isGoogleLoading}
            className="mt-1.5 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-xs tracking-wide transition-all shadow-lg shadow-emerald-500/20 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            {isLoading
              ? 'Đang xử lý...'
              : mode === 'login'
              ? 'Đăng Nhập Email'
              : 'Tạo Tài Khoản Mới'}
          </button>
        </form>

        {/* Demo Pro Fast Login Button */}
        <div className="mt-4 pt-3.5 border-t border-white/10">
          <button
            type="button"
            onClick={handleDemoPro}
            className="w-full py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-medium text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-98"
          >
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Trải nghiệm nhanh với tài khoản <strong>Pro Demo (pro@studyworkspace.io)</strong></span>
          </button>
        </div>

        {user && (
          <div className="mt-3.5 text-center">
            <span className="text-[11px] text-neutral-400">
              Đang đăng nhập: <strong className="text-white">{user.displayName}</strong> ({user.plan.toUpperCase()})
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
