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
  Database,
  CreditCard,
  Trash2,
  AlertTriangle,
  X
} from 'lucide-react';

export const AccountSecurityView: React.FC = () => {
  const router = useRouter();
  const { user, isAuthenticated, changePassword, logout, deleteAccount, signOutOtherDevices } = useAuthStore();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Danger Zone - Xóa tài khoản
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

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

  const handleSignOutOtherDevices = async () => {
    setIsSigningOutOthers(true);
    const res = await signOutOtherDevices();
    setIsSigningOutOthers(false);
    setStatusMessage({ type: 'success', text: res.message });
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleConfirmDeleteAccount = async () => {
    if (deleteConfirmationText.trim() !== 'XOA TAI KHOAN') return;

    setIsDeletingAccount(true);
    const success = await deleteAccount();
    setIsDeletingAccount(false);

    if (success) {
      setShowDeleteModal(false);
      alert('Tài khoản và toàn bộ dữ liệu của bạn đã được xóa sạch vĩnh viễn theo chuẩn bảo mật GDPR.');
      router.navigate('/');
    } else {
      alert('Lỗi khi xóa tài khoản. Vui lòng thử lại.');
    }
  };

  return (
    <div
      data-testid="account-security-view"
      className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans antialiased flex flex-col selection:bg-white selection:text-black select-none"
    >
      <PlatformHeader />

      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-8 md:p-12 space-y-6">
        {/* Sub-nav Tabs: Hồ Sơ | Bảo Mật | Gói Cước | Quyền Riêng Tư */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-1.5 p-1 bg-zinc-900/80 rounded-xl border border-zinc-800 text-xs overflow-x-auto scrollbar-none">
            <button
              type="button"
              data-testid="nav-tab-profile"
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
              data-testid="nav-tab-billing"
              onClick={() => router.navigate('/billing')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard size={13} className="text-cyan-400" />
              <span>Gói Cước</span>
            </button>
            <button
              type="button"
              data-testid="nav-tab-privacy"
              onClick={() => router.navigate('/privacy-data')}
              className="px-3 py-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
            >
              <Database size={13} className="text-sky-400" />
              <span>Quyền Riêng Tư</span>
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
              Trung Tâm Bảo Mật Tài Khoản
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 leading-relaxed">
            Kiểm tra phương thức xác thực đã liên kết, đổi mật khẩu an toàn và quản lý các phiên đăng nhập.
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
                      ? 'Đăng nhập trực tiếp bằng Google (không dùng mật khẩu cục bộ)'
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
              <strong>Bảo mật tài khoản đa nền tảng:</strong> Bạn có thể sử dụng phương thức đăng nhập Google một chạm hoặc mật khẩu tài khoản tùy ý.
            </span>
          </div>
        </div>

        {/* Change Password Form (Dành cho tài khoản email/mật khẩu) */}
        {!isGoogleAccount && (
          <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Lock size={16} className="text-zinc-400 shrink-0" />
              <span>Đổi Mật Khẩu An Toàn</span>
            </h2>

            <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-300 font-medium mb-1.5">
                  Mật Khẩu Hiện Tại
                </label>
                <input
                  type="password"
                  data-testid="input-old-password"
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
                    data-testid="input-new-password"
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
                    data-testid="input-confirm-password"
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

        {/* Quản lý phiên đăng nhập (Session Security) */}
        <div className="p-5 sm:p-7 rounded-2xl border border-zinc-800 bg-zinc-900/40 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Globe size={16} className="text-zinc-400 shrink-0" />
              <span className="whitespace-nowrap">Quản Lý Phiên Đăng Nhập (Session Security)</span>
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
                  <span>Thiết bị đang sử dụng</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 shrink-0">
                    Active Session
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono break-all line-clamp-1 max-w-sm">
                  {typeof navigator !== 'undefined' ? navigator.userAgent : 'Client Session'}
                </div>
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 font-mono sm:text-right shrink-0 whitespace-nowrap">
              Phiên bảo mật cục bộ
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950/40 border border-zinc-800">
            <div>
              <div className="text-xs font-semibold text-zinc-200">Đăng xuất khỏi tất cả các thiết bị khác</div>
              <div className="text-[11px] text-zinc-400">Vô hiệu hóa phiên đăng nhập trên các máy tính lạ, điện thoại hoặc quán cafe khác.</div>
            </div>
            <button
              type="button"
              data-testid="btn-signout-others"
              disabled={isSigningOutOthers}
              onClick={handleSignOutOtherDevices}
              className="px-4 py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium transition cursor-pointer shrink-0 whitespace-nowrap"
            >
              {isSigningOutOthers ? 'Đang xử lý...' : 'Đăng Xuất Thiết Bị Khác'}
            </button>
          </div>
        </div>

        {/* Vùng Nguy Hiểm (Danger Zone) */}
        <div className="p-5 sm:p-7 rounded-2xl border border-rose-500/30 bg-rose-950/10 space-y-4">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle size={18} />
            <h2 className="text-sm font-bold text-white">Vùng Nguy Hiểm (Danger Zone)</h2>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            Sau khi xóa tài khoản, toàn bộ thông tin cá nhân, hồ sơ học tập, ghi chú, danh sách nhiệm vụ và quyền lợi gói cước sẽ bị xóa sạch vĩnh viễn khỏi hệ thống theo chuẩn quyền riêng tư GDPR.
          </p>

          <div className="pt-1 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-rose-300 font-medium">
              Hành động này không thể hoàn tác sau khi đã thực hiện.
            </div>
            <button
              type="button"
              data-testid="btn-open-delete-account"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Trash2 size={13} />
              <span>Xóa Tài Khoản Vĩnh Viễn</span>
            </button>
          </div>
        </div>
      </main>

      {/* Modal xác nhận xóa tài khoản */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-rose-500/40 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                <AlertTriangle size={18} />
                <span>CẢNH BÁO: XÓA TÀI KHOẢN VĨNH VIỄN</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              Bạn đang chuẩn bị xóa tài khoản <strong>{user.email}</strong>. Mọi dữ liệu nhiệm vụ, ghi chú IndexedDB và phiên đăng nhập sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.
            </p>

            <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/20 text-rose-200 text-xs">
              Để xác nhận xóa, vui lòng nhập chính xác cụm từ: <strong className="font-mono text-white select-all">XOA TAI KHOAN</strong>
            </div>

            <div>
              <input
                type="text"
                autoFocus
                data-testid="input-confirm-delete-phrase"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="Gõ 'XOA TAI KHOAN' vào đây..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-rose-500/40 bg-zinc-950 text-white text-xs font-mono tracking-wider focus:outline-none focus:border-rose-400 transition"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteConfirmationText('');
                }}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition cursor-pointer"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                data-testid="btn-confirm-delete-account"
                disabled={deleteConfirmationText.trim() !== 'XOA TAI KHOAN' || isDeletingAccount}
                onClick={handleConfirmDeleteAccount}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {isDeletingAccount ? 'Đang xóa...' : 'Xác Nhận Xóa Vĩnh Viễn'}
              </button>
            </div>
          </div>
        </div>
      )}

      <SharedFooter />
    </div>
  );
};
