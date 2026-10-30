import React, { useState } from 'react';
import { useAuthStore } from '../stores/useAuthStore';
import { useRouter } from '../services/router';
import { PlatformHeader } from './PlatformHeader';
import { SharedFooter } from './SharedFooter';
import {
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  Lock,
  Globe,
  Smartphone,
  LogOut,
  Info,
  User,
  Database
} from 'lucide-react';

export const AccountSecurityView: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, changePassword, logout } = useAuthStore();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] flex flex-col font-sans">
        <PlatformHeader />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-2xl border border-zinc-800 bg-zinc-900/40 text-center space-y-5">
            <h1 className="text-xl font-bold text-white">Yêu Cầu Đăng Nhập</h1>
            <p className="text-xs text-zinc-400">
              Vui lòng đăng nhập để xem và quản lý thiết lập bảo mật tài khoản.
            </p>
            <button
              type="button"
              onClick={() => router.navigate('/login')}
              className="w-full py-2.5 rounded-xl bg-white text-black font-semibold text-xs cursor-pointer"
            >
              Đăng Nhập Ngay
            </button>
          </div>
        </div>
        <SharedFooter />
      </div>
    );
  }

  const isGoogleAccount = user.authProvider === 'google';

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setIsChangingPass(true);
    const success = await changePassword(oldPassword, newPassword);
    setIsChangingPass(false);

    if (success) {
      setStatusMessage({ type: 'success', text: 'Đổi mật khẩu thành công!' });
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setStatusMessage(null), 5000);
    } else {
      setStatusMessage({
        type: 'error',
        text: 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu cũ.'
      });
    }
  };

  return (
    <div
      data-testid="account-security-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-6">
        {/* Sub-nav Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs">
            <button
              type="button"
              onClick={() => router.navigate('/profile')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <User size={13} className="text-emerald-400" />
              <span>Hồ Sơ Cá Nhân</span>
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg bg-white/15 text-white font-medium shadow-sm transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Shield size={13} className="text-amber-400" />
              <span>Bảo Mật</span>
            </button>
            <button
              type="button"
              onClick={() => router.navigate('/privacy-data')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-sky-400" />
              <span>Dữ Liệu</span>
            </button>
          </div>

          <span className="text-xs text-zinc-500 font-mono hidden sm:inline-block">
            ID: {user.id.slice(0, 12)}...
          </span>
        </div>

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-emerald-400 shrink-0" />
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Bảo Mật Tài Khoản
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Kiểm tra phương thức đăng nhập đã liên kết, mật khẩu bảo vệ và các phiên làm việc đang hoạt động.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 shadow-sm ${
              statusMessage.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-950/40 text-emerald-300'
                : 'border-rose-500/30 bg-rose-950/40 text-rose-300'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle size={16} className="shrink-0 text-rose-400" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Identity & Linked Providers */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <h2 className="text-sm font-semibold text-white">Phương Thức Xác Thực Đã Liên Kết</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-black font-black text-sm shrink-0">
                  G
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">Google OAuth 2.0</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {isGoogleAccount
                      ? `Đã liên kết với Google ID (${user.googleId || 'Verified'})`
                      : 'Chưa liên kết tài khoản Google'}
                  </div>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 whitespace-nowrap ${
                  isGoogleAccount
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {isGoogleAccount ? 'ĐÃ KẾT NỐI' : 'CHƯA LIÊN KẾT'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 text-xs gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                  <Key size={16} />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">Mật Khẩu Cá Nhân</div>
                  <div className="text-[11px] text-zinc-400 truncate">
                    {isGoogleAccount
                      ? 'Đăng nhập trực tiếp bằng Google (không có mật khẩu cục bộ)'
                      : 'Đang bảo vệ tài khoản bằng mật khẩu cục bộ đã băm SHA-256'}
                  </div>
                </div>
              </div>

              <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0 whitespace-nowrap">
                {isGoogleAccount ? 'TÙY CHỌN' : 'HOẠT ĐỘNG'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-950/40 border border-zinc-800/80 text-[11px] text-zinc-400 flex items-start gap-2 leading-relaxed">
            <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
            <span>
              <strong>Nguyên tắc bảo vệ chống chiếm quyền:</strong> Hệ thống không tự động hợp nhất tài khoản giữa Email/Mật khẩu và Google nếu chưa từng có sự xác thực chủ động từ chủ sở hữu.
            </span>
          </div>
        </div>

        {/* Change Password Form (Nếu không phải Google pure) */}
        {!isGoogleAccount && (
          <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock size={16} className="text-zinc-400 shrink-0" />
              <span>Đổi Mật Khẩu Đăng Nhập</span>
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Mật Khẩu Hiện Tại
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-white transition"
                  placeholder="Nhập mật khẩu cũ của bạn..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">
                    Mật Khẩu Mới (Tối thiểu 6 ký tự)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-white transition"
                    placeholder="Mật khẩu mới an toàn..."
                    required
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-medium mb-1.5">
                    Xác Nhận Mật Khẩu Mới
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-950 text-white focus:outline-none focus:border-white transition"
                    placeholder="Nhập lại mật khẩu mới..."
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isChangingPass}
                  data-testid="btn-submit-change-password"
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition cursor-pointer shadow-md"
                >
                  {isChangingPass ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Phiên Hoạt Động (Sửa hoàn toàn lỗi rớt dòng 'Phiên Đăng Nhập Hiện' và 'Tại') */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe size={16} className="text-zinc-400 shrink-0" />
              <span className="whitespace-nowrap">Phiên Đăng Nhập Hiện Tại</span>
            </h2>
            <button
              type="button"
              onClick={logout}
              className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              <LogOut size={13} />
              <span>Đăng Xuất Phiên Này</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <Smartphone size={16} className="text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <div className="font-semibold text-white flex items-center gap-1.5 flex-wrap">
                  <span>Trình duyệt hiện tại</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                    Active
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono break-all line-clamp-1 max-w-sm">
                  {typeof navigator !== 'undefined' ? navigator.userAgent : 'Client Session'}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 font-mono sm:text-right shrink-0 whitespace-nowrap">
              Được bảo vệ bằng mã hóa cục bộ
            </div>
          </div>
        </div>
      </main>

      <SharedFooter />
    </div>
  );
};
